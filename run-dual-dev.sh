#!/bin/bash

# Development mode startup script for dual-port architecture
# This sets all required environment variables for local development

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Updated for Node.js 22
# Check if Node 22 is being used
NODE_VERSION=$(node -v 2>/dev/null | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" != "22" ]; then
    echo -e "${YELLOW}[WARNING]${NC} Node.js version 22 is recommended but version $NODE_VERSION is currently active"
    echo -e "${YELLOW}[INFO]${NC} This application has been migrated to Node.js 22"
    echo -e "${YELLOW}[INFO]${NC} To use Node.js 22: nvm use 22 && ./run-dual-dev.sh"
    # Allow running with other versions but show warning
fi
echo -e "${GREEN}[INFO]${NC} Using Node.js version $(node -v)"

# Default values
REBUILD_FRONTEND=false
REBUILD_POSTGRES=false
SHOW_HELP=false

# Parse command line arguments
for arg in "$@"; do
    case $arg in
        --rebuild-frontend)
            REBUILD_FRONTEND=true
            shift
            ;;
        --rebuild-postgres)
            REBUILD_POSTGRES=true
            shift
            ;;
        --rebuild)
            # Legacy support - rebuilds frontend only
            REBUILD_FRONTEND=true
            shift
            ;;
        --help|-h)
            SHOW_HELP=true
            shift
            ;;
        *)
            echo -e "${RED}[ERROR]${NC} Unknown option: $arg"
            echo "Use --help to see available options"
            exit 1
            ;;
    esac
done

# Show help if requested
if [ "$SHOW_HELP" = true ]; then
    echo -e "${BLUE}XSS Hunter Express Dual-Port Development Mode${NC}"
    echo ""
    echo "Usage: ./run-dual-dev.sh [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  --rebuild-frontend    Force rebuild the frontend (Vue.js application)"
    echo "  --rebuild-postgres    Drop and recreate the PostgreSQL database in Docker"
    echo "  --rebuild            Legacy option (same as --rebuild-frontend)"
    echo "  --help, -h           Show this help message"
    echo ""
    echo "Examples:"
    echo "  ./run-dual-dev.sh                           # Start normally"
    echo "  ./run-dual-dev.sh --rebuild-frontend        # Rebuild frontend and start"
    echo "  ./run-dual-dev.sh --rebuild-postgres        # Recreate database and start"
    echo "  ./run-dual-dev.sh --rebuild-frontend --rebuild-postgres  # Rebuild everything"
    echo ""
    echo "Dual-Port Architecture:"
    echo "  Payload Server: http://localhost:3000 (public XSS payloads)"
    echo "  Admin Server:   http://localhost:8443 (admin panel and API)"
    echo ""
    exit 0
fi

echo -e "${GREEN}[INFO]${NC} Starting XSS Hunter Express in dual-port mode..."

# Set environment variables for development
export DEV_MODE=true
export NODE_ENV=development
export CONTROL_PANEL_ENABLED=true
export DUAL_PORT_MODE=true

# Set ports
export PAYLOAD_PORT=3000
export ADMIN_PORT=8443

# Set hostname (default to localhost for dev)
export HOSTNAME=localhost:${PAYLOAD_PORT}

# Database configuration - matches run-dev.sh
export DATABASE_NAME=xsshunterexpress
export DATABASE_USER=xsshunterexpress
export DATABASE_PASSWORD=xsshunterexpress
export DATABASE_HOST=localhost  # Docker exposes port 5432 to localhost

# Application settings
export SCREENSHOTS_DIR=/tmp/xsshunter-screenshots
export MAX_PAYLOAD_UPLOAD_SIZE_MB=150

# Email settings (optional for dev - set to false to disable)
export SMTP_EMAIL_NOTIFICATIONS_ENABLED=false
# export SMTP_HOST=smtp.gmail.com
# export SMTP_PORT=465
# export SMTP_USE_TLS=true
# export SMTP_USERNAME=your-email@gmail.com
# export SMTP_PASSWORD=your-password
# export SMTP_FROM_EMAIL=your-email@gmail.com
# export SMTP_RECEIVER_EMAIL=your-email@gmail.com

# Discord settings (optional - comment out to disable)
# export DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/YOUR_WEBHOOK_ID/YOUR_WEBHOOK_TOKEN

# Docker container name
POSTGRES_CONTAINER="xsshunter-express_postgresdb_1"

