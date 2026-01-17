-- Migration: Add vouch channel, staff members, and banned users
-- Run this after the initial schema.sql

-- Add vouch_channel_id to guilds table
ALTER TABLE guilds ADD COLUMN IF NOT EXISTS vouch_channel_id VARCHAR(20);

-- Add staff_members table
CREATE TABLE IF NOT EXISTS staff_members (
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    added_by VARCHAR(20) NOT NULL,
    added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_staff_members_guild_id ON staff_members(guild_id);
CREATE INDEX IF NOT EXISTS idx_staff_members_user_id ON staff_members(user_id);

-- Add banned_users table
CREATE TABLE IF NOT EXISTS banned_users (
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    reason TEXT,
    banned_by VARCHAR(20) NOT NULL,
    banned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_banned_users_guild_id ON banned_users(guild_id);
CREATE INDEX IF NOT EXISTS idx_banned_users_user_id ON banned_users(user_id);
