#!/bin/bash

# Fix N8N URL Configuration Script
# This script updates the N8N URL configuration to use the correct external host

set -e

echo "🔧 Fixing N8N URL Configuration..."

# Get the current external IP (IPv4)
EXTERNAL_IP=$(curl -4 -s ifconfig.me 2>/dev/null || echo "138.199.157.172")
echo "🌐 Detected external IP: $EXTERNAL_IP"

# Update or add REACT_APP_N8N_URL in .env file
if [ -f .env ]; then
    # Remove existing REACT_APP_N8N_URL if present
    sed -i '/^REACT_APP_N8N_URL=/d' .env
    
    # Add the correct URL
    echo "REACT_APP_N8N_URL=http://$EXTERNAL_IP:8080" >> .env
    echo "✅ Updated REACT_APP_N8N_URL in .env file"
else
    echo "❌ Error: .env file not found!"
    exit 1
fi

# Restart the LibreChat API container to apply changes
echo "🔄 Restarting LibreChat API container..."
docker restart nxsGPT

echo "✅ N8N URL configuration fixed!"
echo "🌐 N8N is now accessible at: http://$EXTERNAL_IP:8080"
echo "🤖 LibreChat N8N button should now work correctly"

# Test the N8N proxy
echo "🧪 Testing N8N proxy accessibility..."
if curl -s -o /dev/null -w "%{http_code}" http://localhost:8080 | grep -q "200"; then
    echo "✅ N8N proxy is running correctly"
else
    echo "⚠️  Warning: N8N proxy may not be accessible"
fi