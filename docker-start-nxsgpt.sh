#!/bin/bash

# nxsGPT Quick Start Script - Ensures our changes are applied properly
echo "🚀 Starting nxsGPT with Docker"
echo "==============================="

# Stop any conflicting containers
echo "🛑 Stopping conflicting containers..."
docker stop $(docker ps -q --filter "name=librechat") 2>/dev/null || true
docker stop $(docker ps -q --filter "name=LibreChat") 2>/dev/null || true

# Use our environment file
echo "🔧 Using nxsGPT environment configuration..."
cp .env.docker .env

# Start with docker-compose and force rebuild
echo "🐳 Starting nxsGPT containers (forcing rebuild)..."
/tmp/docker-compose up -d --build --force-recreate

# Wait a moment for containers to start
echo "⏳ Waiting for services to start..."
sleep 10

# Check status
echo "📊 Container status:"
docker ps --filter "name=nxs" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "✅ nxsGPT should be running!"
echo "🌐 Access at:"
echo "   Local: http://localhost:3080"
echo "   Server: http://138.199.157.172:3080"
echo ""
echo "📋 Features included:"
echo "   ✓ nxsGPT branding"
echo "   ✓ NextStrategy logo on login/register"
echo "   ✓ Custom database name: nxsGPT" 
echo "   ✓ Registration with allowed domains"
echo ""
echo "🔍 To check logs: docker logs nxsGPT"