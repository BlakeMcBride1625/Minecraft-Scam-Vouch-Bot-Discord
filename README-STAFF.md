# Scam:Vouch Discord Bot - Staff Guide

Comprehensive setup and management guide for staff and administrators.

## Table of Contents

1. [Initial Setup](#initial-setup)
2. [Configuration Commands](#configuration-commands)
3. [Staff Management](#staff-management)
4. [Staff Commands](#staff-commands)
5. [Troubleshooting](#troubleshooting)
6. [Database Management](#database-management)

## Initial Setup

### Prerequisites

- Node.js 18.0.0 or higher
- PostgreSQL database
- Discord Bot Token and Client ID
- Bot must have the following permissions in your server:
  - Manage Roles
  - Send Messages
  - Read Message History
  - View Channels
  - Use Slash Commands

### Installation Steps

1. **Install Dependencies**
   ```bash
   npm install
   ```

2. **Configure Environment Variables**
   
   Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your values:
   ```
   DISCORD_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_client_id_here
   DATABASE_URL=postgresql://user:password@localhost:5432/scamvouch_bot
   NODE_ENV=production
   ```
   
   **Note**: The server owner automatically has staff management permissions - no additional configuration needed!

3. **Set Up Database**
   
   Create the database:
   ```bash
   createdb scamvouch_bot
   ```
   
   Initialize the schema:
   ```bash
   npm run db:init
   # Or manually:
   psql $DATABASE_URL -f database/schema.sql
   ```
   
   Run migrations:
   ```bash
   psql $DATABASE_URL -f database/migration.sql
   ```

4. **Build and Run**
   ```bash
   npm run build
   npm start
   ```

## Quick Setup - Auto Setup Command

**Automatic Setup**
- **Command**: `/auto-setup [create-channels:true] [setup-roles:true]`
- **Purpose**: Automatically create channels and set up default roles
- **Requires**: Manage Roles permission
- **Options**:
  - `create-channels`: Automatically create log and vouch channels (default: true)
  - `setup-roles`: Create default roles (scams 1-5, vouches 1-10) (default: true)
- **Example**: `/auto-setup`
- **What it does**:
  1. Creates `reputation-logs` channel (locked for regular users)
  2. Creates `vouch-search` channel for searches
  3. Creates scam roles 1-5 (Scams 1 through Scams 5)
  4. Creates vouch roles 1-10 (Vouches 1 through Vouches 10)
  5. Configures all channels in the database automatically

**Recommended first step**: Run `/auto-setup` after adding the bot to your server!

## Configuration Commands

### Channel Setup

**Set Log Channel**
- **Command**: `/set-log-channel #channel`
- **Purpose**: Configure where all reputation actions are logged
- **Requires**: Manage Roles permission
- **Example**: `/set-log-channel #reputation-logs`

**Remove Log Channel**
- **Command**: `/remove-log-channel`
- **Purpose**: Remove the log channel configuration
- **Requires**: Manage Roles permission

**Set Vouch Channel**
- **Command**: `/set-vouch-channel #channel`
- **Purpose**: Set a dedicated channel for reputation searches
- **Requires**: Manage Roles permission
- **Example**: `/set-vouch-channel #vouch-search`
- **Note**: The `/search` command works best in this channel

**Remove Vouch Channel**
- **Command**: `/remove-vouch-channel`
- **Purpose**: Remove the vouch channel configuration
- **Requires**: Manage Roles permission

### Role Setup (Optional)

The bot now creates roles automatically when needed. However, you can still batch-create roles:

**Setup Scam Roles**
- **Command**: `/setup-scam-roles max:5`
- **Purpose**: Create scam roles from 1 to max (e.g., "Scams 1" through "Scams 5")
- **Requires**: Manage Roles permission

**Setup Vouch Roles**
- **Command**: `/setup-vouch-roles max:10`
- **Purpose**: Create vouch roles from 1 to max (e.g., "Vouches 1" through "Vouches 10")
- **Requires**: Manage Roles permission

**Delete All Reputation Roles**
- **Command**: `/delete-rep-roles`
- **Purpose**: Remove all reputation roles created by the bot
- **Requires**: Manage Roles permission
- **Warning**: This deletes all roles from both Discord and the database

## Staff Management

### Adding Staff Members

**Add Staff**
- **Command**: `/staff-add @user`
- **Purpose**: Grant staff access to a user (allows them to use staff commands)
- **Requires**: Server owner, Manage Roles permission, or existing staff status
- **Note**: Staff can also have Manage Roles/Admin permission (checked first). Server owner always has access.

**Remove Staff**
- **Command**: `/staff-remove @user`
- **Purpose**: Remove staff access from a user
- **Requires**: Manage Roles permission

**List Staff**
- **Command**: `/staff-list`
- **Purpose**: View all staff members (ephemeral)
- **Requires**: Staff status (server owner is automatically staff)

### Staff Permission System

Staff commands can be accessed by:
1. **Server Owner**: Automatically detected from Discord (always has staff access)
2. **Discord Permissions**: Users with Manage Roles or Administrator permission
3. **Database Staff List**: Users added via `/staff-add`

Staff management commands (`/staff-add`, `/staff-remove`) can be used by:
- **Server Owner**: Automatically has access (detected from Discord)
- **Users with Manage Roles/Admin**: Can manage staff
- **Database Staff**: Can manage staff

The `isStaff()` and `canManageStaff()` functions check all methods, providing flexible access control. **The server owner is automatically granted staff management permissions - no configuration needed!**

## Staff Commands

### User Management

**Ban from Reputation System**
- **Command**: `/staff-ban @user [reason]`
- **Purpose**: Prevent a user from receiving scams/vouches
- **Requires**: Staff status
- **Example**: `/staff-ban @Spammer Advertising scams`
- **Note**: Banned users cannot receive new reports

**Unban from Reputation System**
- **Command**: `/staff-unban @user`
- **Purpose**: Allow a user to receive scams/vouches again
- **Requires**: Staff status

### Report Management

**View User Reports**
- **Command**: `/staff-view-reports @user [type:scam|vouch]`
- **Purpose**: View all reports for a user (optionally filtered by type)
- **Requires**: Staff status
- **Example**: `/staff-view-reports @JohnDoe type:scam`
- **Shows**: All reports with reasons, reporters, and dates

**Search Reports**
- **Command**: `/staff-search-reports [user:@user] [type:scam|vouch] [reported-by:@user]`
- **Purpose**: Search reports with multiple filters
- **Requires**: Staff status
- **Example**: `/staff-search-reports type:scam reported-by:@Moderator`
- **Limits**: Returns up to 50 results

### User Count Management

**Reset Counts**
- **Command**: `/staff-reset-counts @user [type:scam|vouch]`
- **Purpose**: Reset scam/vouch counts for a user
- **Requires**: Staff status
- **Options**:
  - No type: Resets both scam and vouch counts
  - `type:scam`: Resets only scam count
  - `type:vouch`: Resets only vouch count
- **Note**: Automatically updates roles after reset

### Statistics and Export

**View Statistics**
- **Command**: `/staff-statistics`
- **Purpose**: View guild statistics
- **Requires**: Staff status
- **Shows**:
  - Total users
  - Total reports (scam and vouch)
  - Banned users count
  - Staff members count

**Export Data**
- **Command**: `/staff-bulk-export [format:json|csv]`
- **Purpose**: Export all reputation data
- **Requires**: Staff status
- **Formats**:
  - JSON: Structured data format
  - CSV: Spreadsheet-compatible format
- **Includes**: All reports, statistics, and metadata
- **Note**: Ephemeral response with file attachment

## Troubleshooting

### Bot Not Responding

1. Check that the bot token is correct in `.env`
2. Verify the bot is online in Discord
3. Check console logs for errors
4. Ensure the bot has necessary permissions

### Database Errors

1. Verify PostgreSQL is running
2. Check `DATABASE_URL` format: `postgresql://user:password@host:port/database`
3. Ensure schema is initialized: `npm run db:init`
4. Run migration: `psql $DATABASE_URL -f database/migration.sql`
5. Check database logs for connection issues

### Permission Errors

1. Verify bot has "Manage Roles" permission
2. Ensure bot role is above roles it needs to assign
3. Check server permissions in Discord settings
4. Verify channel permissions allow bot to send messages

### Role Creation Issues

- **Roles not creating**: Check bot has Manage Roles permission and role is below bot's role
- **Wrong colors**: Colors are automatically assigned (red/orange for scams, green/teal for vouches)
- **Roles not updating**: Ensure bot role is high enough in hierarchy

### Command Not Found

- Commands may take up to 1 hour to sync globally
- Try restarting the bot
- Check that commands are properly registered in `src/index.ts`

### User Reports Not Working

- Check if user is banned: `/staff-view-reports @user`
- Verify channel permissions
- Check bot can send messages in the channel

## Database Management

### Schema Overview

- **guilds**: Server configuration (log channel, vouch channel)
- **users**: User reputation counts per guild
- **reports**: All scam/vouch reports
- **roles**: Role configuration with thresholds
- **staff_members**: Staff access list
- **banned_users**: Users banned from reputation system

### Manual Database Operations

**Backup Database**
```bash
pg_dump $DATABASE_URL > backup.sql
```

**Restore Database**
```bash
psql $DATABASE_URL < backup.sql
```

**Clear All Data (WARNING: Destructive)**
```sql
TRUNCATE reports, users, roles, staff_members, banned_users CASCADE;
```

### Common Queries

**Find Users with High Scam Counts**
```sql
SELECT user_id, scam_count FROM users WHERE guild_id = 'YOUR_GUILD_ID' ORDER BY scam_count DESC LIMIT 10;
```

**Find Recent Reports**
```sql
SELECT * FROM reports WHERE guild_id = 'YOUR_GUILD_ID' ORDER BY created_at DESC LIMIT 20;
```

**List Banned Users**
```sql
SELECT * FROM banned_users WHERE guild_id = 'YOUR_GUILD_ID';
```

## Security Considerations

1. **Staff Management**: Only trusted users should have staff access
2. **Banned Users**: Ban prevents new reports but doesn't remove existing ones
3. **Export Data**: Export files contain sensitive information - handle carefully
4. **Permissions**: Regular users can only add reports, not remove them
5. **Database**: Keep database credentials secure and never commit `.env` file

## Command Reference Quick Sheet

### Public Commands
- `/scam @user [reason]` - Report scammer
- `/vouch @user [reason]` - Vouch for user
- `/user-check @user` - Check reputation
- `/search @user` - Detailed search (vouch channel)

### Configuration (Manage Roles Required)
- `/auto-setup` - **Quick setup!** Automatically create channels and default roles
- `/set-log-channel #channel` - Set log channel
- `/remove-log-channel` - Remove log channel
- `/set-vouch-channel #channel` - Set vouch channel
- `/remove-vouch-channel` - Remove vouch channel
- `/setup-scam-roles max:N` - Batch create scam roles
- `/setup-vouch-roles max:N` - Batch create vouch roles
- `/delete-rep-roles` - Delete all reputation roles

### Staff Management (Manage Roles Required)
- `/staff-add @user` - Add staff member
- `/staff-remove @user` - Remove staff member
- `/staff-list` - List staff members

### Staff Operations (Staff Required)
- `/staff-ban @user [reason]` - Ban from reputation system
- `/staff-unban @user` - Unban from reputation system
- `/staff-view-reports @user [type]` - View user reports
- `/staff-reset-counts @user [type]` - Reset counts
- `/staff-statistics` - View statistics
- `/staff-bulk-export [format]` - Export data
- `/staff-search-reports [filters]` - Search reports

---

For issues or questions, check the console logs or review the database directly.
