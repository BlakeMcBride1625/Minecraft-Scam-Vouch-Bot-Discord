/**
 * Database service for PostgreSQL operations
 * Handles all database interactions with connection pooling and transactions
 */

import pg from 'pg';
import type { Guild, User, Report, Role, DatabaseResult, ReportType, StaffMember, BannedUser } from '../types/index.js';

const { Pool } = pg;

// Database connection pool
let pool: pg.Pool | null = null;

/**
 * Initialize database connection pool
 */
export function initializeDatabase(connectionString: string): void {
  if (pool) {
    console.warn('Database pool already initialized');
    return;
  }

  // Parse SSL requirement from connection string or environment
  // Only use SSL if explicitly required (e.g., for cloud databases)
  // Local databases typically don't need SSL
  const useSSL = connectionString.includes('sslmode=require') || 
                 connectionString.includes('sslmode=prefer');
  
  pool = new Pool({
    connectionString,
    ssl: useSSL ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });

  pool.on('error', (err) => {
    console.error('Unexpected database pool error:', err);
  });

  console.log('Database pool initialized');
}

/**
 * Get database pool instance
 */
function getPool(): pg.Pool {
  if (!pool) {
    throw new Error('Database pool not initialized. Call initializeDatabase() first.');
  }
  return pool;
}

// ============================================================================
// GUILDS
// ============================================================================

/**
 * Get or create a guild record
 */
