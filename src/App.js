import React, { useState, useEffect } from 'react';
import './App.css';
import Layout from './components/Layout/Layout';
import Dashboard from './components/Dashboard/Dashboard';
import Settings from './components/Settings/Settings';
import Triggers from './components/Triggers/Triggers';
import Actions from './components/Actions/Actions';

// Check if we're in Electron environment
const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [botStatus, setBotStatus] = useState({ connected: false, ready: false });
  const [config, setConfig] = useState(null);

  useEffect(() => {
    loadConfig();
    checkBotStatus();
    
    // Check bot status periodically
    const statusInterval = setInterval(checkBotStatus, 5000);
    
    return () => clearInterval(statusInterval);
  }, []);

  const loadConfig = async () => {
    if (!ipcRenderer) {
      console.log('ipcRenderer not available - running in browser mode');
      return;
    }
    try {
      const appConfig = await ipcRenderer.invoke('config:load');
      const botConfig = await ipcRenderer.invoke('config:loadBotConfig');
      setConfig({ app: appConfig, bot: botConfig });
    } catch (error) {
      console.error('Error loading config:', error);
    }
  };

  const checkBotStatus = async () => {
    if (!ipcRenderer) return;
    try {
      const status = await ipcRenderer.invoke('bot:status');
      setBotStatus(status);
    } catch (error) {
      console.error('Error checking bot status:', error);
    }
  };

  const startBot = async () => {
    if (!ipcRenderer) {
      alert('Bot Funktionalität nur in Electron App verfügbar.');
      return;
    }
    if (!config?.bot?.token) {
      alert('Bitte konfiguriere zuerst den Bot Token in den Einstellungen.');
      setCurrentView('settings');
      return;
    }

    try {
      const result = await ipcRenderer.invoke('bot:start', config.bot);
      if (result.success) {
        checkBotStatus();
      } else {
        alert(`Fehler beim Starten des Bots: ${result.error}`);
      }
    } catch (error) {
      alert(`Unerwarteter Fehler: ${error.message}`);
    }
  };

  const stopBot = async () => {
    if (!ipcRenderer) {
      alert('Bot Funktionalität nur in Electron App verfügbar.');
      return;
    }
    try {
      const result = await ipcRenderer.invoke('bot:stop');
      if (result.success) {
        checkBotStatus();
      } else {
        alert(`Fehler beim Stoppen des Bots: ${result.error}`);
      }
    } catch (error) {
      alert(`Unerwarteter Fehler: ${error.message}`);
    }
  };

  const renderView = () => {
    const props = {
      config,
      setConfig,
      botStatus,
      startBot,
      stopBot,
      onConfigChange: loadConfig
    };

    switch (currentView) {
      case 'dashboard':
        return <Dashboard {...props} />;
      case 'settings':
        return <Settings {...props} />;
      case 'triggers':
        return <Triggers {...props} />;
      case 'actions':
        return <Actions {...props} />;
      default:
        return <Dashboard {...props} />;
    }
  };

  return (
    <div className="App">
      <Layout 
        currentView={currentView}
        setCurrentView={setCurrentView}
        botStatus={botStatus}
        startBot={startBot}
        stopBot={stopBot}
      >
        {renderView()}
      </Layout>
    </div>
  );
}

export default App;
