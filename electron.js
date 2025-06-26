const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const isDev = require('electron-is-dev');

let mainWindow;
let botManager;
let ConfigService;
let botLogs = []; // Store bot logs

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      enableRemoteModule: false,
      webSecurity: false
    },
    titleBarStyle: 'default',
    frame: true,
    show: false
  });

  mainWindow.loadURL(
    isDev
      ? 'http://localhost:3000'
      : `file://${path.join(__dirname, '../build/index.html')}`
  );

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  if (isDev) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Log function that stores logs and sends to frontend
function addBotLog(level, message, data = null) {
  const logEntry = {
    timestamp: new Date().toISOString(),
    level: level, // 'info', 'warn', 'error', 'success'
    message: message,
    data: data
  };
  
  botLogs.push(logEntry);
  
  // Keep only last 100 logs
  if (botLogs.length > 100) {
    botLogs = botLogs.slice(-100);
  }
  
  // Send log to frontend if window exists
  if (mainWindow) {
    mainWindow.webContents.send('bot-log', logEntry);
  }
  
  console.log(`[${level.toUpperCase()}] ${message}`, data || '');
}

app.whenReady().then(() => {
  createWindow();
  
  // Initialize services after app is ready
  ConfigService = require('./src/services/config/configService');
  const BotManager = require('./src/services/bot/botManager');
  botManager = new BotManager();
  
  // Pass log function to bot manager
  botManager.setLogger(addBotLog);
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    // Stop bot before closing
    if (botManager) {
      botManager.stopBot();
    }
    app.quit();
  }
});

