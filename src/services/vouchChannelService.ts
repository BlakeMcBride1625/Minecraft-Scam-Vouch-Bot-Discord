/**
 * Vouch channel service for handling reputation searches in vouch channels
 */

import { Client, TextChannel } from 'discord.js';
import * as db from './database.js';
import { createSearchResultEmbed } from '../utils/embeds.js';

/**
 * Check if a channel is the vouch channel for a guild
 */
export async function isVouchChannel(guildId: string, channelId: string): Promise<boolean> {
  try {
    const guildResult = await db.getGuild(guildId);
    if (!guildResult.success || !guildResult.data) {
      return false;
    }

    return guildResult.data.vouch_channel_id === channelId;
  } catch (error) {
    console.error('Error checking vouch channel:', error);
    return false;
  }
}

/**
 * Get user reputation info for search command
 */
export async function getUserReputationInfo(
  guildId: string,
  userId: string
): Promise<{
  success: boolean;
  user?: {
    scamCount: number;
    vouchCount: number;
    roles: string[];
    recentReports?: Array<{ type: 'scam' | 'vouch'; reason: string | null; created_at: Date }>;
  };
  error?: string;
}> {
  try {
    // Get user data
    const userResult = await db.getUser(guildId, userId);
    if (!userResult.success || !userResult.data) {
      return { success: false, error: userResult.error || 'User not found' };
    }

    // Get recent reports (last 5)
    const reportsResult = await db.getUserReports(guildId, userId);
    const recentReports = reportsResult.success && reportsResult.data
      ? reportsResult.data.slice(0, 5).map(r => ({
          type: r.type,
          reason: r.reason,
          created_at: r.created_at,
        }))
      : undefined;

    // Get roles - we'll need to fetch from guild in the command handler
    return {
      success: true,
      user: {
        scamCount: userResult.data.scam_count,
        vouchCount: userResult.data.vouch_count,
        roles: [], // Will be filled in command handler
        recentReports,
      },
    };
  } catch (error) {
    console.error('Error getting user reputation info:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
