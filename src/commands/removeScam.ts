/**
 * /remove-scam command - Remove the most recent scam report (permission-gated)
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import * as db from '../services/database.js';
import * as roleService from '../services/roleService.js';
import * as loggingService from '../services/loggingService.js';
import { createActionEmbed, createErrorEmbed, createSuccessEmbed } from '../utils/embeds.js';
import { hasManageRolesPermission, botHasPermissions } from '../utils/permissions.js';
import { logError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('remove-scam')
  .setDescription('Remove the most recent scam report for a user (requires Manage Roles)')
  .addUserOption((option) =>
    option.setName('user').setDescription('The user to remove a scam report from').setRequired(true)
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

    // Check bot permissions
    const botMember = await interaction.guild.members.fetchMe();
    const botPerms = botHasPermissions(botMember);
    if (!botPerms.hasPermissions) {
      await interaction.reply({
        embeds: [
          createErrorEmbed(
            `The bot is missing the following permissions: ${botPerms.missingPermissions.join(', ')}`
          ),
        ],
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);

    // Get latest report
    const reportResult = await db.getLatestReport(interaction.guild.id, targetUser.id, 'scam');
    if (!reportResult.success || !reportResult.data) {
      await interaction.reply({
        embeds: [createErrorEmbed('No scam reports found for this user.')],
        ephemeral: true,
      });
      return;
    }

    // Remove report
    const removeResult = await db.removeReport(
      interaction.guild.id,
      targetUser.id,
      'scam',
      reportResult.data.id
    );

    if (!removeResult.success) {
      await interaction.reply({
        embeds: [createErrorEmbed(removeResult.error || 'Failed to remove scam report.')],
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
      'removed',
      'scam',
      targetUser.id,
      targetUser.username,
      interaction.user.id,
      reportResult.data.reason,
      userResult.data.scam_count,
      userResult.data.vouch_count
    );

    await interaction.reply({ embeds: [embed] });

    // Log action
    await loggingService.logAction(interaction.client, {
      action: 'scam_removed',
      performedBy: interaction.user.id,
      targetUser: targetUser.id,
      reason: reportResult.data.reason,
      newScamCount: userResult.data.scam_count,
      newVouchCount: userResult.data.vouch_count,
      guildId: interaction.guild.id,
    });
  } catch (error) {
    logError('remove-scam command', error);
    await interaction.reply({
      embeds: [createErrorEmbed('An unexpected error occurred while processing your request.')],
      ephemeral: true,
    }).catch(() => {
      // Ignore errors if interaction already replied
    });
  }
}
