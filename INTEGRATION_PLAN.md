# Integration Plan: Persistent State & Smart Polling

## Overview

This document outlines the plan to integrate two new features from the Python implementation into the Node.js `tmux-telegram-control` package:

1. **Persistent State Management** - Save/restore session and watch state across restarts
2. **Smart Polling** - Only update watch messages when output changes (reduce CPU/API calls)

## Current Architecture Analysis

### Existing State Management (index.js)
```javascript
// In-memory only - lost on restart
const currentSessions = {};      // {userId: sessionName}
const watchingSessions = {};     // {userId: {session, messageId, chatId, stop}}
const pendingNewSession = {};    // {userId: true/false}
```

### Existing Watch Implementation (index.js:502-549)
```javascript
async function startWatchLoop(userId) {
  let lastOutput = '';
  while (watchingSessions[userId] && !watchingSessions[userId].stop) {
    const output = getOutput(session, config.tmux.outputLines);
    
    // ✅ Already has smart polling!
    if (output === lastOutput) {
      await sleep(config.tmux.watchInterval);
      continue;
    }
    
    lastOutput = output;
    // Update message...
  }
}
```

**Key Finding:** Smart polling is already implemented! Only persistent state needs to be added.

## Implementation Plan

### Phase 1: Add State Persistence Module

Create `src/state-manager.js`:

```javascript
const fs = require('fs');
const path = require('path');
const os = require('os');

const STATE_DIR = path.join(os.homedir(), '.tmux-telegram');
const STATE_FILE = path.join(STATE_DIR, 'state.json');

class StateManager {
  constructor() {
    this.ensureStateDir();
  }

  ensureStateDir() {
    if (!fs.existsSync(STATE_DIR)) {
      fs.mkdirSync(STATE_DIR, { recursive: true, mode: 0o700 });
    }
  }

  /**
   * Save current state to disk
   */
  save(currentSessions, watchingSessions) {
    const state = {
      current_sessions: currentSessions,
      watching_sessions: Object.fromEntries(
        Object.entries(watchingSessions).map(([uid, info]) => [
          uid,
          {
            session: info.session,
            chat_id: info.chatId,
            message_id: info.messageId
          }
        ])
      ),
      timestamp: new Date().toISOString()
    };

    try {
      fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), { mode: 0o600 });
      return true;
    } catch (err) {
      console.error('Failed to save state:', err.message);
      return false;
    }
  }

  /**
   * Load state from disk
   */
  load() {
    if (!fs.existsSync(STATE_FILE)) {
      return { currentSessions: {}, watchingToResume: {} };
    }

    try {
      const data = fs.readFileSync(STATE_FILE, 'utf8');
      const state = JSON.parse(data);

      const currentSessions = {};
      for (const [uid, session] of Object.entries(state.current_sessions || {})) {
        currentSessions[parseInt(uid)] = session;
      }

      const watchingToResume = {};
      for (const [uid, info] of Object.entries(state.watching_sessions || {})) {
        watchingToResume[parseInt(uid)] = {
          session: info.session,
          chatId: info.chat_id,
          messageId: info.message_id
        };
      }

      console.log(`✅ Loaded state: ${Object.keys(currentSessions).length} sessions, ${Object.keys(watchingToResume).length} to resume`);
      return { currentSessions, watchingToResume };
    } catch (err) {
      console.error('Failed to load state:', err.message);
      return { currentSessions: {}, watchingToResume: {} };
    }
  }

  /**
   * Clear state file
   */
  clear() {
    if (fs.existsSync(STATE_FILE)) {
      fs.unlinkSync(STATE_FILE);
    }
  }
}

module.exports = StateManager;
```

### Phase 2: Modify index.js

#### 2.1 Import StateManager

```javascript
const StateManager = require('./state-manager');
let stateManager;
```

#### 2.2 Load State on Init

```javascript
async function init() {
  console.log(chalk.blue.bold('🚀 tmux-telegram-control starting...\n'));

  // Check dependencies
  checkDependencies();

  // Load config
  config = loadConfig();
  telegram = new TelegramAPI(config.telegram.botToken);

  // Initialize state manager
  stateManager = new StateManager();
  const { currentSessions: loadedSessions, watchingToResume } = stateManager.load();
  
  // Restore current sessions
  Object.assign(currentSessions, loadedSessions);

  console.log(chalk.green('✅ Configuration loaded'));
  console.log(chalk.gray('   Bot token:'), config.telegram.botToken.substring(0, 20) + '...');
  console.log(chalk.gray('   Allowed user:'), config.telegram.allowedUserId);
  console.log('');

  // Set bot commands
  await setBotCommands();

  // Resume watch sessions
  await resumeWatchSessions(watchingToResume);

  console.log(chalk.green('🎯 Bot is listening for messages...\n'));

  // Start polling
  startPolling();
}
```

#### 2.3 Add Resume Watch Function

