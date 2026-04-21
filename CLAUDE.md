# tmux-telegram-control

Control tmux sessions remotely via Telegram bot.

## Project Structure

- `src/` - Source code
  - `index.js` - Main bot logic
  - `cli.js` - CLI commands (init, start, stop, update, install-service)
  - `tmux-handler.js` - Tmux operations wrapper
  - `telegram-api.js` - Telegram API wrapper
  - `config.js` - Config management
- `bin/` - CLI entry point
- `config/` - Example config files

## Development

### Setup
```bash
npm install
```

### Testing locally
```bash
# Link for local testing
npm link

# Test commands
tmux-telegram init
tmux-telegram start
```

### Publishing

```bash
# Bump version
npm version patch|minor|major

# Publish to npm
npm publish

# Push to GitHub
git push origin main --tags
```

## Git Configuration

Deploy key is stored in `.ssh_deploy_key` (private key, not committed).

To use deploy key for push:
```bash
GIT_SSH_COMMAND="ssh -i .ssh_deploy_key" git push origin main
```

## Important Files

- `.env` - Contains deploy key path (not committed)
- `.ssh_deploy_key` - Private deploy key (not committed)
- `.ssh_deploy_key.pub` - Public key (add to GitHub Deploy Keys)

## Deployment Checklist

1. Make changes
2. Update CHANGELOG.md
3. Commit changes
4. Run `npm version patch`
5. Push to GitHub: `GIT_SSH_COMMAND="ssh -i .ssh_deploy_key -o StrictHostKeyChecking=no" git push origin main --tags`
6. Run `npm publish`

## Common Gotchas

- **npm publish**: Cannot republish same version after unpublish - must bump version
- **Sensitive files**: Always add SSH keys, .env to `.npmignore` before publishing
- **WSL tmux**: Sessions need explicit command (e.g., `tmux new-session -d -s name bash`)
