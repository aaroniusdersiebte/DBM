import React, { useState, useEffect } from 'react';
import BingoDeckManager from './BingoDeckManager';
import BingoEventManager from './BingoEventManager';
import BingoSettings from './BingoSettings';

// Check if we're in Electron environment
const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const StreamingBingo = ({ config, onConfigChange }) => {
  const [activeTab, setActiveTab] = useState('decks');
  const [bingoConfig, setBingoConfig] = useState({
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
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadBingoConfig();
  }, []);

  const loadBingoConfig = async () => {
    if (!ipcRenderer) return;
    try {
      const currentBingoConfig = await ipcRenderer.invoke('bingo:loadConfig');
      if (currentBingoConfig) {
        setBingoConfig(currentBingoConfig);
      }
    } catch (error) {
      console.error('Error loading bingo config:', error);
    }
  };

  const saveBingoConfig = async (newConfig = bingoConfig) => {
    if (!ipcRenderer) {
      alert('Speichern nur in Electron App verfügbar.');
      return;
    }
    setSaving(true);
    try {
      await ipcRenderer.invoke('bingo:saveConfig', newConfig);
      setBingoConfig(newConfig);
      
      // Update main bot config to ensure commands are registered
      if (onConfigChange) {
        onConfigChange();
      }
      
      return true;
    } catch (error) {
      console.error('Error saving bingo config:', error);
      alert('Fehler beim Speichern der Bingo-Konfiguration!');
      return false;
    } finally {
      setSaving(false);
    }
  };

  const updateBingoConfig = (updates) => {
    const newConfig = { ...bingoConfig, ...updates };
    setBingoConfig(newConfig);
    saveBingoConfig(newConfig);
  };

  const tabs = [
    { id: 'decks', label: 'Bingo Decks', icon: '🎯' },
    { id: 'events', label: 'Event Management', icon: '🎮' },
    { id: 'settings', label: 'Bingo Einstellungen', icon: '⚙️' }
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'decks':
        return (
          <BingoDeckManager
            bingoConfig={bingoConfig}
            updateBingoConfig={updateBingoConfig}
            saving={saving}
          />
        );
      case 'events':
        return (
          <BingoEventManager
            bingoConfig={bingoConfig}
            updateBingoConfig={updateBingoConfig}
          />
        );
      case 'settings':
        return (
          <BingoSettings
            bingoConfig={bingoConfig}
            updateBingoConfig={updateBingoConfig}
            saving={saving}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '30px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: '600' }}>
          🎯 Streaming Bingo
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
          <span style={{ 
            color: bingoConfig.enabled ? 'var(--success-color)' : 'var(--text-muted)',
            fontWeight: '500'
          }}>
            {bingoConfig.enabled ? '✅ Aktiviert' : '❌ Deaktiviert'}
          </span>
          <button
            className={`btn ${bingoConfig.enabled ? 'btn-danger' : 'btn-success'}`}
            onClick={() => updateBingoConfig({ enabled: !bingoConfig.enabled })}
          >
            {bingoConfig.enabled ? 'Deaktivieren' : 'Aktivieren'}
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation" style={{
        display: 'flex',
        marginBottom: '30px',
        borderBottom: '1px solid var(--border-color)'
      }}>
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
            style={{
              padding: '12px 20px',
              border: 'none',
              background: 'none',
              color: activeTab === tab.id ? 'var(--accent-color)' : 'var(--text-secondary)',
              borderBottom: activeTab === tab.id ? '2px solid var(--accent-color)' : '2px solid transparent',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            <span>{tab.icon}</span>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {renderTabContent()}
    </div>
  );
};

export default StreamingBingo;