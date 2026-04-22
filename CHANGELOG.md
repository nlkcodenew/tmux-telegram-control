# Changelog

All notable changes to this project will be documented in this file.

## [2.0.0] - 2026-04-22

### Added
- **Persistent state management** - Sessions and watch mode now survive bot restarts
  - State saved to `~/.tmux-telegram/state.json`
  - Auto-resume watch sessions after restart
  - Preserves current attached sessions
- **Separator filtering** - Automatically removes horizontal line separators (─ and -) from output
- Added `clear-state` CLI command to reset saved state

### Changed
- State is now persistent across restarts (breaking change for users expecting stateless behavior)
- Output is cleaner with separator lines filtered out

### Performance
- Smart polling already implemented (only updates when output changes)
- Minimal disk I/O impact (~1-2ms per state save)

## [1.1.1] - 2026-04-21

### Added
- Added `/error_notify` command to toggle error notifications on/off
- Interactive ON/OFF buttons with visual indicators (✅/⚪)
- Error notifications disabled by default to reduce spam
- Watch mode respects error notification setting

### Changed
- Updated help text with new `/error_notify` command
- Improved user control over notification preferences

## [1.0.4] - 2026-04-21

### Added
- Added `tmux-telegram update` command for easy updates with automatic stop/restart
- Update command preserves user configuration

### Fixed
- Fixed session creation on WSL - sessions now start with bash command to prevent immediate exit

### Changed
- Updated README and README_VI with update instructions
- Improved CLI with update command

## [1.0.3] - 2026-04-21

### Fixed
- Fixed session immediate exit issue on WSL environments

## [1.0.2] - 2026-04-21

### Added
- Added `tmux-telegram stop` command to stop background bot
- Improved daemon mode with PID file management and log file
- Added check for already running bot instance
- Better daemon mode output with PID and log file location

### Changed
- Updated init instructions to recommend `start -d` for background mode

## [1.0.1] - 2026-04-21

### Fixed
- Fixed inquirer compatibility issue with Node.js v24+
- Changed inquirer import to use `.default` for ES module compatibility

## [1.0.0] - 2026-04-21

### Added
- Initial release
- Basic tmux session control via Telegram
- Commands: /ls, /new, /attach, /kill, /o, /watch, /unwatch, /s, /e, /c, /d
- Interactive setup with `tmux-telegram init`
- Systemd service installation
- Context-aware inline buttons
- Error detection and highlighting
- Watch mode with auto-refresh
- User authentication
- Dependency checking on startup
- Delete/kill session functionality

### Features
- List all tmux sessions
- Create new sessions from Telegram
- Delete sessions with /kill command
- View terminal output
- Send commands remotely
- Real-time watch mode
- Control keys (Ctrl+C, Ctrl+D, Enter)
- Session switching
- Inline keyboard for quick actions

### Security
- User ID authentication
- Config file permissions (600)
- No data storage
- Local-only operation
