/**
 * /auto-setup command - Automatically set up channels and default settings
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
  PermissionFlagsBits,
} from 'discord.js';
import * as db from '../services/database.js';
import * as roleService from '../services/roleService.js';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embeds.js';
import { hasManageRolesPermission } from '../utils/permissions.js';
import { logError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('auto-setup')
  .setDescription('Automatically set up channels and default settings (requires Manage Roles)')
  .addBooleanOption((option) =>
    option
      .setName('create-channels')
      .setDescription('Create log and vouch channels automatically')
      .setRequired(false)
  )
  .addBooleanOption((option) =>
    option
      .setName('setup-roles')
      .setDescription('Create default reputation roles (scams 1-5, vouches 1-10)')
      .setRequired(false)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        embeds: [createErrorEmbed('This command can only be used in a server.')],
        ephemeral: true,
      });
      return;
    }

    // Check permissions
    if (!hasManageRolesPermission(interaction.member as any)) {
      await interaction.reply({
        embeds: [createErrorEmbed('You need the Manage Roles permission to use this command.')],
        ephemeral: true,
      });
      return;
    }

    // Check bot permissions
    const botMember = await interaction.guild.members.fetchMe();
    if (!botMember.permissions.has(PermissionFlagsBits.ManageChannels)) {
      await interaction.reply({
        embeds: [createErrorEmbed('The bot needs the Manage Channels permission to create channels.')],
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply({ ephemeral: true });

    const createChannels = interaction.options.getBoolean('create-channels') ?? true;
    const setupRoles = interaction.options.getBoolean('setup-roles') ?? true;

    const results: string[] = [];
    const errors: string[] = [];

    // 1. Create channels
    if (createChannels) {
      try {
        // Create log channel
        const logChannel = await interaction.guild.channels.create({
          name: 'reputation-logs',
          type: ChannelType.GuildText,
          topic: 'Bot logs for reputation actions (scams/vouches)',
          permissionOverwrites: [
            {
              id: interaction.guild.id,
              deny: [PermissionFlagsBits.SendMessages],
            },
          ],
        });
        
        await db.updateGuildLogChannel(interaction.guild.id, logChannel.id);
        results.push(`✅ Created and configured log channel: ${logChannel}`);

        // Create vouch channel
        const vouchChannel = await interaction.guild.channels.create({
          name: 'vouch-search',
          type: ChannelType.GuildText,
          topic: 'Search for user reputation using /search command',
        });
        
        await db.updateGuildVouchChannel(interaction.guild.id, vouchChannel.id);
        results.push(`✅ Created and configured vouch channel: ${vouchChannel}`);
      } catch (error) {
        errors.push(`Failed to create channels: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // 2. Setup default roles
    if (setupRoles) {
      try {
        // Create scam roles 1-5
        const scamResult = await roleService.createRolesForThresholds(interaction.guild, 'scam', 5);
        if (scamResult.success) {
          results.push(`✅ Created ${scamResult.roles.length} scam role(s)`);
          if (scamResult.error) {
            console.warn('Partial errors creating scam roles:', scamResult.error);
          }
        } else {
          errors.push(`Failed to create scam roles: ${scamResult.error || 'Unknown error'}`);
        }

        // Create vouch roles 1-10
        const vouchResult = await roleService.createRolesForThresholds(interaction.guild, 'vouch', 10);
        if (vouchResult.success) {
          results.push(`✅ Created ${vouchResult.roles.length} vouch role(s)`);
          if (vouchResult.error) {
            console.warn('Partial errors creating vouch roles:', vouchResult.error);
          }
        } else {
          errors.push(`Failed to create vouch roles: ${vouchResult.error || 'Unknown error'}`);
        }
      } catch (error) {
        errors.push(`Failed to setup roles: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Create result embed
    const embed = createSuccessEmbed('Auto-setup Complete!');

    if (results.length > 0) {
      embed.addFields({ name: 'Completed', value: results.join('\n'), inline: false });
    }

    if (errors.length > 0) {
      embed.addFields({ name: 'Errors', value: errors.join('\n'), inline: false });
      embed.setColor(0xff9900); // Orange for warnings
    }

    // Add summary
    const summary = [
      `**Setup Summary:**`,
      `• Channels created: ${createChannels ? 'Yes' : 'Skipped'}`,
      `• Roles created: ${setupRoles ? 'Yes' : 'Skipped'}`,
      ``,
      `**Next Steps:**`,
      `• Use /set-log-channel to change the log channel if needed`,
      `• Use /set-vouch-channel to change the vouch channel if needed`,
      `• Roles are now created automatically when users reach thresholds`,
    ].join('\n');

    embed.addFields({ name: 'Summary', value: summary, inline: false });

    await interaction.editReply({ embeds: [embed] });
  } catch (error) {
    logError('auto-setup command', error);
    await interaction.editReply({
      embeds: [createErrorEmbed('An unexpected error occurred during setup.')],
    }).catch(() => {
      // Ignore errors if interaction already edited
    });
  }
}
