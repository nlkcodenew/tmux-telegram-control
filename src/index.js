const chalk = require('chalk');
const { loadConfig, checkDependencies } = require('./config');
const TelegramAPI = require('./telegram-api');
const {
  listSessions,
  sessionExists,
  getOutput,
  sendKeys,
  sendControlKey,
  createSession,
  detectSessionState,
  detectErrors,
  highlightErrors
} = require('./tmux-handler');

// State management
const currentSessions = {}; // {userId: sessionName}
const watchingSessions = {}; // {userId: {session, messageId, chatId, stop}}
const pendingNewSession = {}; // {userId: true/false}

// Error notification settings
let enableErrorNotifications = false; // Default: OFF

let config;
let telegram;

/**
 * Initialize bot
 */
async function init() {
  console.log(chalk.blue.bold('🚀 tmux-telegram-control starting...\n'));

  // Check dependencies
  checkDependencies();

  // Load config
  config = loadConfig();
  telegram = new TelegramAPI(config.telegram.botToken);

  console.log(chalk.green('✅ Configuration loaded'));
  console.log(chalk.gray('   Bot token:'), config.telegram.botToken.substring(0, 20) + '...');
  console.log(chalk.gray('   Allowed user:'), config.telegram.allowedUserId);
  console.log('');

  // Set bot commands
  await setBotCommands();

  console.log(chalk.green('🎯 Bot is listening for messages...\n'));

  // Start polling
  startPolling();
}

/**
 * Set bot commands menu
 */
async function setBotCommands() {
  const commands = [
    { command: 'ls', description: 'List tmux sessions' },
    { command: 'new', description: 'Create new session' },
    { command: 'attach', description: 'Attach to session' },
    { command: 'kill', description: 'Delete a session' },
    { command: 'o', description: 'View screen output' },
    { command: 'watch', description: 'Realtime watch mode' },
    { command: 'unwatch', description: 'Stop watch mode' },
    { command: 's', description: 'Send command' },
    { command: 'e', description: 'Press Enter' },
    { command: 'c', description: 'Send Ctrl+C' },
    { command: 'd', description: 'Send Ctrl+D' },
    { command: 'session', description: 'Show current session' },
    { command: 'error_notify', description: 'Toggle error notifications' },
    { command: 'help', description: 'Show help' }
  ];

  await telegram.setBotCommands(commands);
  console.log(chalk.green('✅ Bot commands menu configured'));
}

/**
 * Start polling for updates
 */
async function startPolling() {
  let offset = null;

  while (true) {
    try {
      const result = await telegram.getUpdates(offset);

      if (result.ok && result.result) {
        for (const update of result.result) {
          offset = update.update_id + 1;

          if (update.message) {
            await handleMessage(update.message);
          } else if (update.callback_query) {
            await handleCallback(update.callback_query);
          }
        }
      }
    } catch (err) {
      console.error(chalk.red('Polling error:'), err.message);
      await sleep(5000);
    }
  }
}

/**
 * Handle incoming message
 */
