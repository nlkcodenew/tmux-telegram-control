const fs = require('fs');
const path = require('path');
const os = require('os');
const chalk = require('chalk');
const { execSync } = require('child_process');

const CONFIG_FILE = path.join(os.homedir(), '.tmux-telegram', 'config.json');

function loadConfig() {
  if (!fs.existsSync(CONFIG_FILE)) {
    console.error(chalk.red('❌ Configuration not found!'));
    console.log(chalk.yellow('Run:'), chalk.cyan('tmux-telegram init'));
    process.exit(1);
  }

  try {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    return config;
  } catch (err) {
    console.error(chalk.red('❌ Failed to load config:'), err.message);
    process.exit(1);
  }
}

function commandExists(command) {
  try {
    execSync(`which ${command}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}

function checkDependencies() {
  console.log(chalk.blue('🔍 Checking dependencies...\n'));

  const deps = [
    { name: 'tmux', required: true, install: 'sudo apt install tmux  # or: brew install tmux' },
    { name: 'node', required: true, install: 'https://nodejs.org/' }
  ];

  let allOk = true;

  for (const dep of deps) {
    const exists = commandExists(dep.name);
    if (exists) {
      console.log(chalk.green('✅'), dep.name, chalk.gray('- installed'));
    } else {
      console.log(chalk.red('❌'), dep.name, chalk.gray('- NOT FOUND'));
      if (dep.required) {
        console.log(chalk.yellow('   Install:'), chalk.cyan(dep.install));
        allOk = false;
      }
    }
  }

  console.log('');

  if (!allOk) {
    console.log(chalk.red('❌ Missing required dependencies!'));
    console.log(chalk.yellow('Please install them and try again.\n'));
    process.exit(1);
  }

  console.log(chalk.green('✅ All dependencies installed!\n'));
}

module.exports = {
  loadConfig,
  commandExists,
  checkDependencies
};
