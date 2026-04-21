#!/bin/bash
set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get version type (patch, minor, major)
VERSION_TYPE=${1:-patch}

if [[ ! "$VERSION_TYPE" =~ ^(patch|minor|major)$ ]]; then
  echo -e "${RED}❌ Invalid version type: $VERSION_TYPE${NC}"
  echo "Usage: $0 [patch|minor|major]"
  exit 1
fi

echo -e "${BLUE}🚀 Publishing tmux-telegram-control (${VERSION_TYPE})${NC}\n"

# Check for uncommitted changes
if [[ -n $(git status -s) ]]; then
  echo -e "${YELLOW}⚠️  You have uncommitted changes:${NC}"
  git status -s
  echo ""
  read -p "Do you want to commit them? (y/n) " -n 1 -r
  echo ""
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${BLUE}📝 Enter commit message:${NC}"
    read -r COMMIT_MSG
    git add .
    git commit -m "$COMMIT_MSG

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
    echo -e "${GREEN}✅ Changes committed${NC}\n"
  else
    echo -e "${RED}❌ Aborted. Please commit or stash your changes first.${NC}"
    exit 1
  fi
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
echo -e "${BLUE}📦 Current version: ${CURRENT_VERSION}${NC}"

# Bump version
echo -e "${BLUE}⬆️  Bumping ${VERSION_TYPE} version...${NC}"
NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version)
echo -e "${GREEN}✅ New version: ${NEW_VERSION}${NC}\n"

# Update CHANGELOG
echo -e "${YELLOW}📝 Please update CHANGELOG.md with changes for ${NEW_VERSION}${NC}"
echo -e "${YELLOW}Press Enter when done...${NC}"
read

# Commit version bump
git add package.json package-lock.json
git commit -m "chore: Bump version to ${NEW_VERSION}

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"

# Create git tag
git tag "${NEW_VERSION}"

# Push to GitHub
echo -e "${BLUE}📤 Pushing to GitHub...${NC}"
GIT_SSH_COMMAND="ssh -i .ssh_deploy_key -o StrictHostKeyChecking=no" git push origin main --tags
echo -e "${GREEN}✅ Pushed to GitHub${NC}\n"

# Publish to npm
echo -e "${BLUE}📦 Publishing to npm...${NC}"
npm publish
echo -e "${GREEN}✅ Published to npm${NC}\n"

# Check if CHANGELOG was updated
if git diff --name-only HEAD~1 | grep -q "CHANGELOG.md"; then
  echo -e "${GREEN}✅ CHANGELOG.md already updated${NC}"
else
  echo -e "${YELLOW}⚠️  Don't forget to update CHANGELOG.md and push again!${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Successfully published ${NEW_VERSION}!${NC}"
echo -e "${BLUE}📦 NPM: https://www.npmjs.com/package/tmux-telegram-control${NC}"
echo -e "${BLUE}🐙 GitHub: https://github.com/nlkcodenew/tmux-telegram-control${NC}"
