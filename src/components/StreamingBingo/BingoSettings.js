import React, { useState } from 'react';

const BingoSettings = ({ bingoConfig, updateBingoConfig, saving }) => {
  const [localConfig, setLocalConfig] = useState({ ...bingoConfig });

  const handleConfigChange = (key, value) => {
    const newConfig = { ...localConfig, [key]: value };
    setLocalConfig(newConfig);
  };

  const handleCardSizeChange = (dimension, value) => {
    const newCardSize = { ...localConfig.cardSize, [dimension]: value };
    const newConfig = { ...localConfig, cardSize: newCardSize };
    setLocalConfig(newConfig);
  };

  const handleCardDimensionsChange = (dimension, value) => {
    const newCardDimensions = { ...localConfig.cardDimensions, [dimension]: value };
    const newConfig = { ...localConfig, cardDimensions: newCardDimensions };
    setLocalConfig(newConfig);
  };

  const saveSettings = () => {
    updateBingoConfig(localConfig);
  };

  const resetToDefaults = () => {
    const defaultConfig = {
      slashCommand: '/bingo',
      cardSize: { width: 5, height: 5 },
      cardDimensions: { width: 800, height: 600 },
      reactionEmoji: '✅',
      bingoCommand: '/bingowin',
      bingoValidationChannelId: '',
      bingoConfirmationMessage: 'Event bestätigt! Aktualisiere Bingo-Karten...'
    };
    
    const newConfig = { ...localConfig, ...defaultConfig };
    setLocalConfig(newConfig);
    updateBingoConfig(newConfig);
  };

  return (
    <div>
      <div className="grid grid-2" style={{ gap: '30px' }}>
        {/* Command Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">⚡ Command Einstellungen</h3>
            <p className="card-subtitle">Konfiguration der Discord Commands</p>
          </div>

          <div className="form-group">
            <label className="form-label">Bingo Start Command</label>
            <input
              type="text"
              className="form-input"
              value={localConfig.slashCommand}
              onChange={(e) => handleConfigChange('slashCommand', e.target.value)}
              placeholder="/bingo"
            />
            <small style={{ color: 'var(--text-muted)' }}>
              Slash Command für Benutzer um eine neue Bingo-Karte anzufordern
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Bingo Win Command</label>
            <input
              type="text"
              className="form-input"
              value={localConfig.bingoCommand}
              onChange={(e) => handleConfigChange('bingoCommand', e.target.value)}
              placeholder="/bingowin"
            />
            <small style={{ color: 'var(--text-muted)' }}>
              Command für Benutzer um ein Bingo zu melden
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Event Reaktions-Emoji</label>
            <input
              type="text"
              className="form-input"
              value={localConfig.reactionEmoji}
              onChange={(e) => handleConfigChange('reactionEmoji', e.target.value)}
              placeholder="✅"
            />
            <small style={{ color: 'var(--text-muted)' }}>
              Emoji, mit dem Benutzer auf Event-Nachrichten reagieren, um sie als eingetreten zu markieren
            </small>
          </div>
        </div>

        {/* Card Configuration */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🎯 Bingo-Karten Konfiguration</h3>
            <p className="card-subtitle">Größe und Erscheinungsbild der Bingo-Karten</p>
          </div>

          <div className="form-group">
            <label className="form-label">Karten-Raster (Felder)</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="number"
                className="form-input"
                value={localConfig.cardSize.width}
                onChange={(e) => handleCardSizeChange('width', parseInt(e.target.value) || 5)}
                min="3"
                max="7"
                style={{ width: '80px' }}
              />
              <span>×</span>
              <input
                type="number"
                className="form-input"
                value={localConfig.cardSize.height}
                onChange={(e) => handleCardSizeChange('height', parseInt(e.target.value) || 5)}
                min="3"
                max="7"
                style={{ width: '80px' }}
              />
            </div>
            <small style={{ color: 'var(--text-muted)' }}>
              Anzahl der Felder (Breite × Höhe). Standard: 5×5 für klassisches Bingo
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">PNG Größe (Pixel)</label>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <input
                type="number"
                className="form-input"
                value={localConfig.cardDimensions.width}
                onChange={(e) => handleCardDimensionsChange('width', parseInt(e.target.value) || 800)}
                min="400"
                max="2000"
                step="50"
                style={{ width: '100px' }}
              />
              <span>×</span>
              <input
                type="number"
                className="form-input"
                value={localConfig.cardDimensions.height}
                onChange={(e) => handleCardDimensionsChange('height', parseInt(e.target.value) || 600)}
                min="300"
                max="2000"
                step="50"
                style={{ width: '100px' }}
              />
            </div>
            <small style={{ color: 'var(--text-muted)' }}>
              Auflösung der generierten PNG-Datei (Breite × Höhe)
            </small>
          </div>

          <div style={{ 
            padding: '10px', 
            background: 'var(--bg-tertiary)', 
            borderRadius: '6px',
            marginTop: '10px'
          }}>
            <strong>Vorschau:</strong> 
            {localConfig.cardSize.width}×{localConfig.cardSize.height} Karte = {localConfig.cardSize.width * localConfig.cardSize.height} Events benötigt
          </div>
        </div>

        {/* Message Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">💬 Nachrichten Einstellungen</h3>
            <p className="card-subtitle">Anpassung der Bot-Nachrichten</p>
          </div>

          <div className="form-group">
            <label className="form-label">Event Bestätigungs-Nachricht</label>
            <textarea
              className="form-textarea"
              value={localConfig.bingoConfirmationMessage}
              onChange={(e) => handleConfigChange('bingoConfirmationMessage', e.target.value)}
              placeholder="Event bestätigt! Aktualisiere Bingo-Karten..."
              rows="3"
            />
            <small style={{ color: 'var(--text-muted)' }}>
              Nachricht, die gesendet wird, wenn Sie ein Event bestätigen. 
              Unterstützt Variablen: {'{user.username}'}, {'{event.text}'}, etc.
            </small>
          </div>

          <div className="form-group">
            <label className="form-label">Bingo Validierungs-Channel ID (Optional)</label>
            <input
              type="text"
              className="form-input"
              value={localConfig.bingoValidationChannelId}
              onChange={(e) => handleConfigChange('bingoValidationChannelId', e.target.value)}
              placeholder="123456789012345678"
            />
            <small style={{ color: 'var(--text-muted)' }}>
              Discord Channel ID für Bingo-Validierungen. Leer lassen für Standard-Channel.
            </small>
          </div>
        </div>

        {/* Save Settings */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">💾 Einstellungen speichern</h3>
          </div>

          <div style={{ display: 'flex', gap: '10px' }}>
            <button 
              className="btn btn-primary" 
              onClick={saveSettings}
              disabled={saving}
            >
              {saving ? 'Speichert...' : 'Einstellungen speichern'}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={resetToDefaults}
            >
              Auf Standard zurücksetzen
            </button>
          </div>

          <div style={{ marginTop: '15px', fontSize: '12px', color: 'var(--text-muted)' }}>
            Die Einstellungen werden automatisch gespeichert und sofort aktiv.
          </div>
        </div>

        {/* Feature Status */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">📊 Feature Status</h3>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Streaming Bingo:</span>
              <span style={{ color: bingoConfig.enabled ? 'var(--success-color)' : 'var(--danger-color)' }}>
                {bingoConfig.enabled ? '✅ Aktiviert' : '❌ Deaktiviert'}
              </span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Verfügbare Decks:</span>
              <span>{bingoConfig.decks.length}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
              <span>Aktives Deck:</span>
              <span style={{ color: bingoConfig.activeDeckId ? 'var(--success-color)' : 'var(--warning-color)' }}>
                {bingoConfig.activeDeckId ? 
                  bingoConfig.decks.find(d => d.id === bingoConfig.activeDeckId)?.name || 'Unbekannt' : 
                  'Keines'
                }
              </span>
            </div>
            {bingoConfig.activeDeckId && (
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Events im aktiven Deck:</span>
                <span>
                  {bingoConfig.decks.find(d => d.id === bingoConfig.activeDeckId)?.events.length || 0}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Preview/Help Section */}
      <div className="card" style={{ marginTop: '30px' }}>
        <div className="card-header">
          <h3 className="card-title">📖 Funktionsweise</h3>
          <p className="card-subtitle">So funktioniert das Streaming Bingo System</p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          <div>
            <h4 style={{ color: 'var(--accent-color)', marginBottom: '10px' }}>1. Bingo anfordern</h4>
            <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
              Benutzer geben <code>{localConfig.slashCommand}</code> ein und erhalten:
              <br />• Einzelne Event-Nachrichten (nummeriert)
              <br />• Eine PNG Bingo-Karte
            </p>
          </div>

          <div>
            <h4 style={{ color: 'var(--accent-color)', marginBottom: '10px' }}>2. Events markieren</h4>
            <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
              Benutzer reagieren mit <code>{localConfig.reactionEmoji}</code> auf Event-Nachrichten.
              Sie erhalten eine Benachrichtigung zur Bestätigung.
            </p>
          </div>

          <div>
            <h4 style={{ color: 'var(--accent-color)', marginBottom: '10px' }}>3. Events bestätigen</h4>
            <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
              Sie bestätigen Events im "Event Management" Tab.
              Alle Bingo-Karten werden automatisch aktualisiert.
            </p>
          </div>

          <div>
            <h4 style={{ color: 'var(--accent-color)', marginBottom: '10px' }}>4. Bingo melden</h4>
            <p style={{ fontSize: '14px', lineHeight: '1.5', color: 'var(--text-secondary)' }}>
              Benutzer geben <code>{localConfig.bingoCommand}</code> ein.
              Das System validiert automatisch die Bingo-Karte.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BingoSettings;