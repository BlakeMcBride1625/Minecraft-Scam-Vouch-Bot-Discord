-- Scam:Vouch Discord Bot Database Schema
-- PostgreSQL schema for multi-server reputation system

-- Create guilds table for server configuration
CREATE TABLE IF NOT EXISTS guilds (
    guild_id VARCHAR(20) PRIMARY KEY NOT NULL,
    log_channel_id VARCHAR(20),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table for reputation counts per guild
CREATE TABLE IF NOT EXISTS users (
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    scam_count INTEGER DEFAULT 0 NOT NULL,
    vouch_count INTEGER DEFAULT 0 NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (guild_id, user_id),
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    CHECK (scam_count >= 0),
    CHECK (vouch_count >= 0)
);

-- Create reports table for all scam/vouch reports
CREATE TABLE IF NOT EXISTS reports (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    user_id VARCHAR(20) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('scam', 'vouch')),
    reason TEXT,
    reported_by VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE
);

-- Create roles table for role configuration per guild
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    guild_id VARCHAR(20) NOT NULL,
    type VARCHAR(10) NOT NULL CHECK (type IN ('scam', 'vouch')),
    threshold INTEGER NOT NULL,
    role_id VARCHAR(20) NOT NULL UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (guild_id) REFERENCES guilds(guild_id) ON DELETE CASCADE,
    CHECK (threshold >= 0),
    UNIQUE (guild_id, type, threshold)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_users_guild_id ON users(guild_id);
CREATE INDEX IF NOT EXISTS idx_users_user_id ON users(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_guild_id ON reports(guild_id);
CREATE INDEX IF NOT EXISTS idx_reports_user_id ON reports(user_id);
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(type);
CREATE INDEX IF NOT EXISTS idx_reports_created_at ON reports(created_at);
CREATE INDEX IF NOT EXISTS idx_roles_guild_id ON roles(guild_id);
CREATE INDEX IF NOT EXISTS idx_roles_type ON roles(type);
CREATE INDEX IF NOT EXISTS idx_roles_threshold ON roles(threshold);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_guilds_updated_at BEFORE UPDATE ON guilds
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
