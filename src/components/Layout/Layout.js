import React from 'react';

const Layout = ({ children, currentView, setCurrentView, botStatus, startBot, stopBot }) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'triggers', label: 'Trigger & Commands', icon: '⚡' },
    { id: 'actions', label: 'Aktionen & Workflows', icon: '🔧' },
    { id: 'streaming-bingo', label: 'Streaming Bingo', icon: '🎯' },
    { id: 'logs', label: 'Logs & Debug', icon: '🔍' },
    { id: 'settings', label: 'Einstellungen', icon: '⚙️' }
  ];

  return (
    <div className="layout">
      <div className="sidebar">
        <div className="sidebar-header">
          <h1 className="sidebar-title">Discord Bot Manager</h1>
        </div>
        
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <button
              key={item.id}
              className={`nav-item ${currentView === item.id ? 'active' : ''}`}
              onClick={() => setCurrentView(item.id)}
            >
              <span style={{ marginRight: '10px' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>

        <div className="bot-controls">
          <div className="bot-status">
            <span className={`status-indicator ${botStatus.connected ? 'status-connected' : 'status-disconnected'}`}></span>
            <span>
              {botStatus.connected ? 'Bot Online' : 'Bot Offline'}
              {botStatus.ready && ' (Bereit)'}
            </span>
          </div>
          
          <div className="flex gap-2">
            {!botStatus.connected ? (
              <button className="btn btn-success" onClick={startBot}>
                Bot Starten
              </button>
            ) : (
              <button className="btn btn-danger" onClick={stopBot}>
                Bot Stoppen
              </button>
            )}
          </div>
        </div>
      </div>

      <main className="main-content">
        {children}
      </main>
    </div>
  );
};

export default Layout;
