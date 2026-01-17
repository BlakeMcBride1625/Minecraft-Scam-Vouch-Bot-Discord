/**
 * /setup-vouch-roles command - Create vouch roles from 1 to max (permission-gated)
 */

import {
  SlashCommandBuilder,
  ChatInputCommandInteraction,
} from 'discord.js';
import * as roleService from '../services/roleService.js';
import { createRoleSetupEmbed, createErrorEmbed } from '../utils/embeds.js';
import { hasManageRolesPermission, botHasPermissions } from '../utils/permissions.js';
import { validateMaxValue } from '../utils/validators.js';
import { logError } from '../utils/errors.js';

export const data = new SlashCommandBuilder()
  .setName('setup-vouch-roles')
  .setDescription('Create vouch roles from 1 to max (requires Manage Roles)')
  .addIntegerOption((option) =>
    option
      .setName('max')
      .setDescription('Maximum threshold for vouch roles (e.g., 10 creates roles 1-10)')
      .setRequired(true)
      .setMinValue(1)
      .setMaxValue(100)
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

    const max = interaction.options.getInteger('max', true);

    // Validate max value
    const maxValidation = validateMaxValue(max);
    if (!maxValidation.valid) {
      await interaction.reply({
        embeds: [createErrorEmbed(maxValidation.error || 'Invalid max value')],
        ephemeral: true,
      });
      return;
    }

    // Defer reply since this might take a while
    await interaction.deferReply();

    // Create roles
    const result = await roleService.createRolesForThresholds(interaction.guild, 'vouch', max);

    if (!result.success) {
      await interaction.editReply({
        embeds: [createErrorEmbed(result.error || 'Failed to create vouch roles.')],
      });
      return;
    }

    // Create success embed
    const embed = createRoleSetupEmbed('vouch', result.roles.length, result.roles);

    await interaction.editReply({ embeds: [embed] });

    if (result.error) {
      // If there were partial errors, log them
      console.warn('Partial errors creating vouch roles:', result.error);
    }
  } catch (error) {
    logError('setup-vouch-roles command', error);
    await interaction.editReply({
      embeds: [createErrorEmbed('An unexpected error occurred while processing your request.')],
    }).catch(() => {
      // Ignore errors if interaction already edited
    });
  }
}
