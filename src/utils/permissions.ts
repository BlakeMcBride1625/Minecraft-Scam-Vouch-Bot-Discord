/**
 * Permission validation utilities
 */

import { PermissionFlagsBits, GuildMember } from 'discord.js';
import * as db from '../services/database.js';

/**
 * Check if a member has Manage Roles or Administrator permission
 */
export function hasManageRolesPermission(member: GuildMember | null): boolean {
  if (!member) return false;

  return (
    member.permissions.has(PermissionFlagsBits.ManageRoles) ||
    member.permissions.has(PermissionFlagsBits.Administrator)
  );
}

/**
 * Check if the bot has necessary permissions in a guild
 */
export function botHasPermissions(member: GuildMember | null): {
  hasPermissions: boolean;
  missingPermissions: string[];
} {
  if (!member) {
    return { hasPermissions: false, missingPermissions: ['ManageRoles', 'SendMessages'] };
  }

  const required = [
    PermissionFlagsBits.ManageRoles,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ViewChannel,
  ];

  const missing: string[] = [];

  if (!member.permissions.has(PermissionFlagsBits.ManageRoles)) {
    missing.push('Manage Roles');
  }
  if (!member.permissions.has(PermissionFlagsBits.SendMessages)) {
    missing.push('Send Messages');
  }
  if (!member.permissions.has(PermissionFlagsBits.ViewChannel)) {
    missing.push('View Channel');
  }

  return {
    hasPermissions: missing.length === 0,
    missingPermissions: missing,
  };
}

/**
 * Check if a user is a bot
 */
export function isBot(user: { bot?: boolean } | null): boolean {
  return user?.bot === true;
}

/**
 * Check if a user can manage another user (hierarchy check)
 */
export function canManageMember(
  manager: GuildMember | null,
  target: GuildMember | null
): boolean {
  if (!manager || !target) return false;

  // Can't manage yourself
  if (manager.id === target.id) return false;

  // Can't manage bots
  if (target.user.bot) return false;

  // Check hierarchy
  if (manager.roles.highest.position <= target.roles.highest.position) {
    return false;
  }

  return true;
}

/**
 * Check if a member is the server owner
 */
export function isServerOwner(member: GuildMember | null): boolean {
  if (!member) return false;
  return member.id === member.guild.ownerId;
}

/**
 * Check if a member can manage staff (server owner, Manage Roles/Admin, or database staff)
 */
export async function canManageStaff(member: GuildMember | null, guildId: string): Promise<boolean> {
  if (!member) return false;

  // Server owner can always manage staff
  if (isServerOwner(member)) {
    return true;
  }

  // Check Discord permissions
  if (hasManageRolesPermission(member)) {
    return true;
  }

  // Check database staff list
  try {
    const staffResult = await db.getStaffMember(guildId, member.id);
    return staffResult.success && staffResult.data !== undefined;
  } catch (error) {
    console.error('Error checking staff management permission:', error);
    return false;
  }
}

/**
 * Check if a member is staff (server owner, has Manage Roles/Admin permission OR is in database staff list)
 * This function checks both Discord permissions and database-stored staff status
 */
export async function isStaff(member: GuildMember | null, guildId: string): Promise<boolean> {
  if (!member) return false;

  // Server owner is always staff
  if (isServerOwner(member)) {
    return true;
  }

  // First check Discord permissions
  if (hasManageRolesPermission(member)) {
    return true;
  }

  // Then check database staff list
  try {
    const staffResult = await db.getStaffMember(guildId, member.id);
    return staffResult.success && staffResult.data !== undefined;
  } catch (error) {
    console.error('Error checking staff status:', error);
    return false;
  }
}