# Handle PostgreSQL rebuild if requested
if [ "$REBUILD_POSTGRES" = true ]; then
    echo -e "${YELLOW}[INFO]${NC} Rebuilding PostgreSQL database in Docker container..."
    
    # Check if Docker is available
    if ! command -v docker &> /dev/null; then
        echo -e "${RED}[ERROR]${NC} Docker is not installed or not in PATH"
        exit 1
    fi
    
    # Check if the PostgreSQL container exists and is running
    if ! docker ps --format "table {{.Names}}" | grep -q "^$POSTGRES_CONTAINER$"; then
        echo -e "${YELLOW}[WARNING]${NC} PostgreSQL container '$POSTGRES_CONTAINER' is not running"
        
        # Check if container exists but is stopped
        if docker ps -a --format "table {{.Names}}" | grep -q "^$POSTGRES_CONTAINER$"; then
            echo -e "${YELLOW}[INFO]${NC} Starting existing PostgreSQL container..."
            docker start $POSTGRES_CONTAINER
            sleep 5
        else
            echo -e "${YELLOW}[INFO]${NC} PostgreSQL container not found. Starting it with docker-compose..."
            
            # Check if docker-compose.yml exists (parent directory)
            if [ ! -f "../docker-compose.yml" ]; then
                echo -e "${RED}[ERROR]${NC} docker-compose.yml not found in parent directory"
                echo -e "${YELLOW}[INFO]${NC} Please ensure docker-compose.yml exists in the xsshunter-express directory"
                exit 1
            fi
            
            # Start only the postgres service
            cd ..
            docker-compose up -d postgresdb
            if [ $? -ne 0 ]; then
                echo -e "${RED}[ERROR]${NC} Failed to start PostgreSQL container"
                exit 1
            fi
            cd - > /dev/null
            
            echo -e "${YELLOW}[INFO]${NC} Waiting for PostgreSQL to be ready..."
            sleep 10
        fi
    fi
    
    # Verify container is running
    if ! docker ps --format "table {{.Names}}" | grep -q "^$POSTGRES_CONTAINER$"; then
        echo -e "${RED}[ERROR]${NC} Failed to start PostgreSQL container"
        exit 1
    fi
    
    echo -e "${YELLOW}[ACTION]${NC} Terminating any existing connections to the database..."
    docker exec $POSTGRES_CONTAINER psql -U $DATABASE_USER -d postgres -c "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = '$DATABASE_NAME' AND pid <> pg_backend_pid();" 2>/dev/null || true
    
    echo -e "${YELLOW}[ACTION]${NC} Dropping existing database if it exists..."
    docker exec $POSTGRES_CONTAINER psql -U $DATABASE_USER -d postgres -c "DROP DATABASE IF EXISTS $DATABASE_NAME;" 2>/dev/null || true
    
    echo -e "${YELLOW}[ACTION]${NC} Creating new database..."
    docker exec $POSTGRES_CONTAINER psql -U $DATABASE_USER -d postgres -c "CREATE DATABASE $DATABASE_NAME OWNER $DATABASE_USER;"
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR]${NC} Failed to create database"
        echo -e "${YELLOW}[INFO]${NC} There might be an issue with the PostgreSQL container"
        exit 1
    fi
    
    echo -e "${YELLOW}[ACTION]${NC} Granting all privileges..."
    docker exec $POSTGRES_CONTAINER psql -U $DATABASE_USER -d postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DATABASE_NAME TO $DATABASE_USER;"
    
    echo -e "${GREEN}[SUCCESS]${NC} PostgreSQL database recreated successfully in Docker!"
fi

# Check if PostgreSQL Docker container is running
echo -e "${GREEN}[INFO]${NC} Checking PostgreSQL Docker container..."
if docker ps --format "table {{.Names}}" 2>/dev/null | grep -q "^$POSTGRES_CONTAINER$"; then
    echo -e "${GREEN}[SUCCESS]${NC} PostgreSQL container is running"
else
    echo -e "${YELLOW}[WARNING]${NC} PostgreSQL container not running. The app will use SQLite."
    echo -e "${YELLOW}[INFO]${NC} To use PostgreSQL, run: ${BLUE}docker-compose up -d postgresdb${NC}"
    
    # Try to start if Docker is available
    if command -v docker &> /dev/null; then
        # Try to start existing container
        if docker ps -a --format "table {{.Names}}" 2>/dev/null | grep -q "^$POSTGRES_CONTAINER$"; then
            echo -e "${YELLOW}[INFO]${NC} Attempting to start existing container..."
            docker start $POSTGRES_CONTAINER 2>/dev/null
            sleep 5
            
            if docker ps --format "table {{.Names}}" 2>/dev/null | grep -q "^$POSTGRES_CONTAINER$"; then
                echo -e "${GREEN}[SUCCESS]${NC} PostgreSQL container started successfully"
            else
                echo -e "${YELLOW}[WARNING]${NC} Could not start container. Using SQLite instead."
                unset DATABASE_NAME DATABASE_USER DATABASE_PASSWORD DATABASE_HOST
            fi
        else
            # Try docker-compose if available
            if [ -f "../docker-compose.yml" ]; then
                echo -e "${YELLOW}[INFO]${NC} Starting PostgreSQL with docker-compose..."
                cd ..
                docker-compose up -d postgresdb 2>/dev/null
                cd - > /dev/null
                sleep 10
                
                if docker ps --format "table {{.Names}}" 2>/dev/null | grep -q "^$POSTGRES_CONTAINER$"; then
                    echo -e "${GREEN}[SUCCESS]${NC} PostgreSQL container started successfully"
                else
                    echo -e "${YELLOW}[WARNING]${NC} Could not start container. Using SQLite instead."
                    unset DATABASE_NAME DATABASE_USER DATABASE_PASSWORD DATABASE_HOST
                fi
            else
                # Use SQLite
                unset DATABASE_NAME DATABASE_USER DATABASE_PASSWORD DATABASE_HOST
                echo -e "${GREEN}[INFO]${NC} Using SQLite database (database.sqlite)"
            fi
        fi
    else
        # Docker not available, use SQLite
        unset DATABASE_NAME DATABASE_USER DATABASE_PASSWORD DATABASE_HOST
        echo -e "${GREEN}[INFO]${NC} Using SQLite database (database.sqlite)"
    fi
