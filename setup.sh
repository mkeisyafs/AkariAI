#!/bin/bash

echo "🤖 Discord Bot Setup Script"
echo "============================"
echo ""

if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js 18.x or higher."
    exit 1
fi

echo "✅ Node.js version: $(node --version)"
echo ""

if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo "✅ .env file created. Please edit it with your credentials."
    echo ""
else
    echo "✅ .env file already exists."
    echo ""
fi

echo "📦 Installing dependencies..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Failed to install dependencies."
    exit 1
fi

echo "✅ Dependencies installed successfully!"
echo ""

echo "⚠️  Before proceeding, make sure you have:"
echo "   1. Created a Discord bot at https://discord.com/developers/applications"
echo "   2. Enabled Message Content Intent and Server Members Intent"
echo "   3. Added DISCORD_TOKEN and CLIENT_ID to .env file"
echo "   4. MongoDB running (local or cloud)"
echo "   5. AI API key configured in .env"
echo ""

read -p "Have you completed the above steps? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "⚠️  Please complete the setup steps and run this script again."
    exit 0
fi

echo ""
echo "🚀 Deploying slash commands to Discord..."
npm run deploy

if [ $? -ne 0 ]; then
    echo "❌ Failed to deploy commands. Check your DISCORD_TOKEN and CLIENT_ID."
    exit 1
fi

echo ""
echo "✅ Setup complete!"
echo ""
echo "📚 Next steps:"
echo "   1. Invite the bot to your server using the OAuth2 URL"
echo "   2. Start the bot with: npm start"
echo "   3. Configure the bot in your server using /config commands"
echo ""
echo "🔗 Generate invite URL at:"
echo "   https://discord.com/developers/applications/$(grep CLIENT_ID .env | cut -d '=' -f2)/oauth2/url-generator"
echo ""
echo "📖 For more information, see README.md"
echo ""
