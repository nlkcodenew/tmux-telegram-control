const inquirer = require('inquirer').default;
const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const { spawn } = require('child_process');

const CONFIG_DIR = path.join(os.homedir(), '.tmux-telegram');
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json');

async function init() {
  console.log(chalk.blue.bold('\n🤖 tmux-telegram-control Setup\n'));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'botToken',
      message: 'Enter your Telegram bot token:',
      validate: (input) => {
        if (!input || input.length < 20) {
          return 'Please enter a valid bot token (get from @BotFather)';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'userId',
      message: 'Enter your Telegram user ID:',
      validate: (input) => {
        if (!input || isNaN(input)) {
          return 'Please enter a valid user ID (get from @userinfobot)';
        }
        return true;
      }
    },
    {
      type: 'input',
      name: 'chatId',
      message: 'Enter chat ID (optional, press Enter to skip):',
      default: ''
    }
  ]);

  // Create config directory
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }

  // Create config
  const config = {
    telegram: {
      botToken: answers.botToken,
      allowedUserId: parseInt(answers.userId),
      chatId: answers.chatId || null
    },
    tmux: {
      outputLines: 60,
      watchInterval: 2000
    }
  };

  // Write config
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2));
  fs.chmodSync(CONFIG_FILE, 0o600);

  console.log(chalk.green('\n✅ Configuration saved to:'), CONFIG_FILE);
  console.log(chalk.yellow('\n📝 Next steps:'));
  console.log('  1. Start the bot:', chalk.cyan('tmux-telegram start -d'), chalk.gray('(background)'));
  console.log('  2. Or run foreground:', chalk.cyan('tmux-telegram start'));
  console.log('  3. Or install as service:', chalk.cyan('tmux-telegram install-service'));
  console.log('  4. Open Telegram and send /start to your bot\n');
}

function start(options) {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.log(chalk.red('❌ Configuration not found!'));
    console.log(chalk.yellow('Run:'), chalk.cyan('tmux-telegram init'));
    process.exit(1);
  }

  console.log(chalk.blue('🚀 Starting tmux-telegram bot...\n'));

  if (options.daemon) {
    const logFile = path.join(CONFIG_DIR, 'bot.log');
    const pidFile = path.join(CONFIG_DIR, 'bot.pid');

    // Check if already running
    if (fs.existsSync(pidFile)) {
      const oldPid = fs.readFileSync(pidFile, 'utf8').trim();
      try {
        process.kill(oldPid, 0); // Check if process exists
        console.log(chalk.yellow('⚠️  Bot is already running (PID:', oldPid + ')'));
        console.log(chalk.gray('   Stop it first: kill', oldPid));
        process.exit(1);
      } catch (e) {
        // Process doesn't exist, remove stale PID file
        fs.unlinkSync(pidFile);
      }
    }

    const logStream = fs.openSync(logFile, 'a');
    const child = spawn(process.argv[0], [path.join(__dirname, 'index.js')], {
      detached: true,
      stdio: ['ignore', logStream, logStream]
    });

    child.unref();
    fs.writeFileSync(pidFile, child.pid.toString());

    console.log(chalk.green('✅ Bot started in background'));
    console.log(chalk.gray('   PID:'), child.pid);
    console.log(chalk.gray('   Log:'), logFile);
    console.log(chalk.gray('   Stop: kill'), child.pid, chalk.gray('or'), chalk.cyan('tmux-telegram stop'));
  } else {
    require('./index.js');
  }
}

