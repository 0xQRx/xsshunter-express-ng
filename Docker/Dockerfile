FROM node:22

# Set up directory for the server
RUN mkdir /app/
WORKDIR /app/

# Copy front-end over and build
COPY front-end-vue3/ /app/front-end-vue3/
WORKDIR /app/front-end-vue3/
RUN npm ci
RUN npm run build

# Copy entire server directory
WORKDIR /app/
COPY server/ /app/server/
WORKDIR /app/server/
RUN npm ci

# Copy other necessary files  
COPY docker-entrypoint.sh /app/
RUN chmod +x /app/docker-entrypoint.sh

# Set working directory to server for execution
WORKDIR /app/server/

# Expose both HTTP and HTTPS ports
EXPOSE 80
EXPOSE 443

# Start the server
ENTRYPOINT ["/app/docker-entrypoint.sh"]