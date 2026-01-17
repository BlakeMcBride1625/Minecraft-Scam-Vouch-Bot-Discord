/**
 * /help command - Show available commands based on user role
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import { EmbedBuilder } from 'discord.js';
import { isStaff } from '../utils/permissions.js';
import { logError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('help')
  .setDescription('Show available commands and how to use them');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        embeds: [createPublicHelpEmbed()],
        ephemeral: true,
      });
      return;
    }

    // Check if user is staff
    const userIsStaff = await isStaff(interaction.member as any, interaction.guild.id);

    if (userIsStaff) {
      await interaction.reply({
        embeds: [createStaffHelpEmbed()],
        ephemeral: true,
      });
    } else {
      await interaction.reply({
        embeds: [createPublicHelpEmbed()],
        ephemeral: true,
      });
    }
  } catch (error) {
    logError('help command', error);
    await interaction.reply({
      embeds: [createPublicHelpEmbed()],
      ephemeral: true,
    }).catch(() => {
      // Ignore errors if interaction already replied
    });
  }
}

/**
 * Create help embed for regular users
 */
function createPublicHelpEmbed(): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('Scam:Vouch Bot - Help')
    .setColor(0x0099ff)
    .setDescription('Commands available to everyone:')
    .addFields(
      {
        name: '📊 Reputation Commands',
        value: [
          '`/scam @user [reason]` - Report a user as a scammer',
          '`/vouch @user [reason]` - Vouch for a user',
          '`/user-check @user` - Check a user\'s reputation counts',
          '`/search @user` - Search detailed reputation (best in vouch channel)',
        ].join('\n'),
        inline: false,
      },
      {
        name: '💡 Tips',
        value: [
          '• Always provide a reason when reporting',
          '• Use `/user-check` for quick reputation looks',
          '• Use `/search` in the vouch channel for detailed info',
          '• Reputation roles are assigned automatically',
        ].join('\n'),
        inline: false,
      },
      {
        name: '❓ Need More Help?',
        value: 'Contact server staff for assistance with reputation-related issues.',
        inline: false,
      }
    )
    .setFooter({ text: 'Bot is online and ready to help!' })
    .setTimestamp();

  return embed;
}

/**
 * Create help embed for staff users
 */
function createStaffHelpEmbed(): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('Scam:Vouch Bot - Staff Help')
    .setColor(0xff9900)
    .setDescription('All available commands:')
    .addFields(
      {
        name: '📊 Public Commands',
        value: [
          '`/scam @user [reason]` - Report a scammer',
          '`/vouch @user [reason]` - Vouch for a user',
          '`/user-check @user` - Check reputation',
          '`/search @user` - Detailed reputation search',
        ].join('\n'),
        inline: false,
      },
      {
        name: '⚙️ Configuration Commands',
        value: [
          '`/auto-setup` - **Quick setup!** Create channels & roles automatically',
          '`/set-log-channel #channel` - Set log channel',
          '`/remove-log-channel` - Remove log channel',
          '`/set-vouch-channel #channel` - Set vouch/search channel',
          '`/remove-vouch-channel` - Remove vouch channel',
          '`/setup-scam-roles max:N` - Create scam roles 1-N (optional)',
          '`/setup-vouch-roles max:N` - Create vouch roles 1-N (optional)',
          '`/delete-rep-roles` - Delete all reputation roles',
        ].join('\n'),
        inline: false,
      },
      {
        name: '👥 Staff Management',
        value: [
          '`/staff-add @user` - Add staff member',
          '`/staff-remove @user` - Remove staff member',
          '`/staff-list` - List all staff members',
        ].join('\n'),
        inline: false,
      },
      {
        name: '🛡️ Staff Operations',
        value: [
          '`/staff-ban @user [reason]` - Ban from reputation system',
          '`/staff-unban @user` - Unban from reputation system',
          '`/staff-view-reports @user [type]` - View user reports',
          '`/staff-reset-counts @user [type]` - Reset counts',
          '`/staff-statistics` - View guild statistics',
          '`/staff-bulk-export [format]` - Export data (JSON/CSV)',
          '`/staff-search-reports [filters]` - Advanced report search',
        ].join('\n'),
        inline: false,
      },
      {
        name: '🗑️ Report Removal',
        value: [
          '`/remove-scam @user` - Remove latest scam report',
          '`/remove-vouch @user` - Remove latest vouch report',
        ].join('\n'),
        inline: false,
      },
      {
        name: '💡 Quick Tips',
        value: [
          '• Use `/auto-setup` for quick initial configuration',
          '• Server owner automatically has staff permissions',
          '• Roles are created automatically when thresholds are reached',
          '• Banned users cannot receive new reports',
        ].join('\n'),
        inline: false,
      }
    )
    .setFooter({ text: 'You have staff access - all commands available!' })
    .setTimestamp();

  return embed;
}
