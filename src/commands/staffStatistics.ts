/**
 * /staff-statistics command - Show guild statistics (requires staff)
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import * as db from '../services/database.js';
import { createStatisticsEmbed, createErrorEmbed } from '../utils/embeds.js';
import { isStaff } from '../utils/permissions.js';
import { logError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('staff-statistics')
  .setDescription('Show guild statistics (requires staff)');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        embeds: [createErrorEmbed('This command can only be used in a server.')],
        ephemeral: true,
      });
      return;
    }

    // Check if user is staff
    const userIsStaff = await isStaff(interaction.member as any, interaction.guild.id);
    if (!userIsStaff) {
      await interaction.reply({
        embeds: [createErrorEmbed('You need to be staff to use this command.')],
        ephemeral: true,
      });
      return;
    }

    // Get statistics
    const statsResult = await db.getGuildStatistics(interaction.guild.id);

    if (!statsResult.success || !statsResult.data) {
      await interaction.reply({
        embeds: [createErrorEmbed(statsResult.error || 'Failed to retrieve statistics.')],
        ephemeral: true,
      });
      return;
    }

    // Get banned users count
    const bannedResult = await db.getBannedUsers(interaction.guild.id);
    const bannedUsers = bannedResult.success && bannedResult.data ? bannedResult.data.length : 0;

    // Get staff members count
    const staffResult = await db.getStaffMembers(interaction.guild.id);
    const staffMembers = staffResult.success && staffResult.data ? staffResult.data.length : 0;

    // Create embed
    const embed = createStatisticsEmbed(interaction.guild.id, {
      ...statsResult.data,
      bannedUsers,
      staffMembers,
    });

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    logError('staff-statistics command', error);
    await interaction.reply({
      embeds: [createErrorEmbed('An unexpected error occurred while processing your request.')],
      ephemeral: true,
    }).catch(() => {
      // Ignore errors if interaction already replied
    });
  }
}
