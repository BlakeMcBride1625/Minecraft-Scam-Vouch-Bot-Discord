# Docker Setup Guide

This guide explains how to run the Discord bot using Docker and Docker Compose.

## Prerequisites

- Docker and Docker Compose installed
- Discord Bot Token and Client ID

## Quick Start

1. **Create a `.env` file** in the project root with the following variables:

```env
# Discord Bot Configuration (REQUIRED)
DISCORD_TOKEN=your_discord_bot_token_here
DISCORD_CLIENT_ID=your_discord_client_id_here

# PostgreSQL Database Configuration (Optional - defaults shown)
POSTGRES_USER=discordbot
POSTGRES_PASSWORD=changeme
POSTGRES_DB=discordbot
```

2. **Build and start the containers**:

```bash
docker-compose up -d
```

3. **View logs**:

```bash
# View all logs
docker-compose logs -f

# View bot logs only
docker-compose logs -f bot

# View database logs only
docker-compose logs -f postgres
```

## Port Configuration

- **PostgreSQL**: Mapped to port **7251** on the host (avoids conflicts with existing PostgreSQL instances)
  - Connection from host: `localhost:7251`
  - Connection from bot container: `postgres:5432`

## Services

### Bot Service
- Container name: `discord-bot`
- Builds from: `Dockerfile`
- Depends on: PostgreSQL service (waits for health check)

### PostgreSQL Service
- Container name: `discord-bot-db`
- Image: `postgres:15-alpine`
- Port: `7251:5432` (host:container)
- Data persistence: `postgres_data` volume
- Auto-initialization: Runs `schema.sql` and `migration.sql` on first start

## Useful Commands

```bash
# Start services
docker-compose up -d

# Stop services
docker-compose down

# Stop and remove volumes (⚠️ This deletes database data!)
docker-compose down -v

# Rebuild containers after code changes
docker-compose up -d --build

# View running containers
docker-compose ps

# Execute commands in bot container
docker-compose exec bot sh

# Execute commands in database container
docker-compose exec postgres psql -U discordbot -d discordbot

# Restart a specific service
docker-compose restart bot
docker-compose restart postgres
```

## Troubleshooting

### Bot won't start
- Check that `DISCORD_TOKEN` and `DISCORD_CLIENT_ID` are set in `.env`
- Check bot logs: `docker-compose logs bot`

### Database connection errors
- Ensure PostgreSQL container is healthy: `docker-compose ps`
- Check database logs: `docker-compose logs postgres`
- Verify database is ready before bot starts (health check should handle this)

### Port conflicts
- Port 7251 is used for PostgreSQL. If you need to change it, edit `docker-compose.yml`
- To check if port is in use: `ss -tuln | grep 7251`

### Rebuild after code changes
```bash
docker-compose up -d --build
```

## Environment Variables

| Variable | Required | Description | Default |
|----------|----------|-------------|---------|
| `DISCORD_TOKEN` | Yes | Discord bot token | - |
| `DISCORD_CLIENT_ID` | Yes | Discord application client ID | - |
| `POSTGRES_USER` | No | PostgreSQL username | `discordbot` |
| `POSTGRES_PASSWORD` | No | PostgreSQL password | `changeme` |
| `POSTGRES_DB` | No | PostgreSQL database name | `discordbot` |

## Data Persistence

Database data is stored in a Docker volume named `postgres_data`. This persists even if containers are stopped or removed.

To backup the database:
```bash
docker-compose exec postgres pg_dump -U discordbot discordbot > backup.sql
```

To restore from backup:
```bash
docker-compose exec -T postgres psql -U discordbot discordbot < backup.sql
```

## Production Considerations

1. **Change default database password** - Update `POSTGRES_PASSWORD` in `.env`
2. **Use secrets management** - Don't commit `.env` file to version control
3. **Monitor logs** - Set up log aggregation for production
4. **Backup strategy** - Regular database backups
5. **Resource limits** - Consider adding resource limits in `docker-compose.yml` for production
