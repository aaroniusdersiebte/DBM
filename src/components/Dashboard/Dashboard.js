import React from 'react';

const Dashboard = ({ botStatus, config }) => {
  const stats = {
    totalCommands: config?.bot?.commands?.length || 0,
    totalTriggers: config?.bot?.triggers?.length || 0,
    totalActions: config?.bot?.actions?.length || 0,
    uptime: botStatus.connected ? 'Läuft' : 'Gestoppt'
  };

  return (
    <div>
      <h1 style={{ marginBottom: '30px', fontSize: '28px', fontWeight: '600' }}>
        Dashboard
      </h1>

      <div className="grid grid-2">
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Bot Status</h3>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span>Verbindung:</span>
              <span className={botStatus.connected ? 'text-success' : 'text-danger'}>
                {botStatus.connected ? 'Verbunden' : 'Getrennt'}
              </span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Status:</span>
              <span className={botStatus.ready ? 'text-success' : 'text-warning'}>
                {botStatus.ready ? 'Bereit' : 'Nicht bereit'}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Laufzeit:</span>
              <span>{stats.uptime}</span>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <h3 className="card-title">Statistiken</h3>
          </div>
          <div>
            <div className="flex justify-between mb-2">
              <span>Commands:</span>
              <span>{stats.totalCommands}</span>
            </div>
            <div className="flex justify-between mb-2">
              <span>Trigger:</span>
              <span>{stats.totalTriggers}</span>
            </div>
            <div className="flex justify-between">
              <span>Aktionen:</span>
              <span>{stats.totalActions}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Schnellzugriff</h3>
          <p className="card-subtitle">Häufig verwendete Funktionen</p>
        </div>
        <div className="grid grid-3">
          <button className="btn btn-primary">
            🆕 Neuer Command
          </button>
          <button className="btn btn-primary">
            ⚡ Neuer Trigger
          </button>
          <button className="btn btn-primary">
            🔧 Neue Aktion
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Aktivitätslog</h3>
          <p className="card-subtitle">Letzte Bot-Aktivitäten</p>
        </div>
        <div style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
          Noch keine Aktivitäten zu zeigen...
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
