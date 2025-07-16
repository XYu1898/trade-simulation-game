#!/bin/bash

# Ensure flyctl is installed and logged in
if ! command -v flyctl &> /dev/null
then
    echo "flyctl could not be found. Please install it: https://fly.io/docs/getting-started/installing-flyctl/"
    exit 1
fi

flyctl auth login

# Define your Fly.io app name
APP_NAME="trade-simulation-game" # Replace with your desired app name

echo "Deploying backend to Fly.io app: $APP_NAME"

# Deploy the application
# --remote-only: Build on Fly.io builder, not locally
# --push: Push the image to the Fly.io registry
# -a $APP_NAME: Specify the app name
flyctl deploy --remote-only --push -a $APP_NAME

echo "Deployment complete. Check your app status with: flyctl status -a $APP_NAME"
echo "You can find your app's URL in the Fly.io dashboard or by running 'flyctl info -a $APP_NAME'"
