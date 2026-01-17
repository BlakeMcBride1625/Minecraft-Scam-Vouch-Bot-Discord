/**
 * /set-vouch-channel command - Configure vouch channel for reputation searches (permission-gated)
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  ChannelType,
} from 'discord.js';
import * as db from '../services/database.js';
import { createVouchChannelEmbed, createErrorEmbed } from '../utils/embeds.js';
import { hasManageRolesPermission } from '../utils/permissions.js';
import { logError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('set-vouch-channel')
  .setDescription('Set the vouch channel for reputation searches (requires Manage Roles)')
  .addChannelOption((option) =>
    option
      .setName('channel')
      .setDescription('The channel for vouch/reputation searches')
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
        embeds: [createErrorEmbed('The vouch channel must be a text channel.')],
        ephemeral: true,
      });
      return;
    }

    const vouchChannelId = channel ? channel.id : null;

    // Update vouch channel
    const result = await db.updateGuildVouchChannel(interaction.guild.id, vouchChannelId);

    if (!result.success) {
      await interaction.reply({
        embeds: [createErrorEmbed(result.error || 'Failed to update vouch channel.')],
        ephemeral: true,
      });
      return;
    }

    // Create success embed
    const embed = createVouchChannelEmbed(vouchChannelId);

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logError('set-vouch-channel command', error);
    await interaction.reply({
      embeds: [createErrorEmbed('An unexpected error occurred while processing your request.')],
      ephemeral: true,
    }).catch(() => {
      // Ignore errors if interaction already replied
    });
  }
}
