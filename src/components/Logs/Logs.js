import React, { useState, useEffect, useRef } from 'react';

// Check if we're in Electron environment
const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const Logs = () => {
  const [logs, setLogs] = useState([]);
  const [filteredLogs, setFilteredLogs] = useState([]);
  const [filter, setFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const [selectedLog, setSelectedLog] = useState(null);
  const logsEndRef = useRef(null);

  useEffect(() => {
    if (!ipcRenderer) return;

    // Load existing logs
    ipcRenderer.invoke('logs:get').then(setLogs);

    // Listen for new logs
    const handleNewLog = (event, log) => {
      setLogs(prevLogs => [...prevLogs, log]);
    };

    ipcRenderer.on('bot-log', handleNewLog);

    return () => {
      ipcRenderer.removeListener('bot-log', handleNewLog);
    };
  }, []);

  useEffect(() => {
    // Filter logs based on level and search term
    let filtered = logs;

    if (filter !== 'all') {
      filtered = filtered.filter(log => log.level === filter);
    }

    if (searchTerm) {
      filtered = filtered.filter(log => 
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        JSON.stringify(log.data || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [logs, filter, searchTerm]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [filteredLogs, autoScroll]);

  const clearLogs = async () => {
    if (!ipcRenderer) return;
    
    if (confirm('Alle Logs löschen?')) {
      await ipcRenderer.invoke('logs:clear');
      setLogs([]);
      setSelectedLog(null);
    }
  };

  const getLogColor = (level) => {
    switch (level) {
      case 'success': return '#22c55e';
      case 'error': return '#ef4444';
      case 'warn': return '#f59e0b';
      case 'info': return '#3b82f6';
      default: return 'var(--text-secondary)';
    }
  };

  const getLogIcon = (level) => {
    switch (level) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warn': return '⚠️';
      case 'info': return 'ℹ️';
      default: return '📝';
    }
  };

  const formatTimestamp = (timestamp) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('de-DE') + '.' + String(date.getMilliseconds()).padStart(3, '0');
  };

  const formatData = (data) => {
    if (!data) return '';
    if (typeof data === 'string') return data;
    return JSON.stringify(data, null, 2);
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 style={{ fontSize: '28px', fontWeight: '600' }}>
          Bot Logs & Debug
        </h1>
        <div className="flex gap-2">
          <button 
            className="btn btn-secondary"
            onClick={clearLogs}
          >
            🗑️ Logs löschen
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="card mb-4">
        <div className="card-header">
          <h3 className="card-title">Filter & Optionen</h3>
        </div>
        
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center', flexWrap: 'wrap' }}>
          <div>
            <label className="form-label" style={{ marginBottom: '5px' }}>Log Level:</label>
            <select 
              className="form-select"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              style={{ minWidth: '120px' }}
            >
              <option value="all">Alle</option>
              <option value="success">✅ Success</option>
              <option value="info">ℹ️ Info</option>
              <option value="warn">⚠️ Warning</option>
              <option value="error">❌ Error</option>
            </select>
          </div>

          <div style={{ flex: 1, minWidth: '200px' }}>
            <label className="form-label" style={{ marginBottom: '5px' }}>Suchen:</label>
            <input
              type="text"
              className="form-input"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Nach Nachricht oder Daten suchen..."
            />
          </div>

          <div>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginTop: '20px' }}>
              <input
                type="checkbox"
                checked={autoScroll}
                onChange={(e) => setAutoScroll(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              Auto-Scroll
            </label>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-4 mb-4">
        {['success', 'info', 'warn', 'error'].map(level => {
          const count = logs.filter(log => log.level === level).length;
          return (
            <div key={level} className="card" style={{ textAlign: 'center', padding: '15px' }}>
              <div style={{ fontSize: '24px', color: getLogColor(level) }}>
                {getLogIcon(level)}
              </div>
              <div style={{ fontSize: '20px', fontWeight: 'bold', color: getLogColor(level) }}>
                {count}
              </div>
              <div style={{ fontSize: '12px', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                {level}
              </div>
            </div>
          );
        })}
      </div>

      {/* Logs Display */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Live Logs ({filteredLogs.length})</h3>
          <p className="card-subtitle">
            Zeigt alle Bot-Aktivitäten in Echtzeit
          </p>
        </div>
        
        <div style={{ 
          height: '500px', 
          overflowY: 'auto', 
          backgroundColor: '#1a1a1a', 
          padding: '10px',
          fontFamily: 'monospace',
          fontSize: '13px'
        }}>
          {filteredLogs.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              color: 'var(--text-muted)', 
              fontStyle: 'italic',
              padding: '50px 0'
            }}>
              {logs.length === 0 ? 
                'Noch keine Logs. Starte den Bot um Logs zu sehen.' :
                'Keine Logs entsprechen den aktuellen Filtern.'
              }
            </div>
          ) : (
            filteredLogs.map((log, index) => (
              <div 
                key={index}
                style={{
                  padding: '8px 12px',
                  borderLeft: `3px solid ${getLogColor(log.level)}`,
                  marginBottom: '5px',
                  backgroundColor: selectedLog === index ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  transition: 'background-color 0.2s'
                }}
                onClick={() => setSelectedLog(selectedLog === index ? null : index)}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: getLogColor(log.level) }}>
                    {getLogIcon(log.level)}
                  </span>
                  <span style={{ color: '#888', fontSize: '11px', minWidth: '80px' }}>
                    {formatTimestamp(log.timestamp)}
                  </span>
                  <span style={{ color: '#fff', flex: 1 }}>
                    {log.message}
                  </span>
                  {log.data && (
                    <span style={{ color: '#666', fontSize: '11px' }}>
                      📋 Daten
                    </span>
                  )}
                </div>
                
                {selectedLog === index && log.data && (
                  <div style={{
                    marginTop: '10px',
                    padding: '10px',
                    backgroundColor: 'rgba(0, 0, 0, 0.3)',
                    borderRadius: '4px',
                    fontSize: '11px',
                    color: '#ccc',
                    whiteSpace: 'pre-wrap',
                    wordBreak: 'break-word'
                  }}>
                    {formatData(log.data)}
                  </div>
                )}
              </div>
            ))
          )}
          <div ref={logsEndRef} />
        </div>
      </div>

      {/* Debug Help */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">🔍 Debug-Hilfe für Emoji Reactions</h3>
        </div>
        
        <div style={{ padding: '15px' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>
            Emoji Reactions debuggen:
          </h4>
          
          <ol style={{ color: 'var(--text-secondary)', paddingLeft: '20px' }}>
            <li style={{ marginBottom: '8px' }}>
              <strong>Schritt 1:</strong> Erstelle einen Message Reaction Trigger
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>Schritt 2:</strong> Teste verschiedene Emoji-Formate:
              <ul style={{ marginTop: '5px', paddingLeft: '20px' }}>
                <li>Unicode: <code>👍</code></li>
                <li>Name ohne Doppelpunkte: <code>thumbsup</code></li>
                <li>Name mit Doppelpunkten: <code>:thumbsup:</code></li>
              </ul>
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>Schritt 3:</strong> Reagiere auf eine Nachricht und schaue hier in die Logs
            </li>
            <li style={{ marginBottom: '8px' }}>
              <strong>Schritt 4:</strong> Suche nach "👍 Reaktion hinzugefügt" und "🔍 Emoji Match Test"
            </li>
          </ol>

          <div style={{ 
            marginTop: '15px', 
            padding: '10px', 
            backgroundColor: 'rgba(59, 130, 246, 0.1)', 
            borderRadius: '6px' 
          }}>
            <strong style={{ color: '#3b82f6' }}>💡 Tipp:</strong>
            <span style={{ color: 'var(--text-secondary)' }}>
              {' '}Die Logs zeigen dir genau welches Emoji angekommen ist und warum es (nicht) matcht!
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Logs;