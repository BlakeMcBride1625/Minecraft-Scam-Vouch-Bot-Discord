/**
 * Utility functions for creating Discord embeds
 */

import { EmbedBuilder } from 'discord.js';
import type { ReportType } from '../types/index.js';

/**
 * Create an embed for a scam/vouch action
 */
export function createActionEmbed(
  action: 'added' | 'removed',
  type: ReportType,
  targetUserId: string,
  targetUsername: string,
  performedBy: string,
  reason: string | null,
  newScamCount: number,
  newVouchCount: number
): EmbedBuilder {
  const actionText = action === 'added' ? 'Added' : 'Removed';
  const typeText = type === 'scam' ? 'Scam' : 'Vouch';
  const color = type === 'scam' ? 0xff0000 : 0x00ff00; // Red for scam, green for vouch

  const embed = new EmbedBuilder()
    .setTitle(`${actionText} ${typeText} Report`)
    .setColor(color)
    .setDescription(`**Target:** <@${targetUserId}> (${targetUsername})`)
    .addFields(
      { name: 'Performed By', value: `<@${performedBy}>`, inline: true },
      { name: 'Action', value: `${actionText} ${typeText}`, inline: true },
      { name: 'Reason', value: reason || 'No reason provided', inline: false }
    )
    .setFooter({ text: `Scams: ${newScamCount} | Vouches: ${newVouchCount}` })
    .setTimestamp();

  return embed;
}

/**
 * Create an embed for user check command
 */
export function createUserCheckEmbed(
  userId: string,
  username: string,
  scamCount: number,
  vouchCount: number,
  roles: string[]
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`Reputation Check: ${username}`)
    .setColor(0x0099ff)
    .setDescription(`**User:** <@${userId}>`)
    .addFields(
      { name: 'Scam Count', value: scamCount.toString(), inline: true },
      { name: 'Vouch Count', value: vouchCount.toString(), inline: true },
      { name: 'Reputation Roles', value: roles.length > 0 ? roles.map(r => `<@&${r}>`).join(', ') : 'None', inline: false }
    )
    .setTimestamp();

  return embed;
}

/**
 * Create an embed for role setup completion
 */
export function createRoleSetupEmbed(
  type: ReportType,
  count: number,
  roleIds: string[]
): EmbedBuilder {
  const typeText = type === 'scam' ? 'Scam' : 'Vouch';
  const color = type === 'scam' ? 0xff0000 : 0x00ff00;

  const embed = new EmbedBuilder()
    .setTitle(`${typeText} Roles Setup Complete`)
    .setColor(color)
    .setDescription(`Successfully created ${count} ${typeText.toLowerCase()} role(s)`)
    .addFields(
      { name: 'Roles Created', value: roleIds.map(id => `<@&${id}>`).join(', ') || 'None', inline: false }
    )
    .setTimestamp();

  return embed;
}

/**
 * Create an embed for role deletion
 */
export function createRoleDeleteEmbed(count: number): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('Reputation Roles Deleted')
    .setColor(0xff9900)
    .setDescription(`Successfully deleted ${count} reputation role(s)`)
    .setTimestamp();

  return embed;
}

/**
 * Create an embed for log channel configuration
 */
export function createLogChannelEmbed(channelId: string | null): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('Log Channel Configured')
    .setColor(0x0099ff)
    .setDescription(
      channelId
        ? `Log channel set to <#${channelId}>`
        : 'Log channel cleared'
    )
    .setTimestamp();

  return embed;
}

/**
 * Create an error embed
 */
export function createErrorEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Error')
    .setColor(0xff0000)
    .setDescription(message)
    .setTimestamp();
}

/**
 * Create a success embed
 */
export function createSuccessEmbed(message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle('Success')
    .setColor(0x00ff00)
    .setDescription(message)
    .setTimestamp();
}

/**
 * Create an info embed
 */
export function createInfoEmbed(title: string, message: string): EmbedBuilder {
  return new EmbedBuilder()
    .setTitle(title)
    .setColor(0x0099ff)
    .setDescription(message)
    .setTimestamp();
}

/**
 * Create an embed for vouch channel configuration
 */
export function createVouchChannelEmbed(channelId: string | null): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('Vouch Channel Configured')
    .setColor(0x0099ff)
    .setDescription(
      channelId
        ? `Vouch channel set to <#${channelId}>`
        : 'Vouch channel cleared'
    )
    .setTimestamp();

  return embed;
}

/**
 * Create an embed for staff management (add/remove)
 */
export function createStaffManagementEmbed(
  action: 'added' | 'removed',
  userId: string,
  username: string,
  performedBy: string
): EmbedBuilder {
  const actionText = action === 'added' ? 'Added to Staff' : 'Removed from Staff';
  const color = action === 'added' ? 0x00ff00 : 0xff9900;

  return new EmbedBuilder()
    .setTitle(actionText)
    .setColor(color)
    .setDescription(`**User:** <@${userId}> (${username})`)
    .addFields({ name: 'Performed By', value: `<@${performedBy}>`, inline: true })
    .setTimestamp();
}

