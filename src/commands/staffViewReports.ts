/**
 * /staff-view-reports command - View all reports for a user (requires staff)
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import * as db from '../services/database.js';
import { createReportsEmbed, createErrorEmbed } from '../utils/embeds.js';
import { isStaff } from '../utils/permissions.js';
import type { ReportType } from '../types/index.js';
import { logError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('staff-view-reports')
  .setDescription('View all reports for a user (requires staff)')
  .addUserOption((option) =>
    option.setName('user').setDescription('The user to view reports for').setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('Filter by report type')
      .setRequired(false)
      .addChoices({ name: 'Scam', value: 'scam' }, { name: 'Vouch', value: 'vouch' })
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

    // Check if user is staff
    const userIsStaff = await isStaff(interaction.member as any, interaction.guild.id);
    if (!userIsStaff) {
      await interaction.reply({
        embeds: [createErrorEmbed('You need to be staff to use this command.')],
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);
    const typeFilter = interaction.options.getString('type') as ReportType | null;

    // Get user reports
    const result = await db.getUserReports(interaction.guild.id, targetUser.id, typeFilter || undefined);

    if (!result.success || !result.data) {
      await interaction.reply({
        embeds: [createErrorEmbed(result.error || 'Failed to retrieve reports.')],
        ephemeral: true,
      });
      return;
    }

    // Create embed
    const embed = createReportsEmbed(
      targetUser.id,
      targetUser.username,
      result.data,
      typeFilter || undefined
    );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    logError('staff-view-reports command', error);
    await interaction.reply({
      embeds: [createErrorEmbed('An unexpected error occurred while processing your request.')],
      ephemeral: true,
    }).catch(() => {
      // Ignore errors if interaction already replied
    });
  }
}
