# Publishing to NPM

## Prerequisites

1. NPM account (create at https://www.npmjs.com/signup)
2. Verify email
3. Login: `npm login`

## Before Publishing

### 1. Update package.json

```json
{
  "name": "tmux-telegram-control",
  "version": "1.0.0",
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/tmux-telegram-control.git"
  }
}
```

### 2. Test locally

```bash
# Install dependencies
npm install

# Test CLI
npm link
tmux-telegram --help

# Test init
tmux-telegram init

# Test start
tmux-telegram start
```

### 3. Check package contents

```bash
npm pack --dry-run
```

This shows what files will be included in the package.

## Publishing Steps

### 1. Login to NPM

```bash
npm login
```

Enter your username, password, and email.

### 2. Publish

```bash
# First time publish
npm publish

# If name is taken, use scoped package
npm publish --access public
```

### 3. Verify

```bash
# Check on NPM
npm view tmux-telegram-control

# Test installation
npm install -g tmux-telegram-control
tmux-telegram --version
```

## Updating Package

### 1. Update version

```bash
# Patch (1.0.0 → 1.0.1)
npm version patch

# Minor (1.0.0 → 1.1.0)
npm version minor

# Major (1.0.0 → 2.0.0)
npm version major
```

### 2. Publish update

```bash
npm publish
```

## Common Issues

### Package name already taken

Use scoped package:
```json
{
  "name": "@yourusername/tmux-telegram-control"
}
```

Then publish:
```bash
npm publish --access public
```

### Permission denied

Make sure you're logged in:
```bash
npm whoami
npm login
```

### Files not included

Check `.npmignore` and `package.json` `files` field.

## Post-Publish

1. Add badge to README:
```markdown
[![npm version](https://badge.fury.io/js/tmux-telegram-control.svg)](https://www.npmjs.com/package/tmux-telegram-control)
```

2. Create GitHub release
3. Update documentation
4. Announce on social media

## Unpublish (if needed)

```bash
# Unpublish specific version (within 72 hours)
npm unpublish tmux-telegram-control@1.0.0

# Unpublish entire package (within 72 hours)
npm unpublish tmux-telegram-control --force
```

**Note**: After 72 hours, you cannot unpublish. You can only deprecate:

```bash
npm deprecate tmux-telegram-control@1.0.0 "This version has bugs, use 1.0.1+"
```
