#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "Deploying backend to Fly.io..."

# Navigate to the backend directory
cd backend

# Ensure flyctl is authenticated
echo "Checking Fly.io authentication..."
flyctl auth whoami

# Deploy the application
echo "Running flyctl deploy..."
flyctl deploy

echo "Backend deployment complete!"

# Navigate back to the root directory (optional, depending on your workflow)
cd ..
