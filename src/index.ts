/**
 * Main entry point for Scam:Vouch Discord Bot
 * Handles Discord client setup, command registration, and event listeners
 */

import 'dotenv/config';
import { Client, Collection, GatewayIntentBits, REST, Routes, Events } from 'discord.js';
import { readdirSync } from 'fs';
import { fileURLToPath, pathToFileURL } from 'url';
import { dirname, join } from 'path';
import { initializeDatabase, closeDatabase } from './services/database.js';
import type { ChatInputCommandInteraction } from 'discord.js';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Type definition for command modules
interface Command {
  data: any;
  execute: (interaction: ChatInputCommandInteraction) => Promise<void>;
}

// Extend Client to include commands collection
declare module 'discord.js' {
  interface Client {
    commands: Collection<string, Command>;
  }
}

// Initialize Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});

// Command collection
client.commands = new Collection<string, Command>();

// Load commands from commands directory
async function loadCommands(): Promise<void> {
  const commandsPath = join(__dirname, 'commands');
  const commandFiles = readdirSync(commandsPath).filter((file) => file.endsWith('.js'));

  for (const file of commandFiles) {
    try {
      const filePath = join(commandsPath, file);
      // Use pathToFileURL for proper cross-platform support
      const fileUrl = pathToFileURL(filePath).href;
      const command = await import(fileUrl);
      
      if ('data' in command && 'execute' in command) {
        client.commands.set(command.data.name, command as Command);
        console.log(`Loaded command: ${command.data.name}`);
      } else {
        console.warn(`Command at ${filePath} is missing required "data" or "execute" property.`);
      }
    } catch (error) {
      console.error(`Error loading command ${file}:`, error);
    }
  }
}

// Register commands with Discord API
async function registerCommands(): Promise<void> {
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!token || !clientId) {
    throw new Error('DISCORD_TOKEN and DISCORD_CLIENT_ID must be set in environment variables');
  }

  const commands = [];
  for (const [name, command] of client.commands) {
    commands.push(command.data.toJSON());
  }

  const rest = new REST().setToken(token);

  try {
    console.log(`Started refreshing ${commands.length} application (/) commands.`);
    console.log(`Command names: ${commands.map((c: any) => c.name).join(', ')}`);

    // Register commands globally (can take up to 1 hour to propagate)
    const data = await rest.put(Routes.applicationCommands(clientId), {
      body: commands,
    }) as any[];

    console.log(`Successfully reloaded ${data.length} application (/) commands.`);
    console.log(`Registered commands: ${data.map((c: any) => c.name).join(', ')}`);
    
    // Also register per-guild for faster updates (optional, for development)
    // This is commented out by default as it's mainly for testing
    // Uncomment if you want faster command updates during development
    /*
    const guilds = client.guilds.cache;
    for (const [guildId] of guilds) {
      try {
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
          body: commands,
        });
        console.log(`Registered ${commands.length} commands for guild ${guildId}`);
      } catch (error) {
        console.error(`Error registering commands for guild ${guildId}:`, error);
      }
    }
    */
  } catch (error) {
    console.error('Error registering commands:', error);
    throw error;
  }
}

// Handle command interactions
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);

  if (!command) {
    console.error(`No command matching ${interaction.commandName} was found.`);
    return;
  }

  try {
    await command.execute(interaction);
  } catch (error) {
    console.error(`Error executing command ${interaction.commandName}:`, error);
    
    const errorMessage = {
      content: 'There was an error while executing this command!',
      ephemeral: true,
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(errorMessage).catch(console.error);
    } else {
      await interaction.reply(errorMessage).catch(console.error);
    }
  }
});

// Handle client ready event
client.once(Events.ClientReady, async (readyClient) => {
  console.log(`Ready! Logged in as ${readyClient.user.tag}`);
  console.log(`Bot is in ${readyClient.guilds.cache.size} guild(s)`);
  
  // Register commands per-guild for faster updates (optional)
  // This makes commands available immediately in each server
  const token = process.env.DISCORD_TOKEN;
  const clientId = process.env.DISCORD_CLIENT_ID;
  
  if (token && clientId) {
    const commands = [];
    for (const [name, command] of readyClient.commands) {
      commands.push(command.data.toJSON());
    }
    
    const rest = new REST().setToken(token);
    const guilds = readyClient.guilds.cache;
    
    console.log(`Registering commands in ${guilds.size} guild(s) for faster updates...`);
    let successCount = 0;
    
    for (const [guildId, guild] of guilds) {
      try {
        await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
          body: commands,
        });
        successCount++;
        console.log(`✓ Registered ${commands.length} commands in ${guild.name} (${guildId})`);
      } catch (error) {
        console.error(`✗ Failed to register commands in ${guild.name} (${guildId}):`, error);
      }
    }
    
    console.log(`Successfully registered commands in ${successCount}/${guilds.size} guild(s)`);
  }
});

// Handle errors
client.on(Events.Error, (error) => {
  console.error('Discord client error:', error);
});

client.on(Events.Warn, (warning) => {
  console.warn('Discord client warning:', warning);
});

// Handle process termination gracefully
process.on('SIGINT', async () => {
  console.log('\nReceived SIGINT, shutting down gracefully...');
  await closeDatabase();
  client.destroy();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nReceived SIGTERM, shutting down gracefully...');
  await closeDatabase();
  client.destroy();
  process.exit(0);
});

// Handle uncaught errors
process.on('unhandledRejection', (error) => {
  console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught exception:', error);
  process.exit(1);
});

// Initialize and start bot
async function startBot(): Promise<void> {
  try {
    // Validate environment variables
    if (!process.env.DISCORD_TOKEN) {
      throw new Error('DISCORD_TOKEN environment variable is required');
    }
    if (!process.env.DISCORD_CLIENT_ID) {
      throw new Error('DISCORD_CLIENT_ID environment variable is required');
    }
    if (!process.env.DATABASE_URL) {
      throw new Error('DATABASE_URL environment variable is required');
    }

    // Initialize database
    console.log('Initializing database connection...');
    initializeDatabase(process.env.DATABASE_URL);
    console.log('Database connection initialized');

    // Load commands
    console.log('Loading commands...');
    await loadCommands();
    console.log(`Loaded ${client.commands.size} command(s)`);

    // Register commands with Discord
    console.log('Registering commands with Discord...');
    await registerCommands();

    // Login to Discord
    console.log('Logging in to Discord...');
    await client.login(process.env.DISCORD_TOKEN);
  } catch (error) {
    console.error('Error starting bot:', error);
    await closeDatabase();
    process.exit(1);
  }
}

// Start the bot
startBot();
