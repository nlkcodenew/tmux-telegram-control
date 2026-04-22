const { execSync, spawn, spawnSync } = require('child_process');

function tmux(...args) {
  // Use spawnSync instead of execSync to avoid pipe coupling issues
  const result = spawnSync('tmux', args, {
    encoding: 'utf8'
  });

  if (result.status === 0) {
    return { success: true, output: result.stdout.trim() };
  } else {
    return {
      success: false,
      error: result.stderr,
      output: result.stdout || ''
    };
  }
}

function listSessions() {
  const result = tmux('list-sessions', '-F', '#{session_name}');
  if (!result.success) return [];
  return result.output.split('\n').filter(s => s.trim());
}

function sessionExists(name) {
  return listSessions().includes(name);
}

function getOutput(sessionName, lines = 60) {
  const result = tmux('capture-pane', '-p', '-t', sessionName, '-S', `-${lines}`);
  if (!result.success) return '❌ Cannot read output';
  return filterSeparators(result.output);
}

function filterSeparators(output) {
  // Remove lines that are only horizontal separators (─ or -)
  const lines = output.split('\n');
  const filtered = lines.filter(line => {
    const stripped = line.trim().replace(/─/g, '').replace(/-/g, '');
    return stripped !== '';
  });
  return filtered.length > 0 ? filtered.join('\n') : output;
}

function sendKeys(sessionName, text, pressEnter = true) {
  const args = ['send-keys', '-t', sessionName, text];
  if (pressEnter) args.push('Enter');
  const result = tmux(...args);
  return result.success;
}

function sendControlKey(sessionName, key) {
  const result = tmux('send-keys', '-t', sessionName, key);
  return result.success;
}

function createSession(sessionName) {
  // Let tmux spawn its default shell - simpler and more stable
  const result = tmux('new-session', '-d', '-s', sessionName);
  return result.success && sessionExists(sessionName);
}

function killSession(sessionName) {
  const result = tmux('kill-session', '-t', sessionName);
  return result.success;
}

function detectSessionState(output) {
  const state = {
    type: 'idle',
    confidence: 0.0,
    context: null
  };

  const lastLines = output.split('\n').slice(-10);
  const lastText = lastLines.join('\n').toLowerCase();

  if (/(y\/n|\(y\/n\)|approve\?|proceed\?|continue\?)/.test(lastText)) {
    state.type = 'prompt';
    state.confidence = 0.9;
    state.context = 'user_input';
    return state;
  }

  if (/(building|compiling|docker build|npm install)/.test(lastText)) {
    state.type = 'build';
    state.confidence = 0.8;
    state.context = 'build_in_progress';
    return state;
  }

  if (!/[$#>~]/.test(lastLines[lastLines.length - 1])) {
    state.type = 'running';
    state.confidence = 0.7;
    return state;
  }

  if (/(error|failed|fatal)/i.test(lastText)) {
    state.type = 'error';
    state.confidence = 0.8;
    return state;
  }

  state.type = 'idle';
  state.confidence = 0.6;
  return state;
}

function detectErrors(output) {
  const errors = [];
  const lines = output.split('\n');

  const errorPatterns = [
    /error:/i, /error /i, /failed/i, /failure/i, /panic/i, /fatal/i,
    /exception/i, /traceback/i, /segmentation fault/i, /core dumped/i,
    /permission denied/i, /cannot/i, /unable to/i, /not found/i,
    /connection refused/i, /timeout/i, /killed/i
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const pattern of errorPatterns) {
      if (pattern.test(line)) {
        errors.push(line.trim());
        break;
      }
    }
  }

  return errors;
}

function highlightErrors(output) {
  const lines = output.split('\n');
  const errorPatterns = [
    /error:/i, /failed/i, /fatal/i, /exception/i, /traceback/i
  ];

  return lines.map(line => {
    for (const pattern of errorPatterns) {
      if (pattern.test(line)) {
        return `❌ ${line}`;
      }
    }
    return line;
  }).join('\n');
}

module.exports = {
  tmux,
  listSessions,
  sessionExists,
  getOutput,
  filterSeparators,
  sendKeys,
  sendControlKey,
  createSession,
  killSession,
  detectSessionState,
  detectErrors,
  highlightErrors
};
