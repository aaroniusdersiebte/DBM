const fs = require('fs');
const path = require('path');
const crypto = require('crypto-js');
const os = require('os');

class ConfigService {
  constructor() {
    // Use a safe config directory that works in both dev and production
    this.configDir = this.getConfigDirectory();
    this.appConfigPath = path.join(this.configDir, 'app-settings.json');
    this.botConfigPath = path.join(this.configDir, 'bot-config.json');
    this.encryptionKey = 'discord-bot-manager-key'; // In production: use proper key management
    
    this.ensureConfigDirectory();
  }

  getConfigDirectory() {
    // Try to use Electron's app.getPath if available
    try {
      const { app } = require('electron');
      if (app && app.getPath) {
        return path.join(app.getPath('userData'), 'config');
      }
    } catch (error) {
      // Electron not available or not in main process
    }

    // Fallback to OS-specific user data directory
    const userDataDir = process.env.APPDATA || 
                       (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : 
                        path.join(os.homedir(), '.local', 'share'));
    
    return path.join(userDataDir, 'DiscordBotManager', 'config');
  }

  ensureConfigDirectory() {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
    } catch (error) {
      console.error('Fehler beim Erstellen des Konfigurationsverzeichnisses:', error);
      // Fallback: use temp directory
      this.configDir = path.join(os.tmpdir(), 'DiscordBotManager', 'config');
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }
      this.appConfigPath = path.join(this.configDir, 'app-settings.json');
      this.botConfigPath = path.join(this.configDir, 'bot-config.json');
    }
  }

  loadConfig() {
    try {
      if (fs.existsSync(this.appConfigPath)) {
        const data = fs.readFileSync(this.appConfigPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Fehler beim Laden der App-Konfiguration:', error);
    }
    
    return this.getDefaultAppConfig();
  }

  saveConfig(config) {
    try {
      fs.writeFileSync(this.appConfigPath, JSON.stringify(config, null, 2));
      console.log('App-Konfiguration gespeichert');
      return true;
    } catch (error) {
      console.error('Fehler beim Speichern der App-Konfiguration:', error);
      throw error;
    }
  }

  loadBotConfig() {
    try {
      if (fs.existsSync(this.botConfigPath)) {
        const data = fs.readFileSync(this.botConfigPath, 'utf8');
        const config = JSON.parse(data);
        
        // Decrypt sensitive data
        if (config.token) {
          config.token = this.decrypt(config.token);
        }
        
        return config;
      }
    } catch (error) {
      console.error('Fehler beim Laden der Bot-Konfiguration:', error);
    }
    
    return this.getDefaultBotConfig();
  }

  saveBotConfig(config) {
    try {
      // Encrypt sensitive data
      const configToSave = { ...config };
      if (configToSave.token) {
        configToSave.token = this.encrypt(configToSave.token);
      }
      
      fs.writeFileSync(this.botConfigPath, JSON.stringify(configToSave, null, 2));
      console.log('Bot-Konfiguration gespeichert');
      return true;
    } catch (error) {
      console.error('Fehler beim Speichern der Bot-Konfiguration:', error);
      throw error;
    }
  }

  encrypt(text) {
    try {
      return crypto.AES.encrypt(text, this.encryptionKey).toString();
    } catch (error) {
      console.error('Verschlüsselungsfehler:', error);
      return text; // Fallback: return unencrypted
    }
  }

  decrypt(encryptedText) {
    try {
      const bytes = crypto.AES.decrypt(encryptedText, this.encryptionKey);
      return bytes.toString(crypto.enc.Utf8);
    } catch (error) {
      console.error('Entschlüsselungsfehler:', error);
      return encryptedText; // Fallback: return as-is
    }
  }

  getDefaultAppConfig() {
    return {
      theme: 'dark',
      language: 'de',
      autoStart: false,
      minimizeToTray: true,
      notifications: true
    };
  }

  getDefaultBotConfig() {
    return {
      token: '',
      guildId: '',
      obsWebSocketUrl: 'ws://localhost:4455',
      streamerbotUrl: 'ws://localhost:8080',
      commands: [],
      triggers: [],
      actions: []
    };
  }

  // Utility methods for managing triggers and actions
  addTrigger(trigger) {
    const config = this.loadBotConfig();
    config.triggers = config.triggers || [];
    config.triggers.push({
      id: this.generateId(),
      ...trigger,
      createdAt: new Date().toISOString()
    });
    this.saveBotConfig(config);
    return config;
  }

  updateTrigger(id, trigger) {
    const config = this.loadBotConfig();
    const index = config.triggers.findIndex(t => t.id === id);
    if (index !== -1) {
      config.triggers[index] = { ...config.triggers[index], ...trigger };
      this.saveBotConfig(config);
    }
    return config;
  }

  deleteTrigger(id) {
    const config = this.loadBotConfig();
    config.triggers = config.triggers.filter(t => t.id !== id);
    this.saveBotConfig(config);
    return config;
  }

  addAction(action) {
    const config = this.loadBotConfig();
    config.actions = config.actions || [];
    config.actions.push({
      id: this.generateId(),
      ...action,
      createdAt: new Date().toISOString()
    });
    this.saveBotConfig(config);
    return config;
  }

  updateAction(id, action) {
    const config = this.loadBotConfig();
    const index = config.actions.findIndex(a => a.id === id);
    if (index !== -1) {
      config.actions[index] = { ...config.actions[index], ...action };
      this.saveBotConfig(config);
    }
    return config;
  }

  deleteAction(id) {
    const config = this.loadBotConfig();
    config.actions = config.actions.filter(a => a.id !== id);
    this.saveBotConfig(config);
    return config;
  }

  generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
}

module.exports = new ConfigService();