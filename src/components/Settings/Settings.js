import React, { useState, useEffect } from 'react';

// Check if we're in Electron environment
const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const Settings = ({ config, onConfigChange }) => {
  const [botToken, setBotToken] = useState('');
  const [guildId, setGuildId] = useState('');
  const [obsWebSocketUrl, setObsWebSocketUrl] = useState('ws://localhost:4455');
  const [streamerbotUrl, setStreamerbotUrl] = useState('ws://localhost:8080');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (config?.bot) {
      setBotToken(config.bot.token || '');
      setGuildId(config.bot.guildId || '');
      setObsWebSocketUrl(config.bot.obsWebSocketUrl || 'ws://localhost:4455');
      setStreamerbotUrl(config.bot.streamerbotUrl || 'ws://localhost:8080');
    }
  }, [config]);

  const handleSave = async () => {
    if (!ipcRenderer) {
      alert('Speichern nur in Electron App verfügbar.');
      return;
    }
    setSaving(true);
    try {
      const newBotConfig = {
        token: botToken,
        guildId: guildId,
        obsWebSocketUrl: obsWebSocketUrl,
        streamerbotUrl: streamerbotUrl,
        commands: config?.bot?.commands || [],
        triggers: config?.bot?.triggers || [],
        actions: config?.bot?.actions || []
      };

      await ipcRenderer.invoke('config:saveBotConfig', newBotConfig);
      
      if (onConfigChange) {
        onConfigChange();
      }
      
      alert('Einstellungen erfolgreich gespeichert!');
    } catch (error) {
      console.error('Error saving config:', error);
      alert('Fehler beim Speichern der Einstellungen!');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <h1 style={{ marginBottom: '30px', fontSize: '28px', fontWeight: '600' }}>
        Einstellungen
      </h1>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Discord Bot Konfiguration</h3>
          <p className="card-subtitle">Grundlegende Bot-Einstellungen</p>
        </div>
        
        <div className="form-group">
          <label className="form-label">Bot Token</label>
          <input
            type="password"
            className="form-input"
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder="Bot Token von Discord Developer Portal"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Server ID (Guild ID)</label>
          <input
            type="text"
            className="form-input"
            value={guildId}
            onChange={(e) => setGuildId(e.target.value)}
            placeholder="Discord Server ID"
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">WebSocket Verbindungen</h3>
          <p className="card-subtitle">Konfiguration für externe Tools</p>
        </div>
        
        <div className="form-group">
          <label className="form-label">OBS WebSocket URL</label>
          <input
            type="text"
            className="form-input"
            value={obsWebSocketUrl}
            onChange={(e) => setObsWebSocketUrl(e.target.value)}
            placeholder="ws://localhost:4455"
          />
        </div>

        <div className="form-group">
          <label className="form-label">StreamerBot WebSocket URL</label>
          <input
            type="text"
            className="form-input"
            value={streamerbotUrl}
            onChange={(e) => setStreamerbotUrl(e.target.value)}
            placeholder="ws://localhost:8080"
          />
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Speichern</h3>
        </div>
        
        <button 
          className="btn btn-primary" 
          onClick={handleSave}
          disabled={saving}
        >
          {saving ? 'Speichert...' : 'Einstellungen speichern'}
        </button>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Anleitung</h3>
        </div>
        <div style={{ color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          <p style={{ marginBottom: '10px' }}>
            <strong>Bot Token:</strong> Erstelle eine Anwendung im Discord Developer Portal, 
            erstelle einen Bot und kopiere den Token hier rein.
          </p>
          <p style={{ marginBottom: '10px' }}>
            <strong>Server ID:</strong> Rechtsklick auf deinen Discord Server → "Server-ID kopieren" 
            (Entwicklermodus muss aktiviert sein).
          </p>
          <p>
            <strong>WebSocket URLs:</strong> Diese werden für die Integration mit OBS und StreamerBot verwendet. 
            Standardports sollten in den meisten Fällen funktionieren.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
