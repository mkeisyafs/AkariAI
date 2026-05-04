# Discord AI Bot

A full-featured Discord bot with AI chat capabilities, moderation system, verification, and welcome messages. Now powered by Prisma ORM and Supabase PostgreSQL.

## Features

### 🤖 AI Chat System
- Natural conversation with users
- Configurable AI provider (OpenAI, Claude, or any OpenAI-compatible API)
- Custom personality prompts
- **Knowledge Management** - Teach the bot custom information
- Response chance control
- Channel-specific responses
- Response cooldown system
- Response caching for efficiency

### 🛡️ Moderation System
- Automatic toxic message detection
- Configurable auto-moderation actions (warn, mute, kick, ban)
- Manual moderation commands
- Moderation logging
- Warning system with tracking
- User warning history

### ✅ Verification System
- Button-based verification
- Role assignment after verification
- Configurable verification channel
- Prevents unverified users from accessing server

### 👋 Welcome System
- Customizable welcome messages
- Embed support
- Variable support: `{user}`, `{server}`, `{memberCount}`
- Configurable welcome channel

### ⚙️ Admin Configuration
- Per-server settings
- AI configuration (URL, model, API key)
- Personality customization
- Response behavior control
- Moderation settings
- Welcome and verification setup

### 🗄️ Database
- **Prisma ORM** - Type-safe database access
- **Supabase PostgreSQL** - Reliable cloud database
- **Repository Pattern** - Clean data access layer
- **Migrations** - Version-controlled schema changes

## Installation

### Prerequisites
- Node.js 18.x or higher
- Supabase account (free tier available)
- Discord Bot Token
- AI API Key (OpenAI, Claude, or compatible)

### Setup Steps

1. **Clone and install dependencies:**
```bash
cd discord-bot
npm install
```

2. **Configure environment variables:**
```bash
cp .env.example .env
```

Edit `.env` with your credentials:
```env
DISCORD_TOKEN=your_discord_bot_token
CLIENT_ID=your_client_id
MONGODB_URI=mongodb://localhost:27017/discord-bot
DEFAULT_AI_BASE_URL=https://api.openai.com/v1
DEFAULT_AI_MODEL=gpt-3.5-turbo
DEFAULT_AI_API_KEY=your_api_key
```

3. **Deploy slash commands:**
```bash
npm run deploy
```