// IPC Handlers for Bot Management
ipcMain.handle('bot:start', async (event, config) => {
  try {
    addBotLog('info', 'Bot wird gestartet...', { token: config.token ? '***' : 'missing', guildId: config.guildId });
    await botManager.startBot(config);
    addBotLog('success', 'Bot erfolgreich gestartet');
    return { success: true };
  } catch (error) {
    addBotLog('error', 'Fehler beim Starten des Bots', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('bot:stop', async () => {
  try {
    addBotLog('info', 'Bot wird gestoppt...');
    await botManager.stopBot();
    addBotLog('success', 'Bot erfolgreich gestoppt');
    return { success: true };
  } catch (error) {
    addBotLog('error', 'Fehler beim Stoppen des Bots', error.message);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('bot:status', () => {
  return botManager.getStatus();
});

// IPC Handlers for Config Management
ipcMain.handle('config:load', () => {
  if (!ConfigService) {
    ConfigService = require('./src/services/config/configService');
  }
  return ConfigService.loadConfig();
});

ipcMain.handle('config:save', (event, config) => {
  if (!ConfigService) {
    ConfigService = require('./src/services/config/configService');
  }
  return ConfigService.saveConfig(config);
});

ipcMain.handle('config:loadBotConfig', () => {
  if (!ConfigService) {
    ConfigService = require('./src/services/config/configService');
  }
  return ConfigService.loadBotConfig();
});

ipcMain.handle('config:saveBotConfig', (event, config) => {
  if (!ConfigService) {
    ConfigService = require('./src/services/config/configService');
  }
  return ConfigService.saveBotConfig(config);
});

// IPC Handlers for Trigger Management
ipcMain.handle('config:addTrigger', (event, trigger) => {
  if (!ConfigService) {
    ConfigService = require('./src/services/config/configService');
  }
  const result = ConfigService.addTrigger(trigger);
  addBotLog('success', `Trigger erstellt: ${trigger.name} (${trigger.type})`, trigger);
  return result;
});

ipcMain.handle('config:updateTrigger', (event, id, trigger) => {
  if (!ConfigService) {
    ConfigService = require('./src/services/config/configService');
  }
  const result = ConfigService.updateTrigger(id, trigger);
  addBotLog('success', `Trigger aktualisiert: ${trigger.name} (${trigger.type})`, trigger);
  return result;
});

ipcMain.handle('config:deleteTrigger', (event, id) => {
  if (!ConfigService) {
    ConfigService = require('./src/services/config/configService');
  }
  const result = ConfigService.deleteTrigger(id);
  addBotLog('success', `Trigger gelöscht: ${id}`);
  return result;
});

// IPC Handlers for Action Management
ipcMain.handle('config:addAction', (event, action) => {
  if (!ConfigService) {
    ConfigService = require('./src/services/config/configService');
  }
  const result = ConfigService.addAction(action);
  addBotLog('success', `Aktion erstellt: ${action.name} (${action.type})`, action);
  return result;
});

ipcMain.handle('config:updateAction', (event, id, action) => {
  if (!ConfigService) {
    ConfigService = require('./src/services/config/configService');
  }
  const result = ConfigService.updateAction(id, action);
  addBotLog('success', `Aktion aktualisiert: ${action.name} (${action.type})`, action);
  return result;
});

ipcMain.handle('config:deleteAction', (event, id) => {
  if (!ConfigService) {
    ConfigService = require('./src/services/config/configService');
  }
  const result = ConfigService.deleteAction(id);
  addBotLog('success', `Aktion gelöscht: ${id}`);
  return result;
});

// IPC Handlers for Logs
ipcMain.handle('logs:get', () => {
  return botLogs;
});

ipcMain.handle('logs:clear', () => {
  botLogs = [];
  addBotLog('info', 'Logs gelöscht');
  return true;
});

// File Dialog Handler
ipcMain.handle('dialog:selectFile', async (event, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options);
  return result;
});

// IPC Handlers for Bingo Management
ipcMain.handle('bingo:loadConfig', () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const userDataDir = process.env.APPDATA || 
                       (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : 
                        path.join(os.homedir(), '.local', 'share'));
    const configDir = path.join(userDataDir, 'DiscordBotManager', 'config');
    const bingoConfigPath = path.join(configDir, 'bingo-config.json');
    
    if (fs.existsSync(bingoConfigPath)) {
      const data = fs.readFileSync(bingoConfigPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    addBotLog('error', 'Fehler beim Laden der Bingo-Konfiguration', error.message);
  }
  
  return {
    enabled: false,
    slashCommand: '/bingo',
    cardSize: { width: 5, height: 5 },
    cardDimensions: { width: 800, height: 600 },
    reactionEmoji: '✅',
    bingoCommand: '/bingowin',
    bingoValidationChannelId: '',
    bingoConfirmationMessage: 'Event bestätigt! Aktualisiere Bingo-Karten...',
    decks: [],
    activeDeckId: null,
    eventNotifications: []
  };
});

ipcMain.handle('bingo:saveConfig', (event, config) => {
  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const userDataDir = process.env.APPDATA || 
                       (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : 
                        path.join(os.homedir(), '.local', 'share'));
    const configDir = path.join(userDataDir, 'DiscordBotManager', 'config');
    
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    
    const bingoConfigPath = path.join(configDir, 'bingo-config.json');
    fs.writeFileSync(bingoConfigPath, JSON.stringify(config, null, 2));
    
    addBotLog('success', 'Bingo-Konfiguration gespeichert', { enabled: config.enabled, decksCount: config.decks.length });
    return true;
  } catch (error) {
    addBotLog('error', 'Fehler beim Speichern der Bingo-Konfiguration', error.message);
    throw error;
  }
});

ipcMain.handle('bingo:getGameData', () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const userDataDir = process.env.APPDATA || 
                       (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : 
                        path.join(os.homedir(), '.local', 'share'));
    const dataDir = path.join(userDataDir, 'DiscordBotManager', 'bingo-data');
    
    let eventNotifications = [];
    let activeGames = [];
    let bingoWins = [];
    
    // Load event notifications
    const notificationsFile = path.join(dataDir, 'event-notifications.json');
    if (fs.existsSync(notificationsFile)) {
      eventNotifications = JSON.parse(fs.readFileSync(notificationsFile, 'utf8'));
    }
    
    // Load active games
    const gamesFile = path.join(dataDir, 'active-games.json');
    if (fs.existsSync(gamesFile)) {
      activeGames = JSON.parse(fs.readFileSync(gamesFile, 'utf8'));
    }
    
    // Load bingo wins
    const winsFile = path.join(dataDir, 'bingo-wins.json');
    if (fs.existsSync(winsFile)) {
      bingoWins = JSON.parse(fs.readFileSync(winsFile, 'utf8'));
    }
    
    return {
      eventNotifications,
      activeGames,
      bingoWins
    };
  } catch (error) {
    addBotLog('error', 'Fehler beim Laden der Bingo-Daten', error.message);
    return {
      eventNotifications: [],
      activeGames: [],
      bingoWins: []
    };
  }
});

ipcMain.handle('bingo:confirmEvent', (event, eventId) => {
  try {
    // This would trigger the bot to confirm the event and update all cards
    addBotLog('success', `Event bestätigt: ${eventId}`);
    // TODO: Implement actual event confirmation logic
    return true;
  } catch (error) {
    addBotLog('error', 'Fehler beim Bestätigen des Events', error.message);
    throw error;
  }
});

ipcMain.handle('bingo:dismissEvent', (event, eventId) => {
  try {
    // Remove event notification without confirming
    addBotLog('info', `Event abgelehnt: ${eventId}`);
    // TODO: Implement actual event dismissal logic
    return true;
  } catch (error) {
    addBotLog('error', 'Fehler beim Ablehnen des Events', error.message);
    throw error;
  }
});

ipcMain.handle('bingo:validateBingo', (event, { userId, gameId }) => {
  try {
    // TODO: Implement actual bingo validation logic
    addBotLog('info', `Bingo validiert für User ${userId}, Game ${gameId}`);
    return {
      isValid: true,
      username: 'TestUser', // Would get from actual game data
      reason: null
    };
  } catch (error) {
    addBotLog('error', 'Fehler beim Validieren des Bingos', error.message);
    throw error;
  }
});

ipcMain.handle('bingo:dismissBingo', (event, winId) => {
  try {
    addBotLog('info', `Bingo abgelehnt: ${winId}`);
    // TODO: Implement actual bingo dismissal logic
    return true;
  } catch (error) {
    addBotLog('error', 'Fehler beim Ablehnen des Bingos', error.message);
    throw error;
  }
});

ipcMain.handle('bingo:clearAllGames', () => {
  try {
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    
    const userDataDir = process.env.APPDATA || 
                       (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : 
                        path.join(os.homedir(), '.local', 'share'));
    const dataDir = path.join(userDataDir, 'DiscordBotManager', 'bingo-data');
    
    // Clear all game files
    const files = ['active-games.json', 'bingo-wins.json', 'event-notifications.json', 'game-messages.json'];
    files.forEach(file => {
      const filePath = path.join(dataDir, file);
      if (fs.existsSync(filePath)) {
        fs.writeFileSync(filePath, '[]');
      }
    });
    
    addBotLog('success', 'Alle Bingo-Spiele gelöscht');
    return true;
  } catch (error) {
    addBotLog('error', 'Fehler beim Löschen der Spiele', error.message);
    throw error;
  }
});