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
- `scripts/` - Automation scripts

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

## Publishing Workflow

### Prerequisites
- GitHub Deploy Key: `.ssh_deploy_key` (private key, not committed)
- NPM Token: Stored in `~/.npmrc` (automatically used by npm)
- `.env` file contains `DEPLOY_KEY_PATH=.ssh_deploy_key`

### Manual Publishing

```bash
# 1. Make changes and test

# 2. Update CHANGELOG.md with new version changes

# 3. Commit changes
git add .
git commit -m "feat: description

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"

# 4. Bump version (creates git tag automatically)
npm version patch  # or minor/major

# 5. Push to GitHub with tags
GIT_SSH_COMMAND="ssh -i .ssh_deploy_key -o StrictHostKeyChecking=no" git push origin main --tags

# 6. Publish to npm (uses ~/.npmrc token)
npm publish

# 7. Update CHANGELOG if needed and push
git add CHANGELOG.md
git commit -m "docs: Update CHANGELOG for vX.X.X

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
GIT_SSH_COMMAND="ssh -i .ssh_deploy_key -o StrictHostKeyChecking=no" git push origin main
```

### Automated Publishing (Recommended)

Use the publish script:

```bash
# Patch version (1.0.0 -> 1.0.1)
npm run publish:patch

# Minor version (1.0.0 -> 1.1.0)
npm run publish:minor

# Major version (1.0.0 -> 2.0.0)
npm run publish:major
```

The script will:
1. Check for uncommitted changes
2. Prompt for CHANGELOG entry
3. Commit changes
4. Bump version
5. Push to GitHub with tags
6. Publish to npm
7. Confirm success

## Git Configuration

Deploy key is stored in `.ssh_deploy_key` (private key, not committed).

Public key added to: https://github.com/nlkcodenew/tmux-telegram-control/settings/keys

## Important Files

- `.env` - Contains deploy key path (not committed)
- `.ssh_deploy_key` - Private deploy key (not committed)
- `.ssh_deploy_key.pub` - Public key (add to GitHub Deploy Keys)
- `~/.npmrc` - NPM authentication token (global)

## Common Gotchas

- **npm publish**: Cannot republish same version after unpublish - must bump version
- **Sensitive files**: Always add SSH keys, .env to `.npmignore` before publishing
- **WSL tmux**: Sessions need explicit command (e.g., `tmux new-session -d -s name bash`)
- **Git push**: Always use deploy key via `GIT_SSH_COMMAND`
- **NPM token**: Stored globally in `~/.npmrc`, not in project
