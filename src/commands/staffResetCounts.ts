/**
 * /staff-reset-counts command - Reset scam/vouch counts for a user (requires staff)
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import * as db from '../services/database.js';
import * as roleService from '../services/roleService.js';
import { createSuccessEmbed, createErrorEmbed } from '../utils/embeds.js';
import { isStaff } from '../utils/permissions.js';
import type { ReportType } from '../types/index.js';
import { logError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('staff-reset-counts')
  .setDescription('Reset scam/vouch counts for a user (requires staff)')
  .addUserOption((option) =>
    option.setName('user').setDescription('The user to reset counts for').setRequired(true)
  )
  .addStringOption((option) =>
    option
      .setName('type')
      .setDescription('Type to reset (default: both)')
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
    const type = interaction.options.getString('type') as ReportType | null;

    // Reset counts
    const result = await db.resetUserCounts(
      interaction.guild.id,
      targetUser.id,
      type || undefined
    );

    if (!result.success || !result.data) {
      await interaction.reply({
        embeds: [createErrorEmbed(result.error || 'Failed to reset counts.')],
        ephemeral: true,
      });
      return;
    }

    // Update roles
    if (!type || type === 'scam') {
      await roleService.updateUserRole(interaction.guild, targetUser.id, 'scam');
    }
    if (!type || type === 'vouch') {
      await roleService.updateUserRole(interaction.guild, targetUser.id, 'vouch');
    }

    // Create success embed
    const typeText = type ? (type === 'scam' ? 'scam' : 'vouch') : 'all';
    const embed = createSuccessEmbed(
      `Successfully reset ${typeText} counts for <@${targetUser.id}>.\n` +
      `New counts: Scams: ${result.data.scam_count}, Vouches: ${result.data.vouch_count}`
    );

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logError('staff-reset-counts command', error);
    await interaction.reply({
      embeds: [createErrorEmbed('An unexpected error occurred while processing your request.')],
      ephemeral: true,
    }).catch(() => {
      // Ignore errors if interaction already replied
    });
  }
}
