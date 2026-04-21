const inquirer = require('inquirer');
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
  console.log('  1. Start the bot:', chalk.cyan('tmux-telegram start'));
  console.log('  2. Or install as service:', chalk.cyan('tmux-telegram install-service'));
  console.log('  3. Open Telegram and send /start to your bot\n');
}

function start(options) {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.log(chalk.red('❌ Configuration not found!'));
    console.log(chalk.yellow('Run:'), chalk.cyan('tmux-telegram init'));
    process.exit(1);
  }

  console.log(chalk.blue('🚀 Starting tmux-telegram bot...\n'));

  if (options.daemon) {
    const child = spawn(process.argv[0], [path.join(__dirname, 'index.js')], {
      detached: true,
      stdio: 'ignore'
    });
    child.unref();
    console.log(chalk.green('✅ Bot started in background (PID:', child.pid + ')'));
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

module.exports = { init, start, installService };
