FROM node:22-alpine

# Install bash for entrypoint script
RUN apk add --no-cache bash

# Set up working directory
WORKDIR /app

# Copy entire project
# Build context is parent directory (set in docker-compose.yml)
COPY front-end-vue3 /app/front-end-vue3
COPY server-ng /app/server-ng
COPY Docker/docker-entrypoint.sh /app/docker-entrypoint.sh
COPY Docker/patch-greenlock.js /app/Docker/patch-greenlock.js

# Build frontend
WORKDIR /app/front-end-vue3
RUN npm ci
RUN npm run build

# Install server dependencies
WORKDIR /app/server-ng
RUN npm ci --production

# Create necessary directories
RUN mkdir -p /app/greenlock.d \
    && mkdir -p /app/server-ng/payload-fire-images

# Make entrypoint executable
RUN chmod +x /app/docker-entrypoint.sh

# Set working directory for execution
WORKDIR /app/server-ng

# Expose ports
# 80/443 for payload server (auto-SSL via Greenlock)
# 8443 for admin panel (should be firewalled)
EXPOSE 80
EXPOSE 443
EXPOSE 8443

# Start the application
ENTRYPOINT ["/app/docker-entrypoint.sh"]