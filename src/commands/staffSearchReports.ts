/**
 * /staff-search-reports command - Search reports with filters (requires staff)
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
  .setName('staff-search-reports')
  .setDescription('Search reports with filters (requires staff)')
  .addUserOption((option) =>
    option.setName('user').setDescription('Filter by user').setRequired(false)
  )
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('Filter by report type')
      .setRequired(false)
      .addChoices({ name: 'Scam', value: 'scam' }, { name: 'Vouch', value: 'vouch' })
  )
  .addUserOption((option) =>
    option.setName('reported-by').setDescription('Filter by who reported').setRequired(false)
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

    const targetUser = interaction.options.getUser('user');
    const type = interaction.options.getString('type') as ReportType | null;
    const reportedBy = interaction.options.getUser('reported-by');

    // Search reports
    const result = await db.searchReports(
      interaction.guild.id,
      targetUser?.id,
      type || undefined,
      reportedBy?.id,
      50
    );

    if (!result.success || !result.data) {
      await interaction.reply({
        embeds: [createErrorEmbed(result.error || 'Failed to search reports.')],
        ephemeral: true,
      });
      return;
    }

    if (result.data.length === 0) {
      await interaction.reply({
        embeds: [createErrorEmbed('No reports found matching the criteria.')],
        ephemeral: true,
      });
      return;
    }

    // Create embed - show first user if filtered, or generic message
    if (targetUser) {
      const embed = createReportsEmbed(
        targetUser.id,
        targetUser.username,
        result.data,
        type || undefined
      );
      await interaction.reply({ embeds: [embed], ephemeral: true });
    } else {
      // Show search results without specific user context
      const embed = createReportsEmbed(
        '0',
        'Search Results',
        result.data,
        type || undefined
      );
      embed.setDescription(`Found ${result.data.length} report(s) matching the criteria.`);
      await interaction.reply({ embeds: [embed], ephemeral: true });
    }
  } catch (error) {
    logError('staff-search-reports command', error);
    await interaction.reply({
      embeds: [createErrorEmbed('An unexpected error occurred while processing your request.')],
      ephemeral: true,
    }).catch(() => {
      // Ignore errors if interaction already replied
    });
  }
}
