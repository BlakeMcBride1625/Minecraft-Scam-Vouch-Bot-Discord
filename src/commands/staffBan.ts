/**
 * /staff-ban command - Ban user from reputation system (requires staff)
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import * as db from '../services/database.js';
import { createBanEmbed, createErrorEmbed } from '../utils/embeds.js';
import { isStaff } from '../utils/permissions.js';
import { logError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('staff-ban')
  .setDescription('Ban a user from the reputation system (requires staff)')
  .addUserOption((option) =>
    option.setName('user').setDescription('The user to ban').setRequired(true)
  )
  .addStringOption((option) =>
    option.setName('reason').setDescription('Reason for the ban').setRequired(false)
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
    const reason = interaction.options.getString('reason') || null;

    // Add banned user
    const result = await db.addBannedUser(
      interaction.guild.id,
      targetUser.id,
      reason,
      interaction.user.id
    );

    if (!result.success) {
      await interaction.reply({
        embeds: [createErrorEmbed(result.error || 'Failed to ban user.')],
        ephemeral: true,
      });
      return;
    }

    // Create success embed
    const embed = createBanEmbed(
      'banned',
      targetUser.id,
      targetUser.username,
      reason,
      interaction.user.id
    );

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logError('staff-ban command', error);
    await interaction.reply({
      embeds: [createErrorEmbed('An unexpected error occurred while processing your request.')],
      ephemeral: true,
    }).catch(() => {
      // Ignore errors if interaction already replied
    });
  }
}
