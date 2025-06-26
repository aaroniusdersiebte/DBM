// Utility functions for the Discord Bot Manager

class Utils {
  // Validate Discord Bot Token format
  static validateBotToken(token) {
    if (!token || typeof token !== 'string') {
      return false;
    }
    
    // Basic format check for Discord bot tokens
    const tokenRegex = /^[A-Za-z0-9._-]{59,}$/;
    return tokenRegex.test(token);
  }

  // Validate Discord Guild ID format
  static validateGuildId(guildId) {
    if (!guildId || typeof guildId !== 'string') {
      return false;
    }
    
    // Discord IDs are snowflakes (17-19 digits)
    const idRegex = /^\d{17,19}$/;
    return idRegex.test(guildId);
  }

  // Format timestamp for display
  static formatTimestamp(timestamp) {
    return new Date(timestamp).toLocaleString('de-DE');
  }

  // Validate WebSocket URL
  static validateWebSocketUrl(url) {
    try {
      const parsed = new URL(url);
      return parsed.protocol === 'ws:' || parsed.protocol === 'wss:';
    } catch {
      return false;
    }
  }

  // Sanitize filename for safe file operations
  static sanitizeFilename(filename) {
    return filename.replace(/[^a-z0-9_-]/gi, '_').toLowerCase();
  }

  // Deep clone object
  static deepClone(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  // Debounce function
  static debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }

  // Check if object is empty
  static isEmpty(obj) {
    return Object.keys(obj).length === 0;
  }

  // Generate random ID
  static generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }

  // Validate email format
  static validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Format file size
  static formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Escape HTML
  static escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Parse variables in text
  static parseVariables(text, variables) {
    if (!text || typeof text !== 'string') return text;
    
    let result = text;
    Object.keys(variables).forEach(key => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, variables[key] || '');
    });
    
    return result;
  }

  // Validate JSON string
  static isValidJson(str) {
    try {
      JSON.parse(str);
      return true;
    } catch {
      return false;
    }
  }

  // Truncate text
  static truncate(text, length = 100) {
    if (!text || text.length <= length) return text;
    return text.substring(0, length) + '...';
  }
}

module.exports = Utils;