fi

# Check if frontend dist directory exists
FRONTEND_DIR="front-end-vue3"
DIST_DIR="$FRONTEND_DIR/dist"

if [ ! -d "$DIST_DIR" ] || [ "$REBUILD_FRONTEND" = true ]; then
    if [ "$REBUILD_FRONTEND" = true ]; then
        echo -e "${YELLOW}[INFO]${NC} Rebuilding frontend as requested..."
        # Clean existing dist directory
        if [ -d "$DIST_DIR" ]; then
            echo -e "${YELLOW}[ACTION]${NC} Removing existing dist directory..."
            rm -rf "$DIST_DIR"
        fi
    else
        echo -e "${YELLOW}[WARNING]${NC} Frontend dist directory not found. Building frontend..."
    fi
    
    # Check if node_modules exists in frontend directory
    if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
        echo -e "${YELLOW}[INFO]${NC} Installing frontend dependencies..."
        cd "$FRONTEND_DIR"
        npm install
        if [ $? -ne 0 ]; then
            echo -e "${RED}[ERROR]${NC} Failed to install frontend dependencies"
            exit 1
        fi
        cd - > /dev/null
    fi
    
    # Build the frontend
    echo -e "${YELLOW}[INFO]${NC} Building frontend (this may take a minute)..."
    cd "$FRONTEND_DIR"
    npm run build
    if [ $? -ne 0 ]; then
        echo -e "${RED}[ERROR]${NC} Failed to build frontend"
        exit 1
    fi
    cd - > /dev/null
    echo -e "${GREEN}[SUCCESS]${NC} Frontend built successfully!"
fi

# Create screenshots directory if it doesn't exist
mkdir -p ${SCREENSHOTS_DIR}

# Test database connection if PostgreSQL is configured
if [ ! -z "$DATABASE_HOST" ]; then
    echo -e "${GREEN}[INFO]${NC} Testing database connection..."
    docker exec $POSTGRES_CONTAINER psql -U $DATABASE_USER -d $DATABASE_NAME -c "SELECT 1;" > /dev/null 2>&1
    if [ $? -ne 0 ]; then
        echo -e "${YELLOW}[WARNING]${NC} Cannot connect to database '$DATABASE_NAME'"
        echo -e "${YELLOW}[INFO]${NC} This is normal for first run - database will be created automatically"
        echo -e "${YELLOW}[INFO]${NC} If this persists, try: ${BLUE}./run-dual-dev.sh --rebuild-postgres${NC}"
    else
        echo -e "${GREEN}[SUCCESS]${NC} Database connection successful"
    fi
fi

echo ""
echo -e "${GREEN}[INFO]${NC} Environment Configuration:"
echo -e "  ${BLUE}Mode:${NC}         Dual-Port Development"
echo -e "  ${BLUE}Payload Port:${NC} ${PAYLOAD_PORT}"
echo -e "  ${BLUE}Admin Port:${NC}   ${ADMIN_PORT}"
if [ ! -z "$DATABASE_HOST" ]; then
    echo -e "  ${BLUE}Database:${NC}     ${DATABASE_NAME}@${DATABASE_HOST} (PostgreSQL)"
else
    echo -e "  ${BLUE}Database:${NC}     SQLite (database.sqlite)"
fi
echo -e "  ${BLUE}Screenshots:${NC}  ${SCREENSHOTS_DIR}"
echo ""
echo -e "  ${GREEN}Payload Server:${NC} http://localhost:${PAYLOAD_PORT}"
echo -e "  ${GREEN}Admin Server:${NC}   http://localhost:${ADMIN_PORT}"
echo -e "  ${GREEN}Admin Panel:${NC}    http://localhost:${ADMIN_PORT}/admin"
echo "========================================"
echo ""

echo -e "${GREEN}[INFO]${NC} Starting dual-port servers..."
echo -e "${YELLOW}[INFO]${NC} Press Ctrl+C to stop the servers"
echo ""
echo "----------------------------------------"
echo ""

# Change to the server-ng directory and start the dual server
cd "$(dirname "$0")"
node server-ng/dual-server.js