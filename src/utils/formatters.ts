/**
 * Formatting utility functions
 */

/**
 * Convert a number to a role name
 * Examples: 1 -> "Scams 1", 5 -> "Scams 5", or "Vouches 1", "Vouches 5"
 */
export function formatRoleName(type: 'scam' | 'vouch', threshold: number): string {
  const prefix = type === 'scam' ? 'Scams' : 'Vouches';
  return `${prefix} ${threshold}`;
}

/**
 * Format a user mention string
 */
export function formatUserMention(userId: string): string {
  return `<@${userId}>`;
}

/**
 * Format a role mention string
 */
export function formatRoleMention(roleId: string): string {
  return `<@&${roleId}>`;
}

/**
 * Format a channel mention string
 */
export function formatChannelMention(channelId: string): string {
  return `<#${channelId}>`;
}

/**
 * Truncate a string to a maximum length
 */
export function truncateString(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}

/**
 * Format a date to a readable string
 */
export function formatDate(date: Date): string {
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}
