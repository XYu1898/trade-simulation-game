#!/bin/bash

# This script deploys the FastAPI backend to Fly.io

echo "Deploying FastAPI backend to Fly.io..."

# Ensure flyctl is installed and logged in
if ! command -v flyctl &> /dev/null
then
    echo "flyctl could not be found. Please install it: https://fly.io/docs/getting-started/installing-flyctl/"
    exit 1
fi

flyctl auth status > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo "Not logged into Fly.io. Please run 'flyctl auth login'."
    exit 1
fi

# Navigate to the backend directory
SCRIPT_DIR=$(dirname "$0")
cd "$SCRIPT_DIR"

# Deploy the application
flyctl deploy

echo "FastAPI backend deployment complete."