export async function getOrCreateGuild(guildId: string): Promise<DatabaseResult<Guild>> {
  try {
    const client = await getPool().connect();
    try {
      // Try to get existing guild
      let result = await client.query<Guild>(
        'SELECT * FROM guilds WHERE guild_id = $1',
        [guildId]
      );

      if (result.rows.length > 0) {
        return { success: true, data: result.rows[0] };
      }

      // Create new guild
      result = await client.query<Guild>(
        'INSERT INTO guilds (guild_id) VALUES ($1) RETURNING *',
        [guildId]
      );

      return { success: true, data: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in getOrCreateGuild:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Update guild log channel
 */
export async function updateGuildLogChannel(
  guildId: string,
  logChannelId: string | null
): Promise<DatabaseResult<Guild>> {
  try {
    const client = await getPool().connect();
    try {
      await getOrCreateGuild(guildId); // Ensure guild exists

      const result = await client.query<Guild>(
        'UPDATE guilds SET log_channel_id = $1 WHERE guild_id = $2 RETURNING *',
        [logChannelId, guildId]
      );

      return { success: true, data: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in updateGuildLogChannel:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Update guild vouch channel
 */
export async function updateGuildVouchChannel(
  guildId: string,
  vouchChannelId: string | null
): Promise<DatabaseResult<Guild>> {
  try {
    const client = await getPool().connect();
    try {
      await getOrCreateGuild(guildId); // Ensure guild exists

      const result = await client.query<Guild>(
        'UPDATE guilds SET vouch_channel_id = $1 WHERE guild_id = $2 RETURNING *',
        [vouchChannelId, guildId]
      );

      return { success: true, data: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in updateGuildVouchChannel:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get guild configuration
 */
export async function getGuild(guildId: string): Promise<DatabaseResult<Guild>> {
  try {
    const client = await getPool().connect();
    try {
      const result = await client.query<Guild>(
        'SELECT * FROM guilds WHERE guild_id = $1',
        [guildId]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'Guild not found' };
      }

      return { success: true, data: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in getGuild:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// USERS
// ============================================================================

/**
 * Get or create a user record
 */
export async function getOrCreateUser(
  guildId: string,
  userId: string
): Promise<DatabaseResult<User>> {
  try {
    const client = await getPool().connect();
    try {
      // Ensure guild exists
      await getOrCreateGuild(guildId);

      // Try to get existing user
      let result = await client.query<User>(
        'SELECT * FROM users WHERE guild_id = $1 AND user_id = $2',
        [guildId, userId]
      );

      if (result.rows.length > 0) {
        return { success: true, data: result.rows[0] };
      }

      // Create new user
      result = await client.query<User>(
        'INSERT INTO users (guild_id, user_id) VALUES ($1, $2) RETURNING *',
        [guildId, userId]
      );

      return { success: true, data: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in getOrCreateUser:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Increment user scam or vouch count
 */
export async function incrementUserCount(
  guildId: string,
  userId: string,
  type: ReportType
): Promise<DatabaseResult<User>> {
  try {
    const client = await getPool().connect();
    try {
      await getOrCreateUser(guildId, userId); // Ensure user exists

      const column = type === 'scam' ? 'scam_count' : 'vouch_count';
      const result = await client.query<User>(
        `UPDATE users SET ${column} = ${column} + 1 WHERE guild_id = $1 AND user_id = $2 RETURNING *`,
        [guildId, userId]
      );

      return { success: true, data: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in incrementUserCount:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Decrement user scam or vouch count
 */
export async function decrementUserCount(
  guildId: string,
  userId: string,
  type: ReportType
): Promise<DatabaseResult<User>> {
  try {
    const client = await getPool().connect();
    try {
      const column = type === 'scam' ? 'scam_count' : 'vouch_count';
      const result = await client.query<User>(
        `UPDATE users SET ${column} = GREATEST(${column} - 1, 0) WHERE guild_id = $1 AND user_id = $2 RETURNING *`,
        [guildId, userId]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }

      return { success: true, data: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in decrementUserCount:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get user record
 */
export async function getUser(guildId: string, userId: string): Promise<DatabaseResult<User>> {
  try {
    const client = await getPool().connect();
    try {
      const result = await client.query<User>(
        'SELECT * FROM users WHERE guild_id = $1 AND user_id = $2',
        [guildId, userId]
      );

      if (result.rows.length === 0) {
        // Return default counts if user doesn't exist
        return {
          success: true,
          data: {
            guild_id: guildId,
            user_id: userId,
            scam_count: 0,
            vouch_count: 0,
            created_at: new Date(),
            updated_at: new Date(),
          },
        };
      }

      return { success: true, data: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in getUser:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// REPORTS
// ============================================================================

/**
 * Add a report (scam or vouch)
 * Uses transaction to ensure data consistency
 */
export async function addReport(
  guildId: string,
  userId: string,
  type: ReportType,
  reason: string | null,
  reportedBy: string
): Promise<DatabaseResult<Report>> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    try {
      // Check if user is banned
      const bannedCheck = await client.query<BannedUser>(
        'SELECT * FROM banned_users WHERE guild_id = $1 AND user_id = $2',
        [guildId, userId]
      );

      if (bannedCheck.rows.length > 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'User is banned from the reputation system' };
      }

      // Ensure guild and user exist
      await getOrCreateGuild(guildId);
      await getOrCreateUser(guildId, userId);

      // Insert report
      const reportResult = await client.query<Report>(
        'INSERT INTO reports (guild_id, user_id, type, reason, reported_by) VALUES ($1, $2, $3, $4, $5) RETURNING *',
        [guildId, userId, type, reason, reportedBy]
      );

      // Increment count
      await incrementUserCount(guildId, userId, type);

      await client.query('COMMIT');
      return { success: true, data: reportResult.rows[0] };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error in addReport:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  } finally {
    client.release();
  }
}

/**
 * Get the most recent report for a user of a specific type
 */
export async function getLatestReport(
  guildId: string,
  userId: string,
  type: ReportType
): Promise<DatabaseResult<Report>> {
  try {
    const client = await getPool().connect();
    try {
      const result = await client.query<Report>(
        'SELECT * FROM reports WHERE guild_id = $1 AND user_id = $2 AND type = $3 ORDER BY created_at DESC LIMIT 1',
        [guildId, userId, type]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'No report found' };
      }

      return { success: true, data: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in getLatestReport:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get all reports for a user (optionally filtered by type)
 */
export async function getUserReports(
  guildId: string,
  userId: string,
  type?: ReportType
): Promise<DatabaseResult<Report[]>> {
  try {
    const client = await getPool().connect();
    try {
      let result;
      if (type) {
        result = await client.query<Report>(
          'SELECT * FROM reports WHERE guild_id = $1 AND user_id = $2 AND type = $3 ORDER BY created_at DESC',
          [guildId, userId, type]
        );
      } else {
        result = await client.query<Report>(
          'SELECT * FROM reports WHERE guild_id = $1 AND user_id = $2 ORDER BY created_at DESC',
          [guildId, userId]
        );
      }

      return { success: true, data: result.rows };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in getUserReports:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Search reports with filters
 */
export async function searchReports(
  guildId: string,
  userId?: string,
  type?: ReportType,
  reportedBy?: string,
  limit: number = 50
): Promise<DatabaseResult<Report[]>> {
  try {
    const client = await getPool().connect();
    try {
      let query = 'SELECT * FROM reports WHERE guild_id = $1';
      const params: any[] = [guildId];
      let paramIndex = 2;

      if (userId) {
        query += ` AND user_id = $${paramIndex}`;
        params.push(userId);
        paramIndex++;
      }

      if (type) {
        query += ` AND type = $${paramIndex}`;
        params.push(type);
        paramIndex++;
      }

      if (reportedBy) {
        query += ` AND reported_by = $${paramIndex}`;
        params.push(reportedBy);
        paramIndex++;
      }

      query += ` ORDER BY created_at DESC LIMIT $${paramIndex}`;
      params.push(limit);

      const result = await client.query<Report>(query, params);

      return { success: true, data: result.rows };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in searchReports:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get guild statistics
 */
export async function getGuildStatistics(guildId: string): Promise<DatabaseResult<{
  totalUsers: number;
  totalReports: number;
  totalScamReports: number;
  totalVouchReports: number;
}>> {
  try {
    const client = await getPool().connect();
    try {
      // Get total users
      const usersResult = await client.query('SELECT COUNT(*) FROM users WHERE guild_id = $1', [guildId]);
      const totalUsers = parseInt(usersResult.rows[0].count, 10);

      // Get total reports
      const reportsResult = await client.query('SELECT COUNT(*) FROM reports WHERE guild_id = $1', [guildId]);
      const totalReports = parseInt(reportsResult.rows[0].count, 10);

      // Get scam reports
      const scamResult = await client.query('SELECT COUNT(*) FROM reports WHERE guild_id = $1 AND type = $2', [guildId, 'scam']);
      const totalScamReports = parseInt(scamResult.rows[0].count, 10);

      // Get vouch reports
      const vouchResult = await client.query('SELECT COUNT(*) FROM reports WHERE guild_id = $1 AND type = $2', [guildId, 'vouch']);
      const totalVouchReports = parseInt(vouchResult.rows[0].count, 10);

      return {
        success: true,
        data: {
          totalUsers,
          totalReports,
          totalScamReports,
          totalVouchReports,
        },
      };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in getGuildStatistics:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Remove a report by ID and decrement count
 * Uses transaction to ensure data consistency
 */
export async function removeReport(
  guildId: string,
  userId: string,
  type: ReportType,
  reportId: number
): Promise<DatabaseResult<boolean>> {
  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    try {
      // Delete report
      const deleteResult = await client.query(
        'DELETE FROM reports WHERE id = $1 AND guild_id = $2 AND user_id = $3 AND type = $4',
        [reportId, guildId, userId, type]
      );

      if (deleteResult.rowCount === 0) {
        await client.query('ROLLBACK');
        return { success: false, error: 'Report not found' };
      }

      // Decrement count
      await decrementUserCount(guildId, userId, type);

      await client.query('COMMIT');
      return { success: true, data: true };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    console.error('Error in removeReport:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  } finally {
    client.release();
  }
}

/**
 * Reset user counts (scam, vouch, or both)
 */
export async function resetUserCounts(
  guildId: string,
  userId: string,
  type?: ReportType
): Promise<DatabaseResult<User>> {
  try {
    const client = await getPool().connect();
    try {
      let result;
      if (type === 'scam') {
        result = await client.query<User>(
          'UPDATE users SET scam_count = 0 WHERE guild_id = $1 AND user_id = $2 RETURNING *',
          [guildId, userId]
        );
      } else if (type === 'vouch') {
        result = await client.query<User>(
          'UPDATE users SET vouch_count = 0 WHERE guild_id = $1 AND user_id = $2 RETURNING *',
          [guildId, userId]
        );
      } else {
        result = await client.query<User>(
          'UPDATE users SET scam_count = 0, vouch_count = 0 WHERE guild_id = $1 AND user_id = $2 RETURNING *',
          [guildId, userId]
        );
      }

      if (result.rows.length === 0) {
        return { success: false, error: 'User not found' };
      }

      return { success: true, data: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in resetUserCounts:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// ROLES
// ============================================================================

/**
 * Create or update a role record
 */
export async function createRole(
  guildId: string,
  type: ReportType,
  threshold: number,
  roleId: string
): Promise<DatabaseResult<Role>> {
  try {
    const client = await getPool().connect();
    try {
      await getOrCreateGuild(guildId); // Ensure guild exists

      // Use INSERT ... ON CONFLICT to handle duplicates
      const result = await client.query<Role>(
        `INSERT INTO roles (guild_id, type, threshold, role_id)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (guild_id, type, threshold)
         DO UPDATE SET role_id = $4
         RETURNING *`,
        [guildId, type, threshold, roleId]
      );

      return { success: true, data: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in createRole:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get all roles for a guild and type, ordered by threshold
 */
export async function getRolesByGuildAndType(
  guildId: string,
  type: ReportType
): Promise<DatabaseResult<Role[]>> {
  try {
    const client = await getPool().connect();
    try {
      const result = await client.query<Role>(
        'SELECT * FROM roles WHERE guild_id = $1 AND type = $2 ORDER BY threshold ASC',
        [guildId, type]
      );

      return { success: true, data: result.rows };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in getRolesByGuildAndType:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get role by role ID
 */
export async function getRoleByRoleId(roleId: string): Promise<DatabaseResult<Role>> {
  try {
    const client = await getPool().connect();
    try {
      const result = await client.query<Role>(
        'SELECT * FROM roles WHERE role_id = $1',
        [roleId]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'Role not found' };
      }

      return { success: true, data: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in getRoleByRoleId:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Delete all roles for a guild
 */
export async function deleteAllRolesByGuild(guildId: string): Promise<DatabaseResult<Role[]>> {
  try {
    const client = await getPool().connect();
    try {
      const result = await client.query<Role>(
        'DELETE FROM roles WHERE guild_id = $1 RETURNING *',
        [guildId]
      );

      return { success: true, data: result.rows };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in deleteAllRolesByGuild:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// STAFF MEMBERS
// ============================================================================

/**
 * Add staff member
 */
export async function addStaffMember(
  guildId: string,
  userId: string,
  addedBy: string
): Promise<DatabaseResult<StaffMember>> {
  try {
    const client = await getPool().connect();
    try {
      await getOrCreateGuild(guildId); // Ensure guild exists

      const result = await client.query<StaffMember>(
        'INSERT INTO staff_members (guild_id, user_id, added_by) VALUES ($1, $2, $3) ON CONFLICT (guild_id, user_id) DO UPDATE SET added_by = $3 RETURNING *',
        [guildId, userId, addedBy]
      );

      return { success: true, data: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in addStaffMember:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Remove staff member
 */
export async function removeStaffMember(
  guildId: string,
  userId: string
): Promise<DatabaseResult<boolean>> {
  try {
    const client = await getPool().connect();
    try {
      const result = await client.query(
        'DELETE FROM staff_members WHERE guild_id = $1 AND user_id = $2',
        [guildId, userId]
      );

      return { success: true, data: result.rowCount! > 0 };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in removeStaffMember:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get staff member
 */
export async function getStaffMember(
  guildId: string,
  userId: string
): Promise<DatabaseResult<StaffMember>> {
  try {
    const client = await getPool().connect();
    try {
      const result = await client.query<StaffMember>(
        'SELECT * FROM staff_members WHERE guild_id = $1 AND user_id = $2',
        [guildId, userId]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'Staff member not found' };
      }

      return { success: true, data: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in getStaffMember:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get all staff members for a guild
 */
export async function getStaffMembers(guildId: string): Promise<DatabaseResult<StaffMember[]>> {
  try {
    const client = await getPool().connect();
    try {
      const result = await client.query<StaffMember>(
        'SELECT * FROM staff_members WHERE guild_id = $1 ORDER BY added_at ASC',
        [guildId]
      );

      return { success: true, data: result.rows };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in getStaffMembers:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

// ============================================================================
// BANNED USERS
// ============================================================================

/**
 * Add banned user
 */
export async function addBannedUser(
  guildId: string,
  userId: string,
  reason: string | null,
  bannedBy: string
): Promise<DatabaseResult<BannedUser>> {
  try {
    const client = await getPool().connect();
    try {
      await getOrCreateGuild(guildId); // Ensure guild exists

      const result = await client.query<BannedUser>(
        'INSERT INTO banned_users (guild_id, user_id, reason, banned_by) VALUES ($1, $2, $3, $4) ON CONFLICT (guild_id, user_id) DO UPDATE SET reason = $3, banned_by = $4, banned_at = CURRENT_TIMESTAMP RETURNING *',
        [guildId, userId, reason, bannedBy]
      );

      return { success: true, data: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in addBannedUser:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Remove banned user
 */
export async function removeBannedUser(
  guildId: string,
  userId: string
): Promise<DatabaseResult<boolean>> {
  try {
    const client = await getPool().connect();
    try {
      const result = await client.query(
        'DELETE FROM banned_users WHERE guild_id = $1 AND user_id = $2',
        [guildId, userId]
      );

      return { success: true, data: result.rowCount! > 0 };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in removeBannedUser:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get banned user
 */
export async function getBannedUser(
  guildId: string,
  userId: string
): Promise<DatabaseResult<BannedUser>> {
  try {
    const client = await getPool().connect();
    try {
      const result = await client.query<BannedUser>(
        'SELECT * FROM banned_users WHERE guild_id = $1 AND user_id = $2',
        [guildId, userId]
      );

      if (result.rows.length === 0) {
        return { success: false, error: 'Banned user not found' };
      }

      return { success: true, data: result.rows[0] };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in getBannedUser:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Get all banned users for a guild
 */
export async function getBannedUsers(guildId: string): Promise<DatabaseResult<BannedUser[]>> {
  try {
    const client = await getPool().connect();
    try {
      const result = await client.query<BannedUser>(
        'SELECT * FROM banned_users WHERE guild_id = $1 ORDER BY banned_at DESC',
        [guildId]
      );

      return { success: true, data: result.rows };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in getBannedUsers:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Close database pool (for cleanup)
 */
export async function closeDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database pool closed');
  }
}
