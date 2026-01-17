/**
 * /staff-bulk-export command - Export reputation data (requires staff)
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  AttachmentBuilder,
} from 'discord.js';
import * as db from '../services/database.js';
import { createErrorEmbed, createSuccessEmbed } from '../utils/embeds.js';
import { isStaff } from '../utils/permissions.js';
import type { ReportType } from '../types/index.js';
import { logError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('staff-bulk-export')
  .setDescription('Export reputation data (requires staff)')
  .addStringOption((option) =>
    option
      .setName('format')
      .setDescription('Export format')
      .setRequired(false)
      .addChoices({ name: 'JSON', value: 'json' }, { name: 'CSV', value: 'csv' })
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

    const format = (interaction.options.getString('format') || 'json') as 'json' | 'csv';

    // Get all users
    const usersResult = await db.getGuildStatistics(interaction.guild.id);
    if (!usersResult.success) {
      await interaction.reply({
        embeds: [createErrorEmbed('Failed to retrieve data.')],
        ephemeral: true,
      });
      return;
    }

    // Get all reports
    const reportsResult = await db.searchReports(interaction.guild.id, undefined, undefined, undefined, 10000);
    if (!reportsResult.success || !reportsResult.data) {
      await interaction.reply({
        embeds: [createErrorEmbed('Failed to retrieve reports.')],
        ephemeral: true,
      });
      return;
    }

    let content: string;
    let filename: string;
    let mimeType: string;

    if (format === 'json') {
      const data = {
        guild_id: interaction.guild.id,
        exported_at: new Date().toISOString(),
        statistics: usersResult.data,
        reports: reportsResult.data,
      };
      content = JSON.stringify(data, null, 2);
      filename = `reputation-export-${interaction.guild.id}-${Date.now()}.json`;
      mimeType = 'application/json';
    } else {
      // CSV format
      const csvRows: string[] = [];
      csvRows.push('Report ID,Guild ID,User ID,Type,Reason,Reported By,Created At');
      
      for (const report of reportsResult.data) {
        const reason = (report.reason || '').replace(/"/g, '""');
        csvRows.push(
          `${report.id},"${interaction.guild.id}","${report.user_id}","${report.type}","${reason}","${report.reported_by}","${report.created_at.toISOString()}"`
        );
      }

      content = csvRows.join('\n');
      filename = `reputation-export-${interaction.guild.id}-${Date.now()}.csv`;
      mimeType = 'text/csv';
    }

    // Create attachment
    const attachment = new AttachmentBuilder(Buffer.from(content, 'utf-8'), {
      name: filename,
    });

    await interaction.reply({
      embeds: [createSuccessEmbed(`Export complete! Format: ${format.toUpperCase()}`)],
      files: [attachment],
      ephemeral: true,
    });
  } catch (error) {
    logError('staff-bulk-export command', error);
    await interaction.reply({
      embeds: [createErrorEmbed('An unexpected error occurred while processing your request.')],
      ephemeral: true,
    }).catch(() => {
      // Ignore errors if interaction already replied
    });
  }
}
