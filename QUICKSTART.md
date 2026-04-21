# ⚡ Quick Start Guide

## For Package Users

### 1. Install (30 seconds)

```bash
npm install -g tmux-telegram-control
```

### 2. Setup (2 minutes)

```bash
tmux-telegram init
```

You'll be asked:
- **Bot token**: Get from [@BotFather](https://t.me/botfather) - send `/newbot`
- **User ID**: Get from [@userinfobot](https://t.me/userinfobot) - send `/start`
- **Chat ID**: Optional, press Enter to skip

### 3. Start (5 seconds)

```bash
tmux-telegram start
```

### 4. Use (instant)

Open Telegram → Find your bot → Send `/start`

**Done!** 🎉

---

## For Package Authors (Publishing)

### 1. Prepare (5 minutes)

```bash
cd tmux-telegram-control

# Update package.json
nano package.json
# Change: author, repository URL

# Test locally
npm install
npm link
tmux-telegram --help
```

### 2. Create NPM Account (2 minutes)

- Go to https://www.npmjs.com/signup
- Verify email

### 3. Publish (1 minute)

```bash
npm login
npm publish
```

If name is taken:
```bash
npm publish --access public
```

### 4. Verify (30 seconds)

```bash
npm view tmux-telegram-control
```

**Published!** 🚀

---

## Common Commands

```bash
# Check status
tmux-telegram status

# Install as service
tmux-telegram install-service
sudo systemctl enable tmux-telegram
sudo systemctl start tmux-telegram

# View logs
sudo journalctl -u tmux-telegram -f

# Uninstall
npm uninstall -g tmux-telegram-control
```

---

## Telegram Commands

```
/ls          - List sessions
/new test    - Create session "test"
/attach test - Switch to "test"
/o           - View output
/watch       - Auto-refresh mode
/s ls -la    - Run command
/c           - Ctrl+C
```

---

## Troubleshooting

**Bot not responding?**
```bash
# Check if running
ps aux | grep tmux-telegram

# Check logs
sudo journalctl -u tmux-telegram -f

# Restart
sudo systemctl restart tmux-telegram
```

**"tmux: command not found"?**
```bash
sudo apt install tmux  # Ubuntu/Debian
brew install tmux      # macOS
```

**"Configuration not found"?**
```bash
tmux-telegram init
```

---

## Next Steps

- ⭐ Star on GitHub
- 📝 Report issues
- 🤝 Contribute
- 📢 Share with friends

**Enjoy!** 🎉
