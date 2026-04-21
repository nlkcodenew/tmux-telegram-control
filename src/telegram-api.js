const axios = require('axios');

class TelegramAPI {
  constructor(botToken) {
    this.botToken = botToken;
    this.baseURL = `https://api.telegram.org/bot${botToken}`;
  }

  /**
   * Get updates (long polling)
   */
  async getUpdates(offset = null) {
    try {
      const params = {
        timeout: 30,
        allowed_updates: ['message', 'callback_query']
      };
      if (offset) params.offset = offset;

      const response = await axios.get(`${this.baseURL}/getUpdates`, {
        params,
        timeout: 35000
      });
      return response.data;
    } catch (err) {
      console.error('Failed to get updates:', err.message);
      return { ok: false };
    }
  }

  /**
   * Send message
   */
  async sendMessage(chatId, text, options = {}) {
    try {
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: options.parseMode || 'Markdown',
        ...options
      };

      const response = await axios.post(`${this.baseURL}/sendMessage`, payload, {
        timeout: 10000
      });
      return response.data;
    } catch (err) {
      console.error('Failed to send message:', err.message);
      if (err.response) {
        console.error('Response status:', err.response.status);
        console.error('Response data:', JSON.stringify(err.response.data));
      }
      return { ok: false };
    }
  }

  /**
   * Edit message
   */
  async editMessage(chatId, messageId, text, options = {}) {
    try {
      const payload = {
        chat_id: chatId,
        message_id: messageId,
        text,
        parse_mode: options.parseMode || 'HTML',
        ...options
      };

      const response = await axios.post(`${this.baseURL}/editMessageText`, payload, {
        timeout: 10000
      });
      return response.data;
    } catch (err) {
      // Silently ignore "message is not modified" errors
      if (err.response && err.response.status === 400 &&
          err.response.data.description.includes('message is not modified')) {
        return { ok: true, modified: false };
      }
      console.error('Failed to edit message:', err.message);
      return { ok: false };
    }
  }

  /**
   * Edit message text (alias for editMessage)
   */
  async editMessageText(chatId, messageId, text, options = {}) {
    return this.editMessage(chatId, messageId, text, options);
  }

  /**
   * Answer callback query
   */
  async answerCallbackQuery(callbackQueryId, text = '') {
    try {
      const response = await axios.post(`${this.baseURL}/answerCallbackQuery`, {
        callback_query_id: callbackQueryId,
        text
      }, { timeout: 10000 });
      return response.data;
    } catch (err) {
      // Ignore "query is too old" errors
      if (err.response && err.response.status === 400) {
        return { ok: true };
      }
      console.error('Failed to answer callback:', err.message);
      return { ok: false };
    }
  }

  /**
   * Set bot commands (menu)
   */
  async setBotCommands(commands) {
    try {
      const scopes = [
        {},
        { scope: { type: 'all_private_chats' } },
        { scope: { type: 'all_group_chats' } },
        { scope: { type: 'all_chat_administrators' } }
      ];

      for (const scopeConfig of scopes) {
        const payload = { commands, ...scopeConfig };
        await axios.post(`${this.baseURL}/setMyCommands`, payload, {
          timeout: 10000
        });
      }
      return { ok: true };
    } catch (err) {
      console.error('Failed to set commands:', err.message);
      return { ok: false };
    }
  }
}

module.exports = TelegramAPI;
