/**
 * /scam command - Add a scam report for a user
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
  PermissionFlagsBits,
} from 'discord.js';
import * as db from '../services/database.js';
import * as roleService from '../services/roleService.js';
import * as loggingService from '../services/loggingService.js';
import { createActionEmbed, createErrorEmbed, createSuccessEmbed } from '../utils/embeds.js';
import { validateReason } from '../utils/validators.js';
import { isBot } from '../utils/permissions.js';
import { logError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('scam')
  .setDescription('Report a user as a scammer')
  .addUserOption((option) =>
    option.setName('user').setDescription('The user to report').setRequired(true)
  )
  .addStringOption((option) =>
    option.setName('reason').setDescription('Reason for the scam report').setRequired(false)
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

    const targetUser = interaction.options.getUser('user', true);
    const reason = interaction.options.getString('reason') || null;

    // Validate reason
    const reasonValidation = validateReason(reason);
    if (!reasonValidation.valid) {
      await interaction.reply({
        embeds: [createErrorEmbed(reasonValidation.error || 'Invalid reason')],
        ephemeral: true,
      });
      return;
    }

    // Check if target is a bot
    if (isBot(targetUser)) {
      await interaction.reply({
        embeds: [createErrorEmbed('Cannot report a bot user.')],
        ephemeral: true,
      });
      return;
    }

    // Add report
    const reportResult = await db.addReport(
      interaction.guild.id,
      targetUser.id,
      'scam',
      reason,
      interaction.user.id
    );

    if (!reportResult.success || !reportResult.data) {
      await interaction.reply({
        embeds: [createErrorEmbed(reportResult.error || 'Failed to add scam report.')],
        ephemeral: true,
      });
      return;
    }

    // Get updated user data
    const userResult = await db.getUser(interaction.guild.id, targetUser.id);
    if (!userResult.success || !userResult.data) {
      await interaction.reply({
        embeds: [createErrorEmbed('Failed to retrieve user data.')],
        ephemeral: true,
      });
      return;
    }

    // Update user role
    const roleResult = await roleService.updateUserRole(
      interaction.guild,
      targetUser.id,
      'scam'
    );
    if (!roleResult.success) {
      console.warn(`Failed to update role for user ${targetUser.id}: ${roleResult.error}`);
    }

    // Create success embed
    const embed = createActionEmbed(
      'added',
      'scam',
      targetUser.id,
      targetUser.username,
      interaction.user.id,
      reason,
      userResult.data.scam_count,
      userResult.data.vouch_count
    );

    await interaction.reply({ embeds: [embed] });

    // Log action
    await loggingService.logAction(interaction.client, {
      action: 'scam_added',
      performedBy: interaction.user.id,
      targetUser: targetUser.id,
      reason,
      newScamCount: userResult.data.scam_count,
      newVouchCount: userResult.data.vouch_count,
      guildId: interaction.guild.id,
    });
  } catch (error) {
    logError('scam command', error);
    await interaction.reply({
      embeds: [createErrorEmbed('An unexpected error occurred while processing your request.')],
      ephemeral: true,
    }).catch(() => {
      // Ignore errors if interaction already replied
    });
  }
}
