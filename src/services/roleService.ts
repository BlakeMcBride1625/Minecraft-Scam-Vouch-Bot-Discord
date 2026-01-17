/**
 * Role service for automatic role creation and assignment
 * Handles role creation with colors, assignment logic (highest role only), and removal
 */

import { Guild, Role as DiscordRole, GuildMember } from 'discord.js';
import type { ReportType, RoleAssignmentResult } from '../types/index.js';
import * as db from './database.js';
import { formatRoleName } from '../utils/formatters.js';

/**
 * Get vibrant color for a role based on type and threshold
 * Uses gradient: darker colors for lower thresholds, brighter for higher
 */
function getRoleColor(type: ReportType, threshold: number): number {
  if (type === 'scam') {
    // Vibrant red/orange gradient for scam roles
    // Scams 1: 0xFF4444 (bright red)
    // Scams 5: 0xFF6600 (orange-red)
    // Scams 10+: 0xFF8800 (bright orange)
    if (threshold <= 1) return 0xFF4444; // Bright red
    if (threshold <= 5) return 0xFF6600; // Orange-red
    return 0xFF8800; // Bright orange
  } else {
    // Vibrant green/teal gradient for vouch roles
    // Vouches 1: 0x44FF44 (bright green)
    // Vouches 5: 0x00FF88 (green-teal)
    // Vouches 10+: 0x00FFAA (bright teal)
    if (threshold <= 1) return 0x44FF44; // Bright green
    if (threshold <= 5) return 0x00FF88; // Green-teal
    return 0x00FFAA; // Bright teal
  }
}

/**
 * Create a role with appropriate color and name
 * Uses vibrant color gradient based on threshold
 */
