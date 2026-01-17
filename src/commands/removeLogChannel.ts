/**
 * /remove-log-channel command - Remove log channel configuration (permission-gated)
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import * as db from '../services/database.js';
import { createLogChannelEmbed, createErrorEmbed } from '../utils/embeds.js';
import { hasManageRolesPermission } from '../utils/permissions.js';
import { logError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('remove-log-channel')
  .setDescription('Remove the log channel configuration (requires Manage Roles)');

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

    // Update log channel to null
    const result = await db.updateGuildLogChannel(interaction.guild.id, null);

    if (!result.success) {
      await interaction.reply({
        embeds: [createErrorEmbed(result.error || 'Failed to remove log channel.')],
        ephemeral: true,
      });
      return;
    }

    // Create success embed
    const embed = createLogChannelEmbed(null);

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logError('remove-log-channel command', error);
    await interaction.reply({
      embeds: [createErrorEmbed('An unexpected error occurred while processing your request.')],
      ephemeral: true,
    }).catch(() => {
      // Ignore errors if interaction already replied
    });
  }
}
