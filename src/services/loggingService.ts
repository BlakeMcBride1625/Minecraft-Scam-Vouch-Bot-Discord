/**
 * Logging service for sending action logs to configured channels
 */

import { Client, TextChannel } from 'discord.js';
import * as db from './database.js';
import { createActionEmbed } from '../utils/embeds.js';
import type { LogEntry, ReportType } from '../types/index.js';

/**
 * Log an action to the configured log channel
 */
export async function logAction(client: Client, entry: LogEntry): Promise<void> {
  try {
    // Get guild configuration
    const guildResult = await db.getGuild(entry.guildId);
    if (!guildResult.success || !guildResult.data) {
      console.warn(`Guild ${entry.guildId} not found, skipping log`);
      return;
    }

    const logChannelId = guildResult.data.log_channel_id;
    if (!logChannelId) {
      // No log channel configured, silently skip
      return;
    }

    // Get log channel
    const guild = await client.guilds.fetch(entry.guildId).catch(() => null);
    if (!guild) {
      console.warn(`Guild ${entry.guildId} not accessible, skipping log`);
      return;
    }

    const channel = (await guild.channels.fetch(logChannelId).catch(() => null)) as
      | TextChannel
      | null;
    if (!channel || !channel.isTextBased()) {
      console.warn(`Log channel ${logChannelId} not found or not a text channel, skipping log`);
      return;
    }

    // Determine type and action
    const type: ReportType = entry.action.includes('scam') ? 'scam' : 'vouch';
    const action = entry.action.includes('added') ? 'added' : 'removed';

    // Create embed
    const embed = createActionEmbed(
      action,
      type,
      entry.targetUser,
      entry.targetUser, // Will be resolved by Discord
      entry.performedBy,
      entry.reason || null,
      entry.newScamCount || 0,
      entry.newVouchCount || 0
    );

    // Send to log channel
    await channel.send({ embeds: [embed] });
  } catch (error) {
    console.error('Error in logAction:', error);
    // Don't throw - logging failures shouldn't break commands
  }
}
