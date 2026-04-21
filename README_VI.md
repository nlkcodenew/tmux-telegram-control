# 🤖 tmux-telegram-control

[![npm version](https://badge.fury.io/js/tmux-telegram-control.svg)](https://www.npmjs.com/package/tmux-telegram-control)
[![GitHub](https://img.shields.io/github/license/nlkcodenew/tmux-telegram-control)](https://github.com/nlkcodenew/tmux-telegram-control)

> Điều khiển tmux sessions từ xa qua Telegram - xem output, gửi lệnh, tạo session, tất cả từ điện thoại 📱

## 💡 Ý Tưởng

Bạn có bao giờ muốn kiểm tra build đang chạy, restart service bị crash, hoặc xem logs khi đang ở xa máy tính?

**tmux-telegram-control** biến Telegram thành terminal từ xa. Không cần SSH, không cần VPN, không cần port forwarding - chỉ cần một bot đơn giản kết nối tmux sessions với điện thoại của bạn.

### Trường hợp sử dụng thực tế:

- 🏗️ **Kiểm tra tiến trình build** - "Build Docker xong chưa?"
- 🔥 **Sửa lỗi khẩn cấp** - Server down lúc 2 giờ sáng? Restart từ giường
- 📊 **Theo dõi logs** - Xem output real-time không cần mở laptop
- 🚀 **Deploy từ bất kỳ đâu** - Chạy deployment scripts từ điện thoại
- 🧪 **Tests chạy lâu** - Kiểm tra kết quả test trong giờ ăn trưa
- 💻 **Nhiều servers** - Điều khiển dev/staging/prod từ một chat

## ✨ Tính Năng

### Tính năng cơ bản
- 📋 **List sessions** - Xem tất cả tmux sessions đang chạy
- 👀 **Xem output** - Đọc output terminal (60 dòng cuối)
- ⌨️ **Gửi lệnh** - Gõ và thực thi lệnh từ xa
- ➕ **Tạo sessions** - Tạo tmux session mới ngay lập tức
- 🔄 **Attach/switch** - Chuyển đổi giữa các sessions
- 📺 **Watch mode** - Tự động refresh output mỗi 2 giây

### Tính năng thông minh
- 🎯 **Nút theo ngữ cảnh** - Các hành động khác nhau dựa trên trạng thái terminal
- 🚨 **Phát hiện lỗi** - Tự động highlight lỗi trong output
- 🔐 **Xác thực người dùng** - Chỉ Telegram user được phép mới điều khiển được
- 🎨 **Syntax highlighting** - Lỗi hiển thị màu đỏ, dễ nhận biết

## 📦 Cài Đặt

### Yêu cầu
- **Linux hoặc macOS** (Windows: dùng WSL)
- Node.js 14+
- tmux đã cài (`sudo apt install tmux` hoặc `brew install tmux`)
- Telegram bot token (lấy từ [@BotFather](https://t.me/botfather))

### Người dùng Windows
Package này cần `tmux` không có trên Windows. Dùng WSL (Windows Subsystem for Linux):
```bash
# Cài WSL (PowerShell as Admin)
wsl --install

# Mở WSL terminal, sau đó:
sudo apt update
sudo apt install tmux nodejs npm
npm install -g tmux-telegram-control
```

### Cài đặt nhanh

```bash
# Cài global
npm install -g tmux-telegram-control

# Khởi tạo (setup tương tác)
tmux-telegram init
# → Nhập Telegram bot token
# → Nhập Telegram user ID
# → Nhập chat ID (tùy chọn, cho group chats)

# Khởi động bot
tmux-telegram start

# Hoặc cài như system service (tự động khởi động khi boot)
tmux-telegram install-service
sudo systemctl enable tmux-telegram
sudo systemctl start tmux-telegram
```

## 🚀 Bắt Đầu

### 1. Tạo Telegram Bot

1. Mở Telegram và tìm [@BotFather](https://t.me/botfather)
2. Gửi `/newbot` và làm theo hướng dẫn
3. Copy bot token (dạng `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`)

### 2. Lấy User ID

1. Tìm [@userinfobot](https://t.me/userinfobot) trên Telegram
2. Start bot - nó sẽ hiển thị user ID của bạn (ví dụ: `8339012918`)

### 3. Khởi tạo

```bash
tmux-telegram init
```

Nhập bot token và user ID khi được hỏi. Config được lưu vào `~/.tmux-telegram/config.json`.

### 4. Khởi động Bot

```bash
tmux-telegram start
```

### 5. Mở Telegram

Gửi `/start` cho bot của bạn. Bạn sẽ thấy menu lệnh.

## 📖 Ví Dụ Sử Dụng

### List tất cả tmux sessions
```
/ls
```
Bot hiển thị nút cho mỗi session. Click để attach.

### Tạo session mới
```
/new myproject
```
Hoặc click nút "➕ New Session" trong `/ls`

### Xem output hiện tại
```
/o
```
Hiển thị 60 dòng cuối của terminal output.

### Gửi lệnh
```
/s ls -la
```
Thực thi `ls -la` trong session hiện tại.

### Watch mode (tự động refresh)
```
/watch
```
Output cập nhật mỗi 2 giây. Dùng `/unwatch` để dừng.

## 🔧 Các Lệnh

| Lệnh | Mô tả |
|------|-------|
| `/start`, `/help` | Hiển thị trợ giúp |
| `/ls` | List tất cả tmux sessions |
| `/new <name>` | Tạo session mới |
| `/attach <name>` | Attach vào session |
| `/kill <name>` | Xóa session |
| `/o` | Xem output (một lần) |
| `/watch` | Bật chế độ watch realtime |
| `/unwatch` | Tắt watch mode |
| `/s <text>` | Gửi lệnh |
| `/e` | Nhấn Enter |
| `/c` | Gửi Ctrl+C |
| `/d` | Gửi Ctrl+D |
| `/session` | Hiển thị session hiện tại |

## 🔄 Cập Nhật

Để cập nhật lên phiên bản mới nhất:

```bash
# Cách dễ - tự động dừng/khởi động lại
tmux-telegram update

# Cách thủ công
tmux-telegram stop
npm install -g tmux-telegram-control@latest
tmux-telegram start -d
```

**Lưu ý:** Cấu hình của bạn trong `~/.tmux-telegram/config.json` được giữ nguyên khi cập nhật.

## 🛡️ Bảo Mật

- **Xác thực người dùng**: Chỉ Telegram user ID của bạn mới điều khiển được bot
- **Không lưu dữ liệu**: Bot không lưu bất kỳ lệnh hoặc output nào
- **Chỉ local**: Bot chạy trên máy của bạn, không có cloud service
- **Bảo mật token**: File config có quyền `600` (chỉ owner đọc/ghi)

## 📄 License

MIT

---

**Được tạo với ❤️ cho developers làm việc từ xa**
