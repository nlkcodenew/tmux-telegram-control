# Changelog

All notable changes to this project will be documented in this file.

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