async function handleMessage(message) {
  const text = message.text || '';
  const chatId = String(message.chat.id);
  const userId = message.from.id;

  // Auth check
  if (userId !== config.telegram.allowedUserId) {
    await telegram.sendMessage(chatId, '⛔ Unauthorized');
    return;
  }

  // Check if user is in "new session" mode
  if (pendingNewSession[userId]) {
    const sessionName = text.trim();

    // Validate session name
    if (!sessionName || !/^[a-zA-Z0-9_-]+$/.test(sessionName)) {
      await telegram.sendMessage(chatId, '❌ Tên session không hợp lệ. Chỉ dùng chữ, số, dấu gạch ngang (-) và gạch dưới (_).');
      return;
    }

    // Check if exists
    if (sessionExists(sessionName)) {
      await telegram.sendMessage(chatId, `❌ Session \`${sessionName}\` đã tồn tại.\n\nDùng /ls để xem danh sách.`);
      pendingNewSession[userId] = false;
      return;
    }

    // Create session
    if (createSession(sessionName)) {
      currentSessions[userId] = sessionName;
      await telegram.sendMessage(chatId, `✅ *Session \`${sessionName}\` đã được tạo!*\n\nBạn đã được attach vào session này.\n\nDùng /s để gửi lệnh.`);
      console.log(chalk.green('✅'), `User ${userId} created session:`, sessionName);
    } else {
      await telegram.sendMessage(chatId, `❌ Không thể tạo session`);
    }

    pendingNewSession[userId] = false;
    return;
  }

  if (!text.startsWith('/')) return;

  const parts = text.split(/\s+/);
  const command = parts[0].substring(1).split('@')[0]; // Remove / and @botname
  const args = parts.slice(1).join(' ');

  console.log(chalk.blue('📥'), `Command: /${command} from user ${userId}`);

  // Handle commands
  await handleCommand(command, args, chatId, userId);
}

/**
 * Handle command
 */
async function handleCommand(command, args, chatId, userId) {
  switch (command) {
    case 'start':
    case 'help':
      await sendHelp(chatId);
      break;

    case 'ls':
    case 'sessions':
      await listSessionsCommand(chatId, userId);
      break;

    case 'new':
      await newSessionCommand(chatId, userId, args);
      break;

    case 'attach':
      await attachCommand(chatId, userId, args);
      break;

    case 'kill':
    case 'delete':
      await killSessionCommand(chatId, userId, args);
      break;

    case 'o':
    case 'output':
      await outputCommand(chatId, userId);
      break;

    case 'watch':
      await watchCommand(chatId, userId);
      break;

    case 'unwatch':
      await unwatchCommand(chatId, userId);
      break;

    case 's':
    case 'send':
      await sendCommand(chatId, userId, args);
      break;

    case 'e':
    case 'enter':
      await enterCommand(chatId, userId);
      break;

    case 'c':
      await ctrlCCommand(chatId, userId);
      break;

    case 'd':
      await ctrlDCommand(chatId, userId);
      break;

    case 'session':
      await currentSessionCommand(chatId, userId);
      break;

    case 'error_notify':
      await errorNotifyCommand(chatId, userId);
      break;

    default:
      await telegram.sendMessage(chatId, '❌ Unknown command. Use /help');
  }
}

/**
 * Send help message
 */
async function sendHelp(chatId) {
  const helpText = `🤖 *Tmux Control Bot*

*Quick Commands:*
/ls — List sessions (hoặc tạo mới)
/new \`<name>\` — Tạo session mới
/attach \`<name>\` — Select session
/kill \`<name>\` — Delete session
/o — View screen (one-time)
/watch — Realtime mode (auto-update)
/unwatch — Stop realtime

*Send Commands:*
/s \`<text>\` — Send command
/e — Press Enter
/c — Ctrl+C (stop)
/d — Ctrl+D (exit)

*Settings:*
/error_notify — Toggle error notifications

*Aliases:*
/sessions = /ls
/output = /o
/send = /s
/enter = /e
/delete = /kill`;

  await telegram.sendMessage(chatId, helpText);
}

/**
 * List sessions command
 */
async function listSessionsCommand(chatId, userId) {
  const sessions = listSessions();

  if (sessions.length === 0) {
    await telegram.sendMessage(chatId, 'Không có tmux session nào đang chạy.\n\nDùng /new để tạo mới.');
    return;
  }

  // Create inline keyboard
  const keyboard = { inline_keyboard: [] };
  let row = [];

  for (const s of sessions) {
    const marker = currentSessions[userId] === s ? '▶ ' : '';
    row.push({
      text: `${marker}${s}`,
      callback_data: `attach_${s}`
    });

    if (row.length === 2) {
      keyboard.inline_keyboard.push(row);
      row = [];
    }
  }

  if (row.length > 0) {
    keyboard.inline_keyboard.push(row);
  }

  // Add "New Session" button
  keyboard.inline_keyboard.push([
    { text: '➕ New Session', callback_data: 'new_session' }
  ]);

  await telegram.sendMessage(chatId, '📋 *Sessions đang chạy:*\n\nBấm vào session để attach hoặc tạo mới:', {
    reply_markup: keyboard
  });
}

