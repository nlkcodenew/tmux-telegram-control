# 🤖 tmux-telegram-control

[![npm version](https://badge.fury.io/js/tmux-telegram-control.svg)](https://www.npmjs.com/package/tmux-telegram-control)
[![GitHub](https://img.shields.io/github/license/nlkcodenew/tmux-telegram-control)](https://github.com/nlkcodenew/tmux-telegram-control)

> Control your tmux sessions remotely via Telegram - view output, send commands, create sessions, all from your phone 📱

## 💡 The Idea

Ever wanted to check your long-running build, restart a crashed service, or monitor logs while you're away from your computer? 

**tmux-telegram-control** turns your Telegram into a remote terminal. No SSH, no VPN, no port forwarding - just a simple bot that connects your tmux sessions to your phone.

### Real-world use cases:

- 🏗️ **Check build progress** - "Is my Docker build done yet?"
- 🔥 **Emergency fixes** - Server down at 2 AM? Restart it from bed
- 📊 **Monitor logs** - Watch real-time output without opening laptop
- 🚀 **Deploy from anywhere** - Run deployment scripts from your phone
- 🧪 **Long-running tests** - Check test results during lunch
- 💻 **Multiple servers** - Control dev/staging/prod from one chat

## ✨ Features

### Core Features
- 📋 **List sessions** - See all running tmux sessions
- 👀 **View output** - Read terminal output (last 60 lines)
- ⌨️ **Send commands** - Type and execute commands remotely
- ➕ **Create sessions** - Start new tmux sessions on-the-fly
- 🔄 **Attach/switch** - Jump between different sessions
- 📺 **Watch mode** - Auto-refresh output every 2 seconds

### Smart Features
- 🎯 **Context-aware buttons** - Different actions based on terminal state
  - Waiting for input? → Yes/No buttons appear
  - Process running? → Ctrl+C button appears
  - At prompt? → Run/Watch buttons appear
- 🚨 **Error detection** - Automatically highlights errors in output
- 🔐 **User authentication** - Only authorized Telegram user can control
- 🎨 **Syntax highlighting** - Errors shown in red, easy to spot

### Control Keys
- `Ctrl+C` - Stop running process
- `Ctrl+D` - Send EOF / exit
- `Enter` - Send newline
- Custom commands via `/s <command>`

## 📦 Installation

### Prerequisites
- **Linux or macOS** (Windows users: use WSL)
- Node.js 14+ 
- tmux installed (`sudo apt install tmux` or `brew install tmux`)
- A Telegram bot token (get from [@BotFather](https://t.me/botfather))

### Windows Users
This package requires `tmux` which is not available on Windows. Use WSL (Windows Subsystem for Linux):
```bash
# Install WSL (PowerShell as Admin)
wsl --install

# Open WSL terminal, then:
sudo apt update
sudo apt install tmux nodejs npm
npm install -g tmux-telegram-control
```

### Quick Start

```bash
# Install globally
npm install -g tmux-telegram-control

# Initialize (interactive setup)
tmux-telegram init
# → Enter your Telegram bot token
# → Enter your Telegram user ID
# → Enter chat ID (optional, for group chats)

# Start the bot
tmux-telegram start

# Or install as system service (auto-start on boot)
tmux-telegram install-service
sudo systemctl enable tmux-telegram
sudo systemctl start tmux-telegram
```

## 🚀 Getting Started

### 1. Create a Telegram Bot

1. Open Telegram and search for [@BotFather](https://t.me/botfather)
2. Send `/newbot` and follow instructions
3. Copy the bot token (looks like `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Get Your User ID

1. Search for [@userinfobot](https://t.me/userinfobot) on Telegram
2. Start the bot - it will show your user ID (e.g., `8339012918`)

### 3. Initialize

```bash
tmux-telegram init
```

Enter your bot token and user ID when prompted. Config is saved to `~/.tmux-telegram/config.json`.

### 4. Start the Bot

```bash
tmux-telegram start
```

### 5. Open Telegram

Send `/start` to your bot. You should see:

```
🤖 Tmux Control Bot

Quick Commands:
/ls — List sessions
/new <name> — Create new session
/attach <name> — Select session
/o — View screen output
/watch — Realtime mode
...
```

## 📖 Usage Examples

### List all tmux sessions
```
/ls
```
Bot shows buttons for each session. Click to attach.

### Create a new session
```
/new myproject
```
Or click "➕ New Session" button in `/ls`

### View current output
```
/o
```
Shows last 60 lines of terminal output.

### Send a command
```
/s ls -la
```
Executes `ls -la` in current session.

### Watch mode (auto-refresh)
```
/watch
```
Output updates every 2 seconds. Use `/unwatch` to stop.

### Quick actions
When viewing output, bot shows context-aware buttons:
- **At prompt**: Run, Watch
- **Process running**: Ctrl+C, Watch  
- **Waiting for input**: Yes, No, Watch
- **Error detected**: Retry, Logs, Ctrl+C

## ⚙️ Configuration

Config file: `~/.tmux-telegram/config.json`

```json
{
  "telegram": {
    "botToken": "YOUR_BOT_TOKEN",
    "allowedUserId": 8339012918,
    "chatId": "-1234567890"  // Optional, for group chats
  },
  "tmux": {
    "outputLines": 60,  // Lines to show in /o command
    "watchInterval": 2000  // Watch mode refresh interval (ms)
  }
}
```

## 🔧 Commands Reference

| Command | Description |
|---------|-------------|
| `/start`, `/help` | Show help message |
| `/ls` | List all tmux sessions |
| `/new <name>` | Create new session |
| `/attach <name>` | Attach to session |
| `/kill <name>` | Delete a session |
| `/o` | View output (one-time) |
| `/watch` | Start realtime watch mode |
| `/unwatch` | Stop watch mode |
| `/s <text>` | Send command |
| `/e` | Press Enter |
| `/c` | Send Ctrl+C |
| `/d` | Send Ctrl+D |
| `/session` | Show current session |

## 🛡️ Security

- **User authentication**: Only your Telegram user ID can control the bot
- **No data storage**: Bot doesn't store any commands or output
- **Local only**: Bot runs on your machine, no cloud service
- **Token security**: Config file has `600` permissions (owner read/write only)

## 🐛 Troubleshooting

### Bot doesn't respond
```bash
# Check if service is running
sudo systemctl status tmux-telegram

# Check logs
sudo journalctl -u tmux-telegram -f
```

### "Session not found" error
```bash
# List actual tmux sessions
tmux list-sessions

# Make sure session name matches exactly
```

### Permission denied
```bash
# Make sure config file has correct permissions
chmod 600 ~/.tmux-telegram/config.json
```

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📄 License

MIT

## 🙏 Credits

Inspired by the need to check build progress without opening a laptop.

---

**Made with ❤️ for developers who work remotely**
