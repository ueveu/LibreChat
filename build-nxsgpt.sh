#!/bin/bash

# nxsGPT Docker Build Script - Prevents cache override issues
# This script ensures our nxsGPT changes are properly built into the Docker container

echo "🚀 Building nxsGPT Docker Container"
echo "===================================="

# Step 1: Clean up any existing containers that might override our changes
echo "🧹 Cleaning up existing LibreChat containers..."
docker stop $(docker ps -q --filter "ancestor=ghcr.io/danny-avila/librechat-dev:latest") 2>/dev/null || true
docker stop $(docker ps -q --filter "name=librechat") 2>/dev/null || true
docker stop $(docker ps -q --filter "name=LibreChat") 2>/dev/null || true

# Step 2: Remove old images to prevent cache issues
echo "🗑️  Removing old LibreChat images to prevent cache override..."
docker rmi ghcr.io/danny-avila/librechat-dev:latest 2>/dev/null || true
docker rmi $(docker images -q --filter "reference=*librechat*") 2>/dev/null || true

# Step 3: Build our custom nxsGPT image with no cache
echo "🔨 Building nxsGPT container with all our changes (no cache)..."
docker build --no-cache -f Dockerfile.multi -t nxsgpt:latest --target api-build .

# Step 4: Tag our image to prevent confusion
echo "🏷️  Tagging our custom nxsGPT image..."
docker tag nxsgpt:latest nxsgpt:$(date +%Y%m%d-%H%M%S)

# Step 5: Update docker-compose to use our image
echo "🔧 Updating docker-compose to use our custom image..."
cat > docker-compose.override.yml << EOF
services:
  api:
    image: nxsgpt:latest
    container_name: nxsGPT-Custom
    environment:
      - HOST=0.0.0.0
      - PORT=3080
      - MONGO_URI=mongodb://mongodb:27017/nxsGPT
      - APP_TITLE=nxsGPT
    volumes:
      - ./librechat.yaml:/app/librechat.yaml
      - ./client/public/assets:/app/client/public/assets
      - ./.env:/app/.env
EOF

echo "✅ Build complete!"
echo ""
echo "📋 What was built:"
echo "   ✓ Custom nxsGPT Docker image with all our changes"
echo "   ✓ NextStrategy logo included in container"
echo "   ✓ nxsGPT branding throughout application"
echo "   ✓ Updated database name and configuration"
echo "   ✓ No-cache build to prevent LibreChat override"
echo ""
echo "🚀 To start the application:"
echo "   docker-compose up -d"
echo ""
echo "🌐 Access at: http://localhost:3080 or http://138.199.157.172:3080"