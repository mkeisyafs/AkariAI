# Per-Guild Command Management

This bot now uses **per-guild command registration** instead of global commands. This allows admins to enable/disable commands per server, and disabled commands will completely disappear from Discord's command list.

## How It Works

1. **Guild-Specific Commands**: Each guild has its own command list registered with Discord
2. **Dynamic Sync**: When you enable/disable a command in the web dashboard, it syncs with Discord immediately
3. **No Global Commands**: Global commands are cleared to avoid conflicts

## Setup Instructions

### First-Time Setup

1. **Clear global commands** (run once):
   ```bash
   npm run clear-global
   ```

2. **Sync commands for each guild**:
   - Go to the web dashboard
   - Navigate to a guild's config page
   - Click the "Commands" tab
   - Click "Sync with Discord" button

### After Code Changes

If you add/modify commands in the code:

1. **Restart the bot** to load new command definitions
2. **Sync each guild** via the web dashboard Commands tab

## Usage

### Enable/Disable Commands

1. Go to web dashboard → Guild Config → Commands tab
2. Click the toggle button next to any command
3. Commands automatically sync with Discord
4. Disabled commands disappear from Discord's slash command menu

### Manual Sync

If commands get out of sync:
- Click the "Sync with Discord" button in the Commands tab
- This re-registers all enabled commands for that guild

## API Endpoints

### Get Available Commands
```
GET /api/guilds/:guildId/commands
```
Returns list of all bot commands with metadata.

### Sync Guild Commands
```
POST /api/guilds/:guildId/commands/sync
```
Syncs enabled commands with Discord for the specified guild.

## Technical Details

### Command Registration

- Uses `Routes.applicationGuildCommands()` instead of `Routes.applicationCommands()`
- Each guild maintains its own command list
- Commands are filtered based on `config.disabledCommands` array

### Files

- `src/utils/commandSync.js` - Command sync utilities
- `src/clear-global-commands.js` - Script to clear global commands
- `web/src/components/config/CommandsConfigForm.tsx` - UI component

### Performance

- Guild commands update instantly (no 1-hour cache like global commands)
- Each guild can have different command sets
- Sync operation takes ~1-2 seconds per guild

## Troubleshooting

**Commands not appearing:**
- Click "Sync with Discord" in the Commands tab
- Verify bot has `applications.commands` scope
- Check bot permissions in the guild

**Commands still showing after disable:**
- Wait a few seconds for Discord to update
- Try restarting Discord client
- Re-sync via the dashboard

**Sync fails:**
- Check bot token is valid
- Verify bot is in the guild
- Check console logs for errors
