#!/bin/bash

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "==================================================="
echo "  🚀 Starting FloorPlan Stage Studio (Docker) 🚀   "
echo "==================================================="
echo ""

# 1. Check if Docker is installed and running
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed."
    echo "Please download and install Docker Desktop for Mac:"
    echo "👉 https://www.docker.com/products/docker-desktop/"
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

if ! docker info &> /dev/null; then
    echo "❌ Error: Docker is installed but not running."
    echo "Please open the 'Docker' app from your Applications folder, wait for it to start, and try again."
    echo ""
    read -p "Press Enter to exit..."
    exit 1
fi

echo "✅ Docker is running!"

# 2. Check for .env file and prompt for keys if missing
if [ ! -f .env ]; then
    echo ""
    echo "⚠️  No .env file found. Let's set up your API keys."
    echo "Don't worry, these are saved locally on your computer."
    echo ""
    
    read -p "Enter your Gemini API Key (Required for analysis): " gemini_key
    read -p "Enter your FAL_KEY (Required for FLUX rendering): " fal_key
    
    # Create the .env file
    cp .env.example .env
    
    # Use sed to replace or append the keys
    # macOS sed requires an empty string argument with -i
    sed -i '' "s/GEMINI_API_KEY=\"\"/GEMINI_API_KEY=\"$gemini_key\"/" .env
    
    if grep -q "FAL_KEY=" .env; then
        sed -i '' "s/FAL_KEY=\"\"/FAL_KEY=\"$fal_key\"/" .env
    else
        echo "FAL_KEY=\"$fal_key\"" >> .env
    fi
    
    echo "✅ API keys saved to .env!"
fi

# 3. Start the application using Docker Compose
echo ""
echo "📦 Building and starting Docker containers..."
echo "This might take a minute or two on the first run."
docker compose up --build -d

echo ""
echo "==================================================="
echo "✨ Success! The app is starting up."
echo "==================================================="
echo "The web server will be available at: http://localhost:3000"
echo "Opening browser in 5 seconds..."

# Wait a few seconds for the Next.js server to come online
sleep 5

# Open the default browser on Mac
open http://localhost:3000

echo ""
echo "To stop the server later, open a terminal in this folder and run:"
echo "docker compose down"
echo ""
read -p "Press Enter to close this window..."
