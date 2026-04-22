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
      console.log('✅ State cleared');
    }
  }
}

module.exports = StateManager;
