#!/bin/bash
# AI Coffee Chat Launcher
# This script launches the development server

cd /home/user/ai-coffee-chat

# Check if node_modules exists, if not run npm install
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the development server
npm run dev
