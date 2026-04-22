#!/usr/bin/env node

const { program } = require('commander');
const { init, start, stop, installService, update, clearState } = require('../src/cli');

program
  .name('tmux-telegram')
  .description('Control tmux sessions remotely via Telegram')
  .version('1.0.3');

program
  .command('init')
  .description('Initialize configuration (interactive setup)')
  .action(init);

program
  .command('start')
  .description('Start the Telegram bot server')
  .option('-d, --daemon', 'Run as background daemon')
  .action(start);

program
  .command('stop')
  .description('Stop the background bot')
  .action(stop);

program
  .command('update')
  .description('Update to latest version (auto stop/restart)')
  .action(update);

program
  .command('install-service')
  .description('Install systemd service for auto-start')
  .action(installService);

program
  .command('status')
  .description('Check bot status')
  .action(() => {
    const { execSync } = require('child_process');
    try {
      const status = execSync('systemctl status tmux-telegram --no-pager', { encoding: 'utf8' });
      console.log(status);
    } catch (err) {
      console.log('Service not installed or not running');
      console.log('Run: tmux-telegram install-service');
    }
  });

program.parse();