/**
 * New session command
 */
async function newSessionCommand(chatId, userId, args) {
  if (!args) {
    await telegram.sendMessage(chatId, 'Usage: /new `<session_name>`\n\nVí dụ: /new mywork');
    return;
  }

  const sessionName = args.trim();

  if (!/^[a-zA-Z0-9_-]+$/.test(sessionName)) {
    await telegram.sendMessage(chatId, '❌ Tên session không hợp lệ. Chỉ dùng chữ, số, dấu gạch ngang (-) và gạch dưới (_).');
    return;
  }

  if (sessionExists(sessionName)) {
    await telegram.sendMessage(chatId, `❌ Session \`${sessionName}\` đã tồn tại.\n\nDùng /ls để xem danh sách.`);
    return;
  }

  if (createSession(sessionName)) {
    currentSessions[userId] = sessionName;
    await telegram.sendMessage(chatId, `✅ *Session \`${sessionName}\` đã được tạo!*\n\nBạn đã được attach vào session này.\n\nDùng /s để gửi lệnh.`);
    console.log(chalk.green('✅'), `User ${userId} created session:`, sessionName);
  } else {
    await telegram.sendMessage(chatId, '❌ Không thể tạo session');
  }
}

/**
 * Attach command
 */
async function attachCommand(chatId, userId, args) {
  if (!args) {
    await telegram.sendMessage(chatId, 'Usage: /attach `<session_name>`');
    return;
  }

  const sessionName = args.trim();

  if (!sessionExists(sessionName)) {
    await telegram.sendMessage(chatId, `❌ Session \`${sessionName}\` không tồn tại.\n\nDùng /ls để xem danh sách.`);
    return;
  }

  currentSessions[userId] = sessionName;

  const output = getOutput(sessionName, config.tmux.outputLines);
  const truncated = output.length > 3800 ? '...\n' + output.slice(-3800) : output;

  await telegram.sendMessage(chatId, `✅ *Attached: ${sessionName}*\n\n\`\`\`\n${truncated}\n\`\`\``);
}

/**
 * Kill session command
 */
async function killSessionCommand(chatId, userId, args) {
  const sessions = listSessions();

  // If no sessions exist
  if (sessions.length === 0) {
    await telegram.sendMessage(chatId, 'Không có tmux session nào đang chạy.');
    return;
  }

  // If args provided, kill directly
  if (args) {
    const sessionName = args.trim();

    if (!sessionExists(sessionName)) {
      await telegram.sendMessage(chatId, `❌ Session \`${sessionName}\` không tồn tại.\n\nDùng /ls để xem danh sách.`);
      return;
    }

    // Check if user is currently attached to this session
    if (currentSessions[userId] === sessionName) {
      delete currentSessions[userId];
    }

    // Kill the session
    const { killSession } = require('./tmux-handler');
    if (killSession(sessionName)) {
      await telegram.sendMessage(chatId, `✅ *Session \`${sessionName}\` đã bị xóa!*`);
      console.log(chalk.yellow('🗑️'), `User ${userId} killed session:`, sessionName);
    } else {
      await telegram.sendMessage(chatId, `❌ Không thể xóa session \`${sessionName}\``);
    }
    return;
  }

  // No args - show menu
  const keyboard = { inline_keyboard: [] };
  let row = [];

  for (const s of sessions) {
    row.push({
      text: `🗑️ ${s}`,
      callback_data: `kill_${s}`
    });

    if (row.length === 2) {
      keyboard.inline_keyboard.push(row);
      row = [];
    }
  }

  if (row.length > 0) {
    keyboard.inline_keyboard.push(row);
  }

  await telegram.sendMessage(chatId, '🗑️ *Chọn session để xóa:*', {
    reply_markup: keyboard
  });
}