```javascript
/**
 * Resume watch sessions from saved state
 */
async function resumeWatchSessions(watchingToResume) {
  const { sessionExists } = require('./tmux-handler');

  for (const [userId, info] of Object.entries(watchingToResume)) {
    const uid = parseInt(userId);
    
    if (!sessionExists(info.session)) {
      console.log(chalk.yellow('⚠️'), `Cannot resume watch for ${info.session} - session not found`);
      continue;
    }

    // Send initial watch message
    const output = getOutput(info.session, config.tmux.outputLines);
    const truncated = output.length > 3800 ? '...\n' + output.slice(-3800) : output;

    const result = await telegram.sendMessage(
      info.chatId,
      `📺 *Watching: ${info.session}* (resumed)\n\`\`\`\n${truncated}\n\`\`\``
    );

    if (result.ok) {
      watchingSessions[uid] = {
        session: info.session,
        messageId: result.result.message_id,
        chatId: info.chatId,
        stop: false
      };

      console.log(chalk.green('✅'), `Resumed watch: ${info.session} for user ${uid}`);
      startWatchLoop(uid);
      
      // Save updated state with new message_id
      stateManager.save(currentSessions, watchingSessions);
    }
  }
}
```

#### 2.4 Add Auto-Save Calls

Add `stateManager.save(currentSessions, watchingSessions)` after:

1. **Attach session** (line 357, 693)
2. **Create session** (line 334)
3. **Kill session** (line 388, 712)
4. **Start watch** (line 478)
5. **Stop watch** (line 494)

Example for attach:
```javascript
async function attachCommand(chatId, userId, args) {
  // ... existing code ...
  
  currentSessions[userId] = sessionName;
  stateManager.save(currentSessions, watchingSessions); // ← ADD THIS

  const output = getOutput(sessionName, config.tmux.outputLines);
  // ... rest of code ...
}
```

### Phase 3: Update Configuration

Add to `config/config.example.json`:

```json
{
  "telegram": {
    "botToken": "YOUR_BOT_TOKEN",
    "allowedUserId": 123456789
  },
  "tmux": {
    "outputLines": 60,
    "watchInterval": 2000
  },
  "state": {
    "enabled": true,
    "autoSave": true
  }
}
```

### Phase 4: Add CLI Command

Add to `src/cli.js`:

```javascript
program
  .command('clear-state')
  .description('Clear saved state (sessions and watch)')
  .action(() => {
    const StateManager = require('./state-manager');
    const stateManager = new StateManager();
    stateManager.clear();
    console.log(chalk.green('✅ State cleared'));
  });
```

## Testing Plan

### Test 1: State Persistence
```bash
# 1. Start bot
tmux-telegram start

# 2. Via Telegram: attach to session
/attach mywork

# 3. Check state file
cat ~/.tmux-telegram/state.json

# 4. Restart bot
tmux-telegram stop
tmux-telegram start

# 5. Verify: should still be attached to mywork
/session
```

### Test 2: Watch Resume
```bash
# 1. Start watch mode
/watch

# 2. Check state file has watching_sessions
cat ~/.tmux-telegram/state.json | jq .watching_sessions

# 3. Restart bot
tmux-telegram stop
tmux-telegram start

# 4. Verify: watch should resume with new message
```

### Test 3: Smart Polling (Already Works)
```bash
# 1. Start watch
/watch

# 2. Monitor CPU usage
top -p $(pgrep -f tmux-telegram)

# 3. Verify: CPU should be low when no output changes
# 4. Send command: /s echo test
# 5. Verify: message updates immediately
```

## Migration Guide

### For Existing Users

No breaking changes. State persistence is automatic:

1. Update package: `npm install -g tmux-telegram-control@latest`
2. Restart bot: `tmux-telegram stop && tmux-telegram start`
3. State will be saved to `~/.tmux-telegram/state.json`

### Rollback

If issues occur:
```bash
# Clear state and restart
tmux-telegram clear-state
tmux-telegram stop
tmux-telegram start
```

## Performance Impact

### Before (Current)
- Restart → lose all session state
- Watch mode → already optimized (smart polling exists)

### After (With Persistence)
- Restart → auto-restore sessions and watch
- Disk I/O: ~1-2ms per save (negligible)
- Memory: +~1KB for state file content

## Security Considerations

1. **State file permissions**: 0600 (owner read/write only)
2. **State directory permissions**: 0700 (owner access only)
3. **No sensitive data**: Only stores session names, user IDs, chat IDs
4. **No encryption needed**: Data is not sensitive (session names are visible in tmux anyway)

## Documentation Updates

### README.md

Add section:

```markdown
## State Persistence

The bot automatically saves your session state to `~/.tmux-telegram/state.json`:

- Current attached sessions
- Active watch sessions

State is restored automatically when the bot restarts.

### Clear State

```bash
tmux-telegram clear-state
```
```

### CHANGELOG.md

```markdown
## [2.0.0] - 2026-04-22

### Added
- Persistent state management - sessions and watch mode survive restarts
- Auto-resume watch sessions after bot restart
- `clear-state` CLI command

### Changed
- State is now saved to `~/.tmux-telegram/state.json`

### Performance
- Smart polling already implemented (no changes needed)
```

## Timeline

- **Phase 1** (StateManager): 2 hours
- **Phase 2** (Integration): 2 hours
- **Phase 3** (Config): 30 minutes
- **Phase 4** (CLI): 30 minutes
- **Testing**: 2 hours
- **Documentation**: 1 hour

**Total: ~8 hours** (1 working day)

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|------------|
| State file corruption | High | Add try-catch, fallback to empty state |
| Disk full | Medium | State file is tiny (~1KB), unlikely |
| Permission issues | Medium | Create dir with 0700, file with 0600 |
| Resume fails | Low | Log error, continue without resume |

## Success Criteria

- ✅ State persists across restarts
- ✅ Watch sessions auto-resume
- ✅ No performance degradation
- ✅ No breaking changes for existing users
- ✅ All tests pass

## Future Enhancements

1. **State compression** - gzip for large state files
2. **State encryption** - encrypt sensitive data (if needed)
3. **State history** - keep last N states for rollback
4. **Multi-user state** - separate state per user
5. **State metrics** - track save/load performance

## Conclusion

The integration is straightforward because:

1. **Smart polling already exists** - no changes needed
2. **Architecture is clean** - easy to add StateManager
3. **No breaking changes** - backward compatible
4. **Low risk** - state is optional, bot works without it

The Python implementation proves the concept works. Porting to Node.js is a direct translation with minimal changes.
