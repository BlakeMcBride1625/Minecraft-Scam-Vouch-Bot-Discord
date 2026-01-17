/**
 * Type definitions for Scam:Vouch Discord Bot
 */

// Report types
export type ReportType = 'scam' | 'vouch';

// Database model types
export interface Guild {
  guild_id: string;
  log_channel_id: string | null;
  vouch_channel_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface User {
  guild_id: string;
  user_id: string;
  scam_count: number;
  vouch_count: number;
  created_at: Date;
  updated_at: Date;
}

export interface Report {
  id: number;
  guild_id: string;
  user_id: string;
  type: ReportType;
  reason: string | null;
  reported_by: string;
  created_at: Date;
}

export interface Role {
  id: number;
  guild_id: string;
  type: ReportType;
  threshold: number;
  role_id: string;
  created_at: Date;
}

// Database model types for staff and banned users
export interface StaffMember {
  guild_id: string;
  user_id: string;
  added_by: string;
  added_at: Date;
}

export interface BannedUser {
  guild_id: string;
  user_id: string;
  reason: string | null;
  banned_by: string;
  banned_at: Date;
}

// Service return types
export interface DatabaseResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface RoleAssignmentResult {
  success: boolean;
  roleAssigned?: string | null;
  rolesRemoved?: string[];
  error?: string;
}

// Command interaction types
export interface CommandContext {
  guildId: string;
  userId: string;
  channelId: string;
  member: any; // Discord GuildMember
  user: any; // Discord User
}

// Log entry type
export interface LogEntry {
  action: 'scam_added' | 'scam_removed' | 'vouch_added' | 'vouch_removed';
  performedBy: string;
  targetUser: string;
  reason?: string | null;
  newScamCount?: number;
  newVouchCount?: number;
  guildId: string;
}
