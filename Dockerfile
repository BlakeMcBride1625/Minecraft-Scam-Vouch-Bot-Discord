# Use Node.js 18 LTS as base image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source files
COPY . .

# Build TypeScript
RUN npm run build

# Expose port (if needed for health checks or webhooks)
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Start the bot
CMD ["npm", "start"]