/**
 * Create an embed for staff list
 */
export function createStaffListEmbed(
  staffMembers: Array<{ user_id: string; added_by: string; added_at: Date }>
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('Staff Members')
    .setColor(0x0099ff)
    .setDescription(
      staffMembers.length > 0
        ? staffMembers.map((staff, index) => `${index + 1}. <@${staff.user_id}> (Added by <@${staff.added_by}>)`).join('\n')
        : 'No staff members found.'
    )
    .setTimestamp();

  return embed;
}

/**
 * Create an embed for banned/unbanned user
 */
export function createBanEmbed(
  action: 'banned' | 'unbanned',
  userId: string,
  username: string,
  reason: string | null,
  performedBy: string
): EmbedBuilder {
  const actionText = action === 'banned' ? 'Banned from Reputation System' : 'Unbanned from Reputation System';
  const color = action === 'banned' ? 0xff0000 : 0x00ff00;

  const embed = new EmbedBuilder()
    .setTitle(actionText)
    .setColor(color)
    .setDescription(`**User:** <@${userId}> (${username})`)
    .addFields({ name: 'Performed By', value: `<@${performedBy}>`, inline: true });

  if (reason) {
    embed.addFields({ name: 'Reason', value: reason, inline: false });
  }

  embed.setTimestamp();

  return embed;
}

/**
 * Create an embed for user reports view
 */
export function createReportsEmbed(
  userId: string,
  username: string,
  reports: Array<{ id: number; type: ReportType; reason: string | null; reported_by: string; created_at: Date }>,
  type?: ReportType
): EmbedBuilder {
  const filteredReports = type ? reports.filter(r => r.type === type) : reports;
  const typeText = type ? (type === 'scam' ? 'Scam' : 'Vouch') : 'All';

  const embed = new EmbedBuilder()
    .setTitle(`${typeText} Reports: ${username}`)
    .setColor(0x0099ff)
    .setDescription(`**User:** <@${userId}>`);

  if (filteredReports.length === 0) {
    embed.addFields({ name: 'No Reports', value: `No ${typeText.toLowerCase()} reports found for this user.`, inline: false });
  } else {
    // Show up to 10 reports
    const displayReports = filteredReports.slice(0, 10);
    const reportText = displayReports.map((report, index) => {
      const date = new Date(report.created_at).toLocaleDateString();
      return `${index + 1}. **${report.type.toUpperCase()}** - <@${report.reported_by}> (${date})\n   ${report.reason || 'No reason provided'}`;
    }).join('\n\n');

    embed.addFields({ name: `Reports (${filteredReports.length} total)`, value: reportText.length > 1024 ? reportText.substring(0, 1021) + '...' : reportText, inline: false });
  }

  embed.setTimestamp();

  return embed;
}

/**
 * Create an embed for statistics
 */
export function createStatisticsEmbed(
  guildId: string,
  stats: {
    totalUsers: number;
    totalReports: number;
    totalScamReports: number;
    totalVouchReports: number;
    bannedUsers: number;
    staffMembers: number;
  }
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle('Guild Statistics')
    .setColor(0x0099ff)
    .addFields(
      { name: 'Total Users', value: stats.totalUsers.toString(), inline: true },
      { name: 'Total Reports', value: stats.totalReports.toString(), inline: true },
      { name: 'Scam Reports', value: stats.totalScamReports.toString(), inline: true },
      { name: 'Vouch Reports', value: stats.totalVouchReports.toString(), inline: true },
      { name: 'Banned Users', value: stats.bannedUsers.toString(), inline: true },
      { name: 'Staff Members', value: stats.staffMembers.toString(), inline: true }
    )
    .setTimestamp();

  return embed;
}

/**
 * Create an embed for search results (vouch channel)
 */
export function createSearchResultEmbed(
  userId: string,
  username: string,
  scamCount: number,
  vouchCount: number,
  roles: string[],
  recentReports?: Array<{ type: ReportType; reason: string | null; created_at: Date }>
): EmbedBuilder {
  const embed = new EmbedBuilder()
    .setTitle(`Reputation Search: ${username}`)
    .setColor(0x0099ff)
    .setDescription(`**User:** <@${userId}>`)
    .addFields(
      { name: 'Scam Count', value: scamCount.toString(), inline: true },
      { name: 'Vouch Count', value: vouchCount.toString(), inline: true },
      { name: 'Reputation Roles', value: roles.length > 0 ? roles.map(r => `<@&${r}>`).join(', ') : 'None', inline: false }
    );

  if (recentReports && recentReports.length > 0) {
    const recentText = recentReports.slice(0, 5).map(report => {
      const date = new Date(report.created_at).toLocaleDateString();
      return `**${report.type.toUpperCase()}** (${date}): ${report.reason || 'No reason'}`;
    }).join('\n');
    embed.addFields({ name: 'Recent Reports', value: recentText.length > 1024 ? recentText.substring(0, 1021) + '...' : recentText, inline: false });
  }

  embed.setTimestamp();

  return embed;
}