/**
 * Output command
 */
async function outputCommand(chatId, userId) {
  const sessionName = currentSessions[userId];

  if (!sessionName) {
    await telegram.sendMessage(chatId, 'Chưa chọn session. Dùng /attach `<name>` trước.');
    return;
  }

  if (!sessionExists(sessionName)) {
    await telegram.sendMessage(chatId, `❌ Session \`${sessionName}\` không còn tồn tại.`);
    delete currentSessions[userId];
    return;
  }

  const output = getOutput(sessionName, config.tmux.outputLines);
  const truncated = output.length > 3800 ? '...\n' + output.slice(-3800) : output;

  await telegram.sendMessage(chatId, `📺 *${sessionName}*\n\`\`\`\n${truncated}\n\`\`\``);
}

/**
 * Watch command
 */
async function watchCommand(chatId, userId) {
  const sessionName = currentSessions[userId];

  if (!sessionName) {
    await telegram.sendMessage(chatId, 'Chưa chọn session. Dùng /attach `<name>` trước.');
    return;
  }

  if (watchingSessions[userId]) {
    await telegram.sendMessage(chatId, '⚠️ Already watching. Use /unwatch first.');
    return;
  }

  const output = getOutput(sessionName, config.tmux.outputLines);
  const truncated = output.length > 3800 ? '...\n' + output.slice(-3800) : output;

  const result = await telegram.sendMessage(chatId, `📺 *Watching: ${sessionName}*\n\`\`\`\n${truncated}\n\`\`\``);

  if (result.ok) {
    watchingSessions[userId] = {
      session: sessionName,
      messageId: result.result.message_id,
      chatId,
      stop: false
    };

    console.log(chalk.blue('👁️'), `User ${userId} started watching:`, sessionName);
    startWatchLoop(userId);
  }
}

/**
 * Unwatch command
 */
async function unwatchCommand(chatId, userId) {
  if (!watchingSessions[userId]) {
    await telegram.sendMessage(chatId, 'Not watching any session.');
    return;
  }

  watchingSessions[userId].stop = true;
  delete watchingSessions[userId];

  await telegram.sendMessage(chatId, '✅ Watch mode stopped');
  console.log(chalk.blue('👁️'), `User ${userId} stopped watching`);
}

/**
 * Watch loop
 */
async function startWatchLoop(userId) {
  let lastOutput = '';
  let lastErrors = [];

  while (watchingSessions[userId] && !watchingSessions[userId].stop) {
    const { session, messageId, chatId } = watchingSessions[userId];

    if (!sessionExists(session)) {
      await telegram.sendMessage(chatId, `❌ Session \`${session}\` không còn tồn tại. Watch mode đã dừng.`);
      delete watchingSessions[userId];
      break;
    }

    const output = getOutput(session, config.tmux.outputLines);

    // Skip if output hasn't changed
    if (output === lastOutput) {
      await sleep(config.tmux.watchInterval);
      continue;
    }

    lastOutput = output;

    // Detect errors
    const errors = detectErrors(output);
    const newErrors = errors.filter(e => !lastErrors.includes(e));

    // Send notification for new errors (only if enabled)
    if (newErrors.length > 0 && enableErrorNotifications) {
      let errorMsg = `🚨 *Error detected in ${session}:*\n\n`;
      for (const err of newErrors.slice(0, 3)) {
        errorMsg += `❌ \`${err.substring(0, 200)}\`\n`;
      }
      await telegram.sendMessage(chatId, errorMsg);
      lastErrors = errors;
    }

    const highlighted = highlightErrors(output);
    const truncated = highlighted.length > 3800 ? '...\n' + highlighted.slice(-3800) : highlighted;

    await telegram.editMessage(chatId, messageId, `📺 *Watching: ${session}*\n\`\`\`\n${truncated}\n\`\`\``, {
      parseMode: 'Markdown'
    });

    await sleep(config.tmux.watchInterval);
  }
}

