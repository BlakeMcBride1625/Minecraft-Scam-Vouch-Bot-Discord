/**
 * /staff-remove command - Remove user from staff (requires Manage Roles)
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import * as db from '../services/database.js';
import { createStaffManagementEmbed, createErrorEmbed } from '../utils/embeds.js';
import { canManageStaff } from '../utils/permissions.js';
import { logError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('staff-remove')
  .setDescription('Remove a user from staff (requires Manage Roles)')
  .addUserOption((option) =>
    option.setName('user').setDescription('The user to remove from staff').setRequired(true)
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

    // Check permissions (server owner, Manage Roles, or staff can remove staff)
    const canManage = await canManageStaff(interaction.member as any, interaction.guild.id);
    if (!canManage) {
      await interaction.reply({
        embeds: [createErrorEmbed('You need to be the server owner, have Manage Roles permission, or be staff to use this command.')],
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);

    // Remove staff member
    const result = await db.removeStaffMember(interaction.guild.id, targetUser.id);

    if (!result.success || !result.data) {
      await interaction.reply({
        embeds: [createErrorEmbed(result.error || 'User is not a staff member.')],
        ephemeral: true,
      });
      return;
    }

    // Create success embed
    const embed = createStaffManagementEmbed(
      'removed',
      targetUser.id,
      targetUser.username,
      interaction.user.id
    );

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logError('staff-remove command', error);
    await interaction.reply({
      embeds: [createErrorEmbed('An unexpected error occurred while processing your request.')],
      ephemeral: true,
    }).catch(() => {
      // Ignore errors if interaction already replied
    });
  }
}
