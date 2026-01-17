/**
 * /delete-rep-roles command - Delete all reputation roles created by the bot (permission-gated)
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import * as roleService from '../services/roleService.js';
import { createRoleDeleteEmbed, createErrorEmbed } from '../utils/embeds.js';
import { hasManageRolesPermission, botHasPermissions } from '../utils/permissions.js';
import { logError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('delete-rep-roles')
  .setDescription('Delete all reputation roles created by the bot (requires Manage Roles)');

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

    // Defer reply since this might take a while
    await interaction.deferReply();

    // Delete all reputation roles
    const result = await roleService.deleteAllReputationRoles(interaction.guild);

    if (!result.success) {
      await interaction.editReply({
        embeds: [createErrorEmbed(result.error || 'Failed to delete reputation roles.')],
      });
      return;
    }

    // Create success embed
    const embed = createRoleDeleteEmbed(result.deleted);

    await interaction.editReply({ embeds: [embed] });

    if (result.error) {
      // If there were partial errors, log them
      console.warn('Partial errors deleting reputation roles:', result.error);
    }
  } catch (error) {
    logError('delete-rep-roles command', error);
    await interaction.editReply({
      embeds: [createErrorEmbed('An unexpected error occurred while processing your request.')],
    }).catch(() => {
      // Ignore errors if interaction already edited
    });
  }
}
