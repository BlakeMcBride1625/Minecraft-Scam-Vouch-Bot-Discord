/**
 * /search command - Search user reputation (for vouch channel)
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import * as db from '../services/database.js';
import * as vouchChannelService from '../services/vouchChannelService.js';
import { createSearchResultEmbed, createErrorEmbed } from '../utils/embeds.js';
import { logError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('search')
  .setDescription('Search a user\'s reputation (works in vouch channel)')
  .addUserOption((option) =>
    option.setName('user').setDescription('The user to search').setRequired(true)
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

    // Check if this is a vouch channel (optional check - command works anywhere but is designed for vouch channel)
    const isVouch = await vouchChannelService.isVouchChannel(
      interaction.guild.id,
      interaction.channelId
    );

    // Note: Command works in any channel, but ideally used in vouch channel
    const targetUser = interaction.options.getUser('user', true);

    // Get user reputation info
    const infoResult = await vouchChannelService.getUserReputationInfo(
      interaction.guild.id,
      targetUser.id
    );

    if (!infoResult.success || !infoResult.user) {
      await interaction.reply({
        embeds: [createErrorEmbed(infoResult.error || 'Failed to retrieve user information.')],
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
    const embed = createSearchResultEmbed(
      targetUser.id,
      targetUser.username,
      infoResult.user.scamCount,
      infoResult.user.vouchCount,
      reputationRoles,
      infoResult.user.recentReports
    );

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logError('search command', error);
    await interaction.reply({
      embeds: [createErrorEmbed('An unexpected error occurred while processing your request.')],
      ephemeral: true,
    }).catch(() => {
      // Ignore errors if interaction already replied
    });
  }
}
