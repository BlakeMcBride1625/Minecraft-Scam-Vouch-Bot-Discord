/**
 * /staff-add command - Add user to staff (requires Manage Roles)
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
  .setName('staff-add')
  .setDescription('Add a user to staff (requires Manage Roles)')
  .addUserOption((option) =>
    option.setName('user').setDescription('The user to add to staff').setRequired(true)
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

    // Check permissions (server owner, Manage Roles, or staff can add staff)
    const canManage = await canManageStaff(interaction.member as any, interaction.guild.id);
    if (!canManage) {
      await interaction.reply({
        embeds: [createErrorEmbed('You need to be the server owner, have Manage Roles permission, or be staff to use this command.')],
        ephemeral: true,
      });
      return;
    }

    const targetUser = interaction.options.getUser('user', true);

    // Add staff member
    const result = await db.addStaffMember(
      interaction.guild.id,
      targetUser.id,
      interaction.user.id
    );

    if (!result.success) {
      await interaction.reply({
        embeds: [createErrorEmbed(result.error || 'Failed to add staff member.')],
        ephemeral: true,
      });
      return;
    }

    // Create success embed
    const embed = createStaffManagementEmbed(
      'added',
      targetUser.id,
      targetUser.username,
      interaction.user.id
    );

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    logError('staff-add command', error);
    await interaction.reply({
      embeds: [createErrorEmbed('An unexpected error occurred while processing your request.')],
      ephemeral: true,
    }).catch(() => {
      // Ignore errors if interaction already replied
    });
  }
}