function installService() {
  const username = os.userInfo().username;
  const nodePath = process.execPath;
  const scriptPath = path.join(__dirname, 'index.js');

  const serviceContent = `[Unit]
Description=Tmux Telegram Control Bot
After=network.target

[Service]
Type=simple
User=${username}
WorkingDirectory=${os.homedir()}
ExecStart=${nodePath} ${scriptPath}
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
`;

  const servicePath = '/etc/systemd/system/tmux-telegram.service';

  try {
    console.log(chalk.yellow('📝 Creating systemd service...'));
    console.log(chalk.gray('This requires sudo permissions.\n'));

    fs.writeFileSync('/tmp/tmux-telegram.service', serviceContent);

    const { execSync } = require('child_process');
    execSync(`sudo mv /tmp/tmux-telegram.service ${servicePath}`);
    execSync('sudo systemctl daemon-reload');

    console.log(chalk.green('✅ Service installed successfully!\n'));
    console.log(chalk.yellow('📝 Next steps:'));
    console.log('  1. Enable auto-start:', chalk.cyan('sudo systemctl enable tmux-telegram'));
    console.log('  2. Start service:', chalk.cyan('sudo systemctl start tmux-telegram'));
    console.log('  3. Check status:', chalk.cyan('sudo systemctl status tmux-telegram'));
    console.log('  4. View logs:', chalk.cyan('sudo journalctl -u tmux-telegram -f\n'));
  } catch (err) {
    console.log(chalk.red('❌ Failed to install service:'), err.message);
    console.log(chalk.yellow('\nManual installation:'));
    console.log('  1. Save this content to', chalk.cyan(servicePath));
    console.log(chalk.gray(serviceContent));
    process.exit(1);
  }
}

function stop() {
  const pidFile = path.join(CONFIG_DIR, 'bot.pid');

  if (!fs.existsSync(pidFile)) {
    console.log(chalk.yellow('⚠️  Bot is not running (no PID file found)'));
    return false;
  }

  const pid = fs.readFileSync(pidFile, 'utf8').trim();

  try {
    process.kill(pid, 0); // Check if process exists
    process.kill(pid, 'SIGTERM');
    fs.unlinkSync(pidFile);
    console.log(chalk.green('✅ Bot stopped (PID:', pid + ')'));
    return true;
  } catch (e) {
    console.log(chalk.yellow('⚠️  Process not found (PID:', pid + ')'));
    fs.unlinkSync(pidFile);
    return false;
  }
}

function update() {
  const { spawnSync } = require('child_process');

  console.log(chalk.blue.bold('\n🔄 Updating tmux-telegram-control...\n'));

  // Check if bot is running
  const pidFile = path.join(CONFIG_DIR, 'bot.pid');
  const wasRunning = fs.existsSync(pidFile);

  // Stop bot if running
  if (wasRunning) {
    console.log(chalk.yellow('⏹️  Stopping bot...'));
    stop();
    // Wait a bit for graceful shutdown
    spawnSync('sleep', ['1']);
  }

  // Update package
  console.log(chalk.yellow('📦 Updating package from npm...'));
  const result = spawnSync('npm', ['install', '-g', 'tmux-telegram-control@latest'], {
    stdio: 'inherit',
    shell: false
  });

  if (result.status !== 0) {
    console.log(chalk.red('\n❌ Update failed!'));
    console.log(chalk.gray('Try manually: npm install -g tmux-telegram-control@latest'));
    process.exit(1);
  }

  // Show new version
  console.log(chalk.green('\n✅ Update complete!'));
  const versionResult = spawnSync('npm', ['list', '-g', 'tmux-telegram-control', '--depth=0'], {
    encoding: 'utf8',
    shell: false
  });
  if (versionResult.stdout) {
    console.log(chalk.gray(versionResult.stdout.trim()));
  }

  // Restart if was running
  if (wasRunning) {
    console.log(chalk.yellow('\n🚀 Restarting bot...'));
    start({ daemon: true });
  } else {
    console.log(chalk.gray('\n💡 Bot was not running. Start it with:'), chalk.cyan('tmux-telegram start -d'));
  }

  console.log(chalk.green('\n✨ All done!\n'));
}

function clearState() {
  const StateManager = require('./state-manager');
  const stateManager = new StateManager();

  console.log(chalk.yellow('🗑️  Clearing saved state...'));
  stateManager.clear();
  console.log(chalk.green('✅ State cleared'));
  console.log(chalk.gray('   Sessions and watch mode state have been reset'));
  console.log(chalk.gray('   Restart the bot to start fresh\n'));
}

module.exports = { init, start, stop, installService, update, clearState };