/**
 * Send command
 */
async function sendCommand(chatId, userId, args) {
  const sessionName = currentSessions[userId];

  if (!sessionName) {
    await telegram.sendMessage(chatId, 'Chưa chọn session. Dùng /attach `<name>` trước.');
    return;
  }

  if (!args) {
    await telegram.sendMessage(chatId, 'Usage: /send `<text>`');
    return;
  }

  if (sendKeys(sessionName, args, true)) {
    await telegram.sendMessage(chatId, `✅ Sent: \`${args}\``);
  } else {
    await telegram.sendMessage(chatId, '❌ Failed to send');
  }
}

/**
 * Enter command
 */
async function enterCommand(chatId, userId) {
  const sessionName = currentSessions[userId];

  if (!sessionName) {
    await telegram.sendMessage(chatId, 'Chưa chọn session. Dùng /attach `<name>` trước.');
    return;
  }

  if (sendKeys(sessionName, '', true)) {
    await telegram.sendMessage(chatId, '✅ Sent: Enter');
  } else {
    await telegram.sendMessage(chatId, '❌ Failed');
  }
}

/**
 * Ctrl+C command
 */
async function ctrlCCommand(chatId, userId) {
  const sessionName = currentSessions[userId];

  if (!sessionName) {
    await telegram.sendMessage(chatId, 'Chưa chọn session. Dùng /attach `<name>` trước.');
    return;
  }

  if (sendControlKey(sessionName, 'C-c')) {
    await telegram.sendMessage(chatId, '⛔ Sent: Ctrl+C');
  } else {
    await telegram.sendMessage(chatId, '❌ Failed');
  }
}

/**
 * Ctrl+D command
 */
async function ctrlDCommand(chatId, userId) {
  const sessionName = currentSessions[userId];

  if (!sessionName) {
    await telegram.sendMessage(chatId, 'Chưa chọn session. Dùng /attach `<name>` trước.');
    return;
  }

  if (sendControlKey(sessionName, 'C-d')) {
    await telegram.sendMessage(chatId, '✅ Sent: Ctrl+D');
  } else {
    await telegram.sendMessage(chatId, '❌ Failed');
  }
}

/**
 * Current session command
 */
async function currentSessionCommand(chatId, userId) {
  const sessionName = currentSessions[userId];

  if (!sessionName) {
    await telegram.sendMessage(chatId, 'Chưa chọn session. Dùng /attach `<name>` để chọn.');
    return;
  }

  await telegram.sendMessage(chatId, `📍 Current session: \`${sessionName}\``);
}

/**
 * Error notifications command
 */
async function errorNotifyCommand(chatId, userId) {
  // Show current status with buttons
  const currentStatus = enableErrorNotifications ? '🔔 BẬT' : '🔕 TẮT';

  // Create inline keyboard with ON/OFF buttons
  const keyboard = {
    inline_keyboard: [[
      {
        text: enableErrorNotifications ? '✅ BẬT' : '⚪ BẬT',
        callback_data: 'error_notify_on'
      },
      {
        text: !enableErrorNotifications ? '✅ TẮT' : '⚪ TẮT',
        callback_data: 'error_notify_off'
      }
    ]]
  };

  const msg = `⚙️ *Error Notifications*\n\nTrạng thái hiện tại: ${currentStatus}\n\nChọn chế độ:`;
  await telegram.sendMessage(chatId, msg, { reply_markup: keyboard });
}

/**
 * Handle callback query
 */
