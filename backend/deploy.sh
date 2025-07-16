#!/bin/bash

echo "Deploying backend to Fly.io..."

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null; then
    echo "flyctl is not installed. Please install it first:"
    echo "https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Deploy to Fly.io
flyctl deploy --remote-only

echo "Backend deployment complete."
echo "Your backend is now running at: https://trade-simulation-game.fly.dev"