4. **Start the bot:**
```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

## Discord Bot Setup

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Create a new application
3. Go to "Bot" section and create a bot
4. Enable these Privileged Gateway Intents:
   - Server Members Intent
   - Message Content Intent
5. Copy the bot token to your `.env` file
6. Go to OAuth2 > URL Generator
7. Select scopes: `bot`, `applications.commands`
8. Select permissions:
   - Manage Roles
   - Kick Members
   - Ban Members
   - Moderate Members
   - Send Messages
   - Manage Messages
   - Embed Links
   - Read Message History
9. Use the generated URL to invite the bot to your server

## Commands

### Configuration Commands (Admin Only)

#### `/config`
- `view` - View current configuration
- `ai-url <url>` - Set AI API base URL
- `ai-model <model>` - Set AI model
- `ai-key <key>` - Set AI API key
- `personality <prompt>` - Set bot personality
- `response-chance <percentage>` - Set response chance (0-100)
- `cooldown <seconds>` - Set response cooldown
- `add-channel <channel>` - Add allowed channel
- `remove-channel <channel>` - Remove allowed channel

#### `/moderation`
- `view` - View moderation settings
- `toggle <enabled>` - Enable/disable auto-moderation
- `log-channel <channel>` - Set moderation log channel
- `auto-actions` - Configure automatic actions

#### `/welcome`
- `view` - View welcome settings
- `setup <channel> <message>` - Setup welcome system
- `toggle <enabled>` - Enable/disable welcome messages

#### `/verification`
- `view` - View verification settings
- `setup <role> <channel>` - Setup verification system
- `toggle <enabled>` - Enable/disable verification

### Moderation Commands (Admin/Moderator)

- `/warn <user> [reason]` - Warn a user
- `/mute <user> <duration> [reason]` - Timeout a user
- `/kick <user> [reason]` - Kick a user
- `/ban <user> [reason] [delete-days]` - Ban a user

### Utility Commands

- `/help` - Show all commands
- `/ping` - Check bot latency
- `/knowledge` - Manage AI knowledge base (see [Knowledge Feature Guide](KNOWLEDGE_FEATURE.md))
  - `add` - Add new knowledge entry
  - `get` - Retrieve knowledge entry
  - `list` - List all knowledge entries
  - `update` - Update existing entry
  - `delete` - Delete knowledge entry
  - `search` - Search knowledge base
  - `categories` - List all categories

## Database Schema

### GuildConfig
Stores per-server configuration:
- AI settings (URL, model, API key, personality)
- Response behavior (chance, cooldown, allowed channels)
- Moderation settings (enabled, actions, log channel)
- Verification settings (role, channel, method)
- Welcome settings (channel, message, embed)

### ModerationLog
Tracks all moderation actions:
- Guild ID
- User ID
- Moderator ID
- Action type
- Reason
- Timestamp

### UserWarning
Tracks user warnings:
- Guild ID
- User ID
- Warning history (moderator, reason, timestamp)

### Knowledge
Stores custom knowledge for AI responses:
- Guild ID
- Key (unique identifier)
- Value (information content)
- Category (for organization)
- Description
- Created by user ID
- Timestamps

## Project Structure

```
discord-bot/
├── src/
│   ├── commands/
│   │   ├── config/
│   │   │   ├── config.js
│   │   │   ├── moderation.js
│   │   │   ├── verification.js
│   │   │   └── welcome.js
│   │   ├── moderation/
│   │   │   ├── ban.js
│   │   │   ├── kick.js
│   │   │   ├── mute.js
│   │   │   └── warn.js
│   │   └── utility/
│   │       ├── help.js
│   │       ├── knowledge.js
│   │       └── ping.js
│   ├── database/
│   │   ├── connection.js
│   │   └── models/
│   │       ├── GuildConfig.js
│   │       ├── ModerationLog.js
│   │       └── UserWarning.js
│   ├── events/
│   │   ├── guildMemberAdd.js
│   │   ├── interactionCreate.js
│   │   ├── messageCreate.js
│   │   └── ready.js
│   ├── handlers/
│   │   ├── commandHandler.js
│   │   └── eventHandler.js
│   ├── services/
│   │   ├── aiService.js
│   │   ├── knowledgeService.js
│   │   └── moderationService.js
│   ├── utils/
│   │   ├── configManager.js
│   │   ├── permissions.js
│   │   └── verification.js
│   ├── deploy-commands.js
│   └── index.js
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

## AI Provider Configuration

### OpenAI
```
Base URL: https://api.openai.com/v1
Model: gpt-3.5-turbo or gpt-4
```

### Anthropic Claude
```
Base URL: https://api.anthropic.com/v1
Model: claude-3-sonnet-20240229
```

### Custom/Local
Any OpenAI-compatible API:
```
Base URL: http://localhost:1234/v1
Model: your-model-name
```

## Customization

### Knowledge Management
The bot includes a powerful knowledge management system that allows you to teach it custom information. See the [Knowledge Feature Guide](KNOWLEDGE_FEATURE.md) and [Knowledge Examples](KNOWLEDGE_EXAMPLES.md) for detailed usage.

Quick example:
```
/knowledge add key:server_rules value:"Be respectful and no spam" category:rules
```

The AI will automatically use this knowledge when responding to users.

### Adding Custom Personality Presets
Edit the personality via `/config personality` command with prompts like:
- "You are a friendly gaming bot who loves memes"
- "You are a professional assistant focused on productivity"
- "You are a creative writer who speaks in poetic language"

### Modifying Toxic Keywords
Edit `src/services/moderationService.js` and update the `toxicKeywords` array.

### Adding More Commands
1. Create a new file in `src/commands/<category>/`
2. Follow the command structure
3. Run `npm run deploy` to register the command

## Troubleshooting

### Bot not responding
- Check if Message Content Intent is enabled
- Verify bot has proper permissions
- Check allowed channels configuration

### Commands not showing
- Run `npm run deploy` again
- Wait a few minutes for Discord to update
- Check if CLIENT_ID is correct

### Database connection errors
- Verify MongoDB is running
- Check MONGODB_URI in .env
- Ensure network connectivity

### AI responses not working
- Verify API key is correct
- Check base URL format
- Test API endpoint manually
- Check response chance setting

## License

MIT License - feel free to modify and use for your own projects.

## Support

For issues and questions, please open an issue on the repository.

---

Built with ❤️ by enowX Labs
