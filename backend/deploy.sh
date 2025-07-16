#!/bin/bash

echo "Deploying FastAPI backend to Fly.io..."

# Ensure flyctl is installed and logged in
if ! command -v flyctl &> /dev/null
then
    echo "flyctl could not be found. Please install it: https://fly.io/docs/hands-on/install-flyctl/"
    exit 1
fi

# Check if logged in
if ! flyctl auth whoami &> /dev/null
then
    echo "Not logged in to Fly.io. Please run 'flyctl auth login'."
    exit 1
fi

# Navigate to the backend directory
cd backend

# Deploy the application
flyctl deploy

echo "Deployment complete!"
