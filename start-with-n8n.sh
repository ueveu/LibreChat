#!/bin/bash

# LibreChat with N8N Integration Startup Script
# This script starts LibreChat along with the full N8N automation stack

set -e

echo "🚀 Starting LibreChat with N8N Integration..."

# Check if .env file exists
if [ ! -f .env ]; then
    echo "⚠️  Warning: .env file not found. Creating from .env.example..."
    if [ -f .env.example ]; then
        cp .env.example .env
        echo "✅ Created .env file from .env.example"
        echo "🔧 Please edit .env file with your configuration before running again"
        exit 1
    else
        echo "❌ Error: Neither .env nor .env.example found!"
        exit 1
    fi
fi

# Add N8N specific environment variables if not present
echo "🔧 Configuring N8N environment variables..."
if ! grep -q "N8N_POSTGRES_USER" .env; then
    echo "" >> .env
    echo "# N8N Configuration" >> .env
    echo "N8N_POSTGRES_USER=n8n" >> .env
    echo "N8N_POSTGRES_PASSWORD=n8npassword" >> .env
    echo "N8N_POSTGRES_DB=n8n" >> .env
    echo "N8N_ENCRYPTION_KEY=myEncryptionKey" >> .env
    echo "N8N_JWT_SECRET=myJwtSecret" >> .env
    echo "REACT_APP_N8N_URL=http://localhost:5678" >> .env
    echo "✅ Added N8N configuration to .env"
fi

# Ensure UID and GID are set
if ! grep -q "UID=" .env; then
    echo "UID=$(id -u)" >> .env
    echo "GID=$(id -g)" >> .env
    echo "✅ Added UID/GID to .env"
fi

# Create necessary directories
echo "📁 Creating necessary directories..."
mkdir -p n8n/demo-data shared logs uploads images

# Check if Docker and Docker Compose are available
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed or not in PATH"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo "❌ Error: Docker Compose is not installed or not in PATH"
    exit 1
fi

# Detect Docker Compose command
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo "🐳 Using Docker Compose command: $DOCKER_COMPOSE"

# Function to handle cleanup on script exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    $DOCKER_COMPOSE -f docker-compose.yml -f docker-compose.n8n.yml down
}
trap cleanup EXIT

# Build the services
echo "🔨 Building LibreChat..."
$DOCKER_COMPOSE -f docker-compose.yml -f docker-compose.n8n.yml build

# Start the services
echo "🚀 Starting all services (LibreChat + N8N + Ollama + Qdrant + PostgreSQL)..."

# Choose profile based on GPU availability
if lspci | grep -i nvidia &> /dev/null; then
    echo "🎮 NVIDIA GPU detected, using GPU profile..."
    PROFILE="n8n-gpu-nvidia"
else
    echo "💻 No GPU detected, using CPU profile..."
    PROFILE="n8n-cpu"
fi

$DOCKER_COMPOSE -f docker-compose.yml -f docker-compose.n8n.yml --profile $PROFILE up

echo ""
echo "🎉 Services are now running!"
echo ""
echo "📋 Access URLs:"
echo "   🤖 LibreChat (nxsGPT): http://localhost:${PORT:-3080}"
echo "   🔄 N8N Workflows:      http://localhost:5678"
echo "   🗄️  Qdrant Vector DB:   http://localhost:6333"
echo "   🦙 Ollama API:          http://localhost:11434"
echo ""
echo "📖 Getting Started:"
echo "   1. Open LibreChat and look for the N8N button (⚡) in the navigation"
echo "   2. Click it to access N8N workflows in a modal/new tab"
echo "   3. Create your first automation workflow!"
echo ""
echo "🛑 To stop all services, press Ctrl+C"
echo ""