export async function createRole(
  guild: Guild,
  type: ReportType,
  threshold: number
): Promise<{ success: boolean; role?: DiscordRole; error?: string }> {
  try {
    const roleName = formatRoleName(type, threshold);
    const color = getRoleColor(type, threshold);

    // Check if role already exists
    const existingRole = guild.roles.cache.find(
      (r) => r.name === roleName && r.managed === false
    );

    if (existingRole) {
      // Role exists, save it to database and return
      const result = await db.createRole(guild.id, type, threshold, existingRole.id);
      if (!result.success) {
        return { success: false, error: result.error };
      }
      return { success: true, role: existingRole };
    }

    // Create new role
    const role = await guild.roles.create({
      name: roleName,
      color: color,
      reason: `Auto-created ${type} role for threshold ${threshold}`,
      mentionable: false,
    });

    // Save to database
    const result = await db.createRole(guild.id, type, threshold, role.id);
    if (!result.success) {
      // If database save fails, try to delete the role
      try {
        await role.delete('Failed to save role to database');
      } catch (deleteError) {
        console.error('Failed to delete role after database error:', deleteError);
      }
      return { success: false, error: result.error };
    }

    return { success: true, role };
  } catch (error) {
    console.error('Error in createRole:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return { success: false, error: errorMessage };
  }
}

/**
 * Get the highest applicable role for a user based on their count
 * Returns null if no role is applicable
 */
async function getHighestApplicableRole(
  guildId: string,
  type: ReportType,
  count: number
): Promise<{ success: boolean; role?: { id: string; threshold: number }; error?: string }> {
  try {
    const rolesResult = await db.getRolesByGuildAndType(guildId, type);
    if (!rolesResult.success || !rolesResult.data) {
      return { success: false, error: rolesResult.error || 'Failed to get roles' };
    }

    const roles = rolesResult.data;

    // Find the highest role where threshold <= count
    let highestRole: { id: string; threshold: number } | undefined;
    for (const role of roles) {
      if (role.threshold <= count) {
        if (!highestRole || role.threshold > highestRole.threshold) {
          highestRole = { id: role.role_id, threshold: role.threshold };
        }
      }
    }

    return { success: true, role: highestRole };
  } catch (error) {
    console.error('Error in getHighestApplicableRole:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get all reputation roles of a specific type that a member currently has
 */
async function getMemberReputationRoles(
  member: GuildMember,
  type: ReportType
): Promise<DiscordRole[]> {
  const rolesResult = await db.getRolesByGuildAndType(member.guild.id, type);
  if (!rolesResult.success || !rolesResult.data) {
    return [];
  }

  const reputationRoleIds = rolesResult.data.map((r) => r.role_id);
  return member.roles.cache.filter((role) => reputationRoleIds.includes(role.id)).map((r) => r);
}

/**
 * Update user's role based on their current count
 * Removes outdated roles and assigns the highest applicable role
 * Creates roles on-demand if they don't exist
 */
export async function updateUserRole(
  guild: Guild,
  userId: string,
  type: ReportType
): Promise<RoleAssignmentResult> {
  try {
    // Get member
    const member = await guild.members.fetch(userId).catch(() => null);
    if (!member) {
      return { success: false, error: 'Member not found in guild' };
    }

    // Get user's current count
    const userResult = await db.getUser(guild.id, userId);
    if (!userResult.success || !userResult.data) {
      return { success: false, error: userResult.error || 'Failed to get user data' };
    }

    const count = type === 'scam' ? userResult.data.scam_count : userResult.data.vouch_count;

    // If count is 0, remove all roles of this type and return
    if (count === 0) {
      const currentRoles = await getMemberReputationRoles(member, type);
      const rolesToRemove = currentRoles.map((r) => r.id);
      
      if (rolesToRemove.length > 0) {
        try {
          await member.roles.remove(rolesToRemove, 'Removing reputation role (count is 0)');
        } catch (error) {
          console.error('Error removing roles:', error);
        }
      }
      
      return {
        success: true,
        roleAssigned: null,
        rolesRemoved: rolesToRemove,
      };
    }

    // Get highest applicable role (check database first)
    let roleResult = await getHighestApplicableRole(guild.id, type, count);
    
    // If no role exists for this threshold, create it on-demand
    if (!roleResult.success || !roleResult.role) {
      // Create role for the exact threshold
      const createResult = await createRole(guild, type, count);
      if (!createResult.success || !createResult.role) {
        console.warn(`Failed to create role for threshold ${count}: ${createResult.error}`);
        // Continue with existing role assignment if any exist
        roleResult = await getHighestApplicableRole(guild.id, type, count);
      } else {
        // Use the newly created role
        roleResult = {
          success: true,
          role: { id: createResult.role.id, threshold: count },
        };
      }
    }

    // Get all current reputation roles of this type
    const currentRoles = await getMemberReputationRoles(member, type);
    const rolesToRemove = currentRoles.map((r) => r.id);

    // Remove all current reputation roles of this type
    if (rolesToRemove.length > 0) {
      try {
        await member.roles.remove(rolesToRemove, 'Updating reputation role');
      } catch (error) {
        console.error('Error removing roles:', error);
        // Continue even if removal fails - Discord hierarchy might be an issue
      }
    }

    // Assign new role if applicable
    let roleAssigned: string | null = null;
    if (roleResult.role) {
      try {
        await member.roles.add(roleResult.role.id, 'Reputation role assignment');
        roleAssigned = roleResult.role.id;
      } catch (error) {
        console.error('Error assigning role:', error);
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to assign role',
          rolesRemoved: rolesToRemove,
        };
      }
    }

    return {
      success: true,
      roleAssigned,
      rolesRemoved: rolesToRemove,
    };
  } catch (error) {
    console.error('Error in updateUserRole:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Create multiple roles for a type from 1 to max
 */
export async function createRolesForThresholds(
  guild: Guild,
  type: ReportType,
  max: number
): Promise<{ success: boolean; roles: string[]; error?: string }> {
  const createdRoleIds: string[] = [];
  const errors: string[] = [];

  for (let threshold = 1; threshold <= max; threshold++) {
    const result = await createRole(guild, type, threshold);
    if (result.success && result.role) {
      createdRoleIds.push(result.role.id);
    } else {
      errors.push(`Failed to create role for threshold ${threshold}: ${result.error || 'Unknown error'}`);
    }
  }

  if (errors.length > 0 && createdRoleIds.length === 0) {
    return { success: false, roles: [], error: errors.join('; ') };
  }

  return {
    success: true,
    roles: createdRoleIds,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  };
}

/**
 * Delete all reputation roles for a guild
 */
export async function deleteAllReputationRoles(
  guild: Guild
): Promise<{ success: boolean; deleted: number; error?: string }> {
  try {
    // Get all roles from database
    const scamRolesResult = await db.getRolesByGuildAndType(guild.id, 'scam');
    const vouchRolesResult = await db.getRolesByGuildAndType(guild.id, 'vouch');

    const allRoleIds: string[] = [];
    if (scamRolesResult.success && scamRolesResult.data) {
      allRoleIds.push(...scamRolesResult.data.map((r) => r.role_id));
    }
    if (vouchRolesResult.success && vouchRolesResult.data) {
      allRoleIds.push(...vouchRolesResult.data.map((r) => r.role_id));
    }

    let deleted = 0;
    const errors: string[] = [];

    // Delete each role from Discord
    for (const roleId of allRoleIds) {
      try {
        const role = await guild.roles.fetch(roleId).catch(() => null);
        if (role) {
          await role.delete('Deleting reputation roles');
          deleted++;
        }
      } catch (error) {
        errors.push(`Failed to delete role ${roleId}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Delete from database
    const dbResult = await db.deleteAllRolesByGuild(guild.id);
    if (!dbResult.success) {
      errors.push(`Database error: ${dbResult.error || 'Unknown error'}`);
    }

    return {
      success: errors.length === 0,
      deleted,
      error: errors.length > 0 ? errors.join('; ') : undefined,
    };
  } catch (error) {
    console.error('Error in deleteAllReputationRoles:', error);
    return {
      success: false,
      deleted: 0,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
