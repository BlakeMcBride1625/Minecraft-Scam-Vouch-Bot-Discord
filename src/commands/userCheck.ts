/**
 * /user-check command - Check a user's scam and vouch counts
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import * as db from '../services/database.js';
import { createUserCheckEmbed, createErrorEmbed } from '../utils/embeds.js';
import { logError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('user-check')
  .setDescription('Check a user\'s scam and vouch counts')
  .addUserOption((option) =>
    option.setName('user').setDescription('The user to check').setRequired(true)
  );

export async function execute(interaction: ChatInputCommandInteraction): Promise<void> {
  try {
    if (!interaction.guild) {
      await interaction.reply({
        embeds: [createErrorEmbed('This command can only be used in a server.')],
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);

    // Get user data
    const userResult = await db.getUser(interaction.guild.id, targetUser.id);
    if (!userResult.success || !userResult.data) {
      await interaction.reply({
        embeds: [createErrorEmbed(userResult.error || 'Failed to retrieve user data.')],
        ephemeral: true,
      });
      return;
    }

    // Get member to check roles
    const member = await interaction.guild.members.fetch(targetUser.id).catch(() => null);
    const reputationRoles: string[] = [];

    if (member) {
      // Get all reputation roles from database
      const scamRolesResult = await db.getRolesByGuildAndType(interaction.guild.id, 'scam');
      const vouchRolesResult = await db.getRolesByGuildAndType(interaction.guild.id, 'vouch');

      const allReputationRoleIds = new Set<string>();
      if (scamRolesResult.success && scamRolesResult.data) {
        scamRolesResult.data.forEach((r) => allReputationRoleIds.add(r.role_id));
      }
      if (vouchRolesResult.success && vouchRolesResult.data) {
        vouchRolesResult.data.forEach((r) => allReputationRoleIds.add(r.role_id));
      }

      // Filter member roles to only reputation roles
      member.roles.cache.forEach((role) => {
        if (allReputationRoleIds.has(role.id)) {
          reputationRoles.push(role.id);
        }
      });
    }

    // Create embed
    const embed = createUserCheckEmbed(
      targetUser.id,
      targetUser.username,
      userResult.data.scam_count,
      userResult.data.vouch_count,
      reputationRoles
    );

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logError('user-check command', error);
    await interaction.reply({
      embeds: [createErrorEmbed('An unexpected error occurred while processing your request.')],
      ephemeral: true,
    }).catch(() => {
      // Ignore errors if interaction already replied
    });
  }
}
