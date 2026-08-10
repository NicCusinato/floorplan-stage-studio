#!/bin/bash

echo "==================================================="
echo "FloorPlan Stage Studio - Mac Setup"
echo "==================================================="
echo "This script will install all necessary dependencies."
echo "You will be prompted for your Mac password."
echo ""

# Install Homebrew if not installed
if ! command -v brew &> /dev/null
then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Add brew to PATH for Apple Silicon Macs
    if [[ -d /opt/homebrew ]]; then
        echo 'eval "$(/opt/homebrew/bin/brew shellenv)"' >> ~/.zprofile
        eval "$(/opt/homebrew/bin/brew shellenv)"
    fi
else
    echo "Homebrew is already installed."
fi

echo ""
echo "Installing Node.js and Python..."
brew install node python

echo ""
echo "Installing Blender (this may take a while)..."
brew install --cask blender

echo ""
echo "Installing Python dependencies..."
pip3 install flask

echo ""
echo "Installing Next.js frontend dependencies..."
npm install
npm run build

echo ""
echo "==================================================="
echo "Setup Complete! 🎉"
echo "You can now run 'mac_start.command' to launch the app."
echo "==================================================="
