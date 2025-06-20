#!/bin/bash

# nxsGPT Deployment Script for Production Server
# This script helps deploy the nxsGPT application with NextStrategy logo to a production server

echo "🚀 nxsGPT Deployment Script"
echo "============================"

# Step 1: Build the frontend with all our changes
echo "📦 Building frontend with nxsGPT branding and NextStrategy logo..."
npm run frontend

# Step 2: Stop any existing containers
echo "🛑 Stopping existing Docker containers..."
docker stop $(docker ps -q --filter "name=nxsGPT") 2>/dev/null || true

# Step 3: Update environment for production
echo "🔧 Configuring for production deployment..."
export HOST=0.0.0.0
export PORT=3080
export DOMAIN_CLIENT=http://138.199.157.172
export DOMAIN_SERVER=http://138.199.157.172

# Step 4: Start with Docker Compose (if available)
echo "🐳 Starting nxsGPT application..."
if command -v docker-compose &> /dev/null; then
    docker-compose -f deploy-compose.yml up -d
else
    echo "⚠️  Docker Compose not available. Starting manually..."
    # Start MongoDB
    docker run -d --name nxsgpt-mongodb-prod -p 27017:27017 mongo:latest mongod --noauth
    
    # Start the backend
    npm run backend:dev
fi

echo "✅ Deployment complete!"
echo "🌐 Access your nxsGPT application at: http://138.199.157.172/"
echo ""
echo "📋 Features deployed:"
echo "   ✓ nxsGPT branding throughout application"
echo "   ✓ NextStrategy logo on login/register pages" 
echo "   ✓ Fixed registration with allowed domains"
echo "   ✓ MongoDB database name: nxsGPT"
echo "   ✓ Custom footer branding"
echo ""
echo "🔑 Default admin user created during first registration"