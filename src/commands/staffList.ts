/**
 * /staff-list command - List all staff members (requires staff status)
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import * as db from '../services/database.js';
import { createStaffListEmbed, createErrorEmbed } from '../utils/embeds.js';
import { isStaff } from '../utils/permissions.js';
import { logError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('staff-list')
  .setDescription('List all staff members (requires staff status)');

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (!interaction.guild || !interaction.member) {
      await interaction.reply({
        embeds: [createErrorEmbed('This command can only be used in a server.')],
        ephemeral: true,
      });
      return;
    }

    // Check if user is staff (server owner is automatically staff)
    const userIsStaff = await isStaff(interaction.member as any, interaction.guild.id);
    if (!userIsStaff) {
      await interaction.reply({
        embeds: [createErrorEmbed('You need to be staff to use this command.')],
        ephemeral: true,
      });
      return;
    }

    // Get staff members
    const result = await db.getStaffMembers(interaction.guild.id);

    if (!result.success || !result.data) {
      await interaction.reply({
        embeds: [createErrorEmbed(result.error || 'Failed to retrieve staff members.')],
        ephemeral: true,
      });
      return;
    }

    // Create embed
    const embed = createStaffListEmbed(result.data);

    await interaction.reply({ embeds: [embed], ephemeral: true });
  } catch (error) {
    logError('staff-list command', error);
    await interaction.reply({
      embeds: [createErrorEmbed('An unexpected error occurred while processing your request.')],
      ephemeral: true,
    }).catch(() => {
      // Ignore errors if interaction already replied
    });
  }
}