async function handleCallback(callbackQuery) {
  const callbackId = callbackQuery.id;
  const callbackData = callbackQuery.data;
  const message = callbackQuery.message;
  const chatId = String(message.chat.id);
  const userId = callbackQuery.from.id;

  // Auth check
  if (userId !== config.telegram.allowedUserId) {
    await telegram.answerCallbackQuery(callbackId, '⛔ Unauthorized');
    return;
  }

  console.log(chalk.blue('📥'), `Callback: ${callbackData} from user ${userId}`);

  if (callbackData.startsWith('attach_')) {
    const sessionName = callbackData.replace('attach_', '');

    if (!sessionExists(sessionName)) {
      await telegram.answerCallbackQuery(callbackId, `❌ Session ${sessionName} không tồn tại`);
      return;
    }

    currentSessions[userId] = sessionName;

    const output = getOutput(sessionName, config.tmux.outputLines);
    const truncated = output.length > 3800 ? '...\n' + output.slice(-3800) : output;

    await telegram.sendMessage(chatId, `✅ *Attached: ${sessionName}*\n\n\`\`\`\n${truncated}\n\`\`\``);
    await telegram.answerCallbackQuery(callbackId, `✅ Attached to ${sessionName}`);

    console.log(chalk.green('✅'), `User ${userId} attached to:`, sessionName);
  } else if (callbackData.startsWith('kill_')) {
    const sessionName = callbackData.replace('kill_', '');

    if (!sessionExists(sessionName)) {
      await telegram.answerCallbackQuery(callbackId, `❌ Session ${sessionName} không tồn tại`);
      return;
    }

    // Check if user is currently attached to this session
    if (currentSessions[userId] === sessionName) {
      delete currentSessions[userId];
    }

    // Kill the session
    const { killSession } = require('./tmux-handler');
    if (killSession(sessionName)) {
      await telegram.sendMessage(chatId, `✅ *Session \`${sessionName}\` đã bị xóa!*`);
      await telegram.answerCallbackQuery(callbackId, `✅ Đã xóa ${sessionName}`);
      console.log(chalk.yellow('🗑️'), `User ${userId} killed session:`, sessionName);
    } else {
      await telegram.answerCallbackQuery(callbackId, `❌ Không thể xóa ${sessionName}`);
    }
  } else if (callbackData === 'new_session') {
    await telegram.answerCallbackQuery(callbackId, 'Nhập tên session mới');
    await telegram.sendMessage(chatId, '➕ *Tạo tmux session mới*\n\nGửi tên session (ví dụ: `mywork`, `dev`, `test`):');
    pendingNewSession[userId] = true;
  } else if (callbackData === 'error_notify_on') {
    enableErrorNotifications = true;

    // Update message with new status
    const keyboard = {
      inline_keyboard: [[
        { text: '✅ BẬT', callback_data: 'error_notify_on' },
        { text: '⚪ TẮT', callback_data: 'error_notify_off' }
      ]]
    };
    const msg = `⚙️ *Error Notifications*\n\nTrạng thái hiện tại: 🔔 BẬT\n\nChọn chế độ:`;
    await telegram.editMessageText(chatId, message.message_id, msg, { reply_markup: keyboard });
    await telegram.answerCallbackQuery(callbackId, '🔔 Đã BẬT thông báo lỗi');
    console.log(chalk.green('✅'), `User ${userId} enabled error notifications`);
  } else if (callbackData === 'error_notify_off') {
    enableErrorNotifications = false;

    // Update message with new status
    const keyboard = {
      inline_keyboard: [[
        { text: '⚪ BẬT', callback_data: 'error_notify_on' },
        { text: '✅ TẮT', callback_data: 'error_notify_off' }
      ]]
    };
    const msg = `⚙️ *Error Notifications*\n\nTrạng thái hiện tại: 🔕 TẮT\n\nChọn chế độ:`;
    await telegram.editMessageText(chatId, message.message_id, msg, { reply_markup: keyboard });
    await telegram.answerCallbackQuery(callbackId, '🔕 Đã TẮT thông báo lỗi');
    console.log(chalk.yellow('🔕'), `User ${userId} disabled error notifications`);
  }
}

/**
 * Sleep helper
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Start bot
init().catch(err => {
  console.error(chalk.red('❌ Fatal error:'), err);
  process.exit(1);
});
