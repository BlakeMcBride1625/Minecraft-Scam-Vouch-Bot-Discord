/**
 * /set-log-channel command - Configure log channel for reputation actions (permission-gated)
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
} from 'discord.js';
import * as db from '../services/database.js';
import { createLogChannelEmbed, createErrorEmbed } from '../utils/embeds.js';
import { hasManageRolesPermission } from '../utils/permissions.js';
import { logError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('set-log-channel')
  .setDescription('Set the log channel for reputation actions (requires Manage Roles)')
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription('The channel to log reputation actions to')
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

    const channel = interaction.options.getChannel('channel', false);

    // Validate channel type if provided
    if (channel && channel.type !== ChannelType.GuildText && channel.type !== ChannelType.GuildAnnouncement) {
      await interaction.reply({
        embeds: [createErrorEmbed('The log channel must be a text channel.')],
        ephemeral: true,
      });
      return;
    }

    const logChannelId = channel ? channel.id : null;

    // Update log channel
    const result = await db.updateGuildLogChannel(interaction.guild.id, logChannelId);

    if (!result.success) {
      await interaction.reply({
        embeds: [createErrorEmbed(result.error || 'Failed to update log channel.')],
        ephemeral: true,
      });
      return;
    }

    // Create success embed
    const embed = createLogChannelEmbed(logChannelId);

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logError('set-log-channel command', error);
    await interaction.reply({
      embeds: [createErrorEmbed('An unexpected error occurred while processing your request.')],
      ephemeral: true,
    }).catch(() => {
      // Ignore errors if interaction already replied
    });
  }
}
