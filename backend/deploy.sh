#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

# Define the Fly.io app name
FLY_APP_NAME="trade-simulation-game"

echo "Deploying backend to Fly.io..."

# Navigate to the backend directory
cd backend

# Deploy the application
# --build-only: Builds the image but does not deploy it
# --push: Pushes the built image to the Fly.io registry
# -a: Specifies the app name
# --image-label: Labels the image with a unique identifier (e.g., deployment-timestamp)
flyctl deploy --build-only --push -a "$FLY_APP_NAME" --image-label "deployment-$(date +%s)"

echo "Backend deployment process initiated. Check Fly.io dashboard for status."

# You might want to add a step here to wait for the deployment to complete
# or to get the deployed URL. For now, it just initiates the build and push.
