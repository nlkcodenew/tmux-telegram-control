# Development Guide

## Project Structure

```
tmux-telegram-control/
├── bin/
│   └── tmux-telegram.js       # CLI entry point
├── src/
│   ├── index.js               # Main bot server
│   ├── cli.js                 # CLI commands (init, start, install-service)
│   ├── config.js              # Config loader & dependency checker
│   ├── telegram-api.js        # Telegram API wrapper
│   └── tmux-handler.js        # Tmux operations
├── config/
│   └── config.example.json    # Config template
├── package.json
├── README.md
├── LICENSE
└── PUBLISHING.md
```

## Local Development

### 1. Clone & Install

```bash
git clone https://github.com/yourusername/tmux-telegram-control.git
cd tmux-telegram-control
npm install
```

### 2. Link for testing

```bash
npm link
```

Now you can run `tmux-telegram` globally.

### 3. Test commands

```bash
tmux-telegram --help
tmux-telegram init
tmux-telegram start
```

### 4. Unlink when done

```bash
npm unlink -g tmux-telegram-control
```

## Code Overview

### CLI Flow

1. User runs `tmux-telegram init`
2. `bin/tmux-telegram.js` → calls `src/cli.js:init()`
3. Interactive prompts collect bot token & user ID
4. Config saved to `~/.tmux-telegram/config.json`

### Bot Flow

1. User runs `tmux-telegram start`
2. `src/index.js` loads config
3. Checks dependencies (tmux, node)
4. Starts long polling
5. Handles messages & callbacks

### Message Handling

```
User sends /ls
  ↓
handleMessage()
  ↓
handleCommand('ls', ...)
  ↓
listSessionsCommand()
  ↓
tmux-handler.listSessions()
  ↓
telegram-api.sendMessage()
```

## Adding New Commands

### 1. Add to bot commands menu

In `src/index.js`:

```javascript
const commands = [
  // ...
  { command: 'mynew', description: 'My new command' }
];
```

### 2. Add handler

```javascript
async function handleCommand(command, args, chatId, userId) {
  switch (command) {
    // ...
    case 'mynew':
      await myNewCommand(chatId, userId, args);
      break;
  }
}

async function myNewCommand(chatId, userId, args) {
  // Your logic here
  await telegram.sendMessage(chatId, 'Hello from new command!');
}
```

## Testing

### Manual Testing

```bash
# Start bot
tmux-telegram start

# In Telegram, test:
/start
/ls
/new test
/attach test
/s echo hello
/o
/watch
/unwatch
```

### Check logs

```bash
# If running as service
sudo journalctl -u tmux-telegram -f

# If running in foreground
# Logs appear in terminal
```

## Debugging

### Enable verbose logging

In `src/index.js`, add:

```javascript
console.log(chalk.gray('[DEBUG]'), 'Message:', message);
```

### Check config

```bash
cat ~/.tmux-telegram/config.json
```

### Test tmux commands

```bash
tmux list-sessions
tmux capture-pane -p -t session_name
```

## Common Issues

### "tmux: command not found"

```bash
sudo apt install tmux  # Ubuntu/Debian
brew install tmux      # macOS
```

### "Configuration not found"

```bash
tmux-telegram init
```

### Bot not responding

1. Check bot token is correct
2. Check user ID is correct
3. Check bot is running: `ps aux | grep tmux-telegram`
4. Check logs: `sudo journalctl -u tmux-telegram -f`

## Contributing

1. Fork the repo
2. Create feature branch: `git checkout -b feature/my-feature`
3. Commit changes: `git commit -am 'Add feature'`
4. Push: `git push origin feature/my-feature`
5. Create Pull Request

## Release Process

1. Update version: `npm version patch|minor|major`
2. Update CHANGELOG.md
3. Commit: `git commit -am "Release v1.0.1"`
4. Tag: `git tag v1.0.1`
5. Push: `git push && git push --tags`
6. Publish: `npm publish`
7. Create GitHub release
