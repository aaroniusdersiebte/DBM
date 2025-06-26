import React, { useState, useEffect } from 'react';

// Check if we're in Electron environment
const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const BingoEventManager = ({ bingoConfig, updateBingoConfig }) => {
  const [eventNotifications, setEventNotifications] = useState([]);
  const [activeGames, setActiveGames] = useState([]);
  const [bingoWins, setBingoWins] = useState([]);

  useEffect(() => {
    loadBingoData();
    
    // Set up periodic refresh
    const interval = setInterval(loadBingoData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadBingoData = async () => {
    if (!ipcRenderer) return;
    
    try {
      const data = await ipcRenderer.invoke('bingo:getGameData');
      if (data) {
        setEventNotifications(data.eventNotifications || []);
        setActiveGames(data.activeGames || []);
        setBingoWins(data.bingoWins || []);
      }
    } catch (error) {
      console.error('Error loading bingo data:', error);
    }
  };

  const confirmEvent = async (eventId) => {
    if (!ipcRenderer) return;
    
    try {
      await ipcRenderer.invoke('bingo:confirmEvent', eventId);
      await loadBingoData();
    } catch (error) {
      console.error('Error confirming event:', error);
      alert('Fehler beim Bestätigen des Events!');
    }
  };

  const dismissEvent = async (eventId) => {
    if (!ipcRenderer) return;
    
    try {
      await ipcRenderer.invoke('bingo:dismissEvent', eventId);
      await loadBingoData();
    } catch (error) {
      console.error('Error dismissing event:', error);
    }
  };

  const validateBingo = async (userId, gameId) => {
    if (!ipcRenderer) return;
    
    try {
      const result = await ipcRenderer.invoke('bingo:validateBingo', { userId, gameId });
      if (result.isValid) {
        alert(`Bingo bestätigt für User ${result.username}!`);
      } else {
        alert(`Bingo ungültig für User ${result.username}. Grund: ${result.reason}`);
      }
      await loadBingoData();
    } catch (error) {
      console.error('Error validating bingo:', error);
      alert('Fehler beim Validieren des Bingos!');
    }
  };

  const dismissBingo = async (winId) => {
    if (!ipcRenderer) return;
    
    try {
      await ipcRenderer.invoke('bingo:dismissBingo', winId);
      await loadBingoData();
    } catch (error) {
      console.error('Error dismissing bingo:', error);
    }
  };

  const clearAllGames = async () => {
    if (!confirm('Sind Sie sicher, dass Sie alle aktiven Spiele löschen möchten?')) return;
    
    if (!ipcRenderer) return;
    
    try {
      await ipcRenderer.invoke('bingo:clearAllGames');
      await loadBingoData();
    } catch (error) {
      console.error('Error clearing games:', error);
    }
  };

  const activeDeck = bingoConfig.activeDeckId ? 
    bingoConfig.decks.find(deck => deck.id === bingoConfig.activeDeckId) : null;

  return (
    <div>
      {/* Status Overview */}
      <div className="grid grid-3" style={{ marginBottom: '30px' }}>
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ fontSize: '16px' }}>📋 Aktive Spiele</h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--accent-color)' }}>
            {activeGames.length}
          </div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ fontSize: '16px' }}>🔔 Offene Events</h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--warning-color)' }}>
            {eventNotifications.length}
          </div>
        </div>
        
        <div className="card">
          <div className="card-header">
            <h3 className="card-title" style={{ fontSize: '16px' }}>🏆 Bingo Claims</h3>
          </div>
          <div style={{ fontSize: '32px', fontWeight: 'bold', color: 'var(--success-color)' }}>
            {bingoWins.length}
          </div>
        </div>
      </div>

      {/* Event Notifications */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h3 className="card-title">🔔 Event Bestätigungen</h3>
          <p className="card-subtitle">Benutzer haben diese Events als eingetreten markiert</p>
        </div>

        {eventNotifications.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: 'var(--text-muted)',
            background: 'var(--bg-tertiary)',
            borderRadius: '6px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🔕</div>
            <p>Keine ausstehenden Event-Bestätigungen</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {eventNotifications.map(notification => (
              <div 
                key={notification.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', marginBottom: '5px' }}>
                    {notification.eventText}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    {notification.users.length} Benutzer: {notification.users.map(u => u.username).join(', ')}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Gemeldet um: {new Date(notification.timestamp).toLocaleString('de-DE')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn btn-success"
                    onClick={() => confirmEvent(notification.id)}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    ✅ Bestätigen
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => dismissEvent(notification.id)}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    ❌ Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Bingo Wins */}
      <div className="card" style={{ marginBottom: '20px' }}>
        <div className="card-header">
          <h3 className="card-title">🏆 Bingo Claims</h3>
          <p className="card-subtitle">Benutzer behaupten, ein Bingo zu haben</p>
        </div>

        {bingoWins.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: 'var(--text-muted)',
            background: 'var(--bg-tertiary)',
            borderRadius: '6px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>🏆</div>
            <p>Keine Bingo Claims</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {bingoWins.map(win => (
              <div 
                key={win.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '15px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '6px',
                  border: '2px solid var(--success-color)'
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: '500', marginBottom: '5px' }}>
                    🏆 BINGO von {win.username}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    User ID: {win.userId} • Spiel ID: {win.gameId}
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    Gemeldet um: {new Date(win.timestamp).toLocaleString('de-DE')}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button 
                    className="btn btn-success"
                    onClick={() => validateBingo(win.userId, win.gameId)}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    ✅ Validieren
                  </button>
                  <button 
                    className="btn btn-secondary"
                    onClick={() => dismissBingo(win.id)}
                    style={{ padding: '6px 12px', fontSize: '12px' }}
                  >
                    ❌ Ablehnen
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Active Games */}
      <div className="card">
        <div className="card-header">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 className="card-title">📋 Aktive Bingo Spiele</h3>
              <p className="card-subtitle">Übersicht aller laufenden Bingo-Spiele</p>
            </div>
            {activeGames.length > 0 && (
              <>
                <button 
                  className="btn btn-danger"
                  onClick={clearAllGames}
                  style={{ padding: '8px 16px', fontSize: '12px', marginRight: '10px' }}
                >
                  Alle Spiele beenden
                </button>
                <button 
                  className="btn btn-secondary"
                  onClick={() => {
                    if (ipcRenderer) {
                      ipcRenderer.invoke('bingo:testReactionHandling');
                      alert('Test-Log-Nachrichten gesendet. Prüfe die Logs.');
                    }
                  }}
                  style={{ padding: '8px 16px', fontSize: '12px' }}
                >
                  🔍 Test Reaction Logging
                </button>
              </>
            )}
          </div>
        </div>

        {activeGames.length === 0 ? (
          <div style={{ 
            padding: '40px', 
            textAlign: 'center', 
            color: 'var(--text-muted)',
            background: 'var(--bg-tertiary)',
            borderRadius: '6px'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>📋</div>
            <p>Keine aktiven Bingo-Spiele</p>
            {activeDeck && (
              <p style={{ fontSize: '12px', marginTop: '10px' }}>
                Benutzer können mit <code>{bingoConfig.slashCommand}</code> neue Spiele starten
              </p>
            )}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '400px', overflowY: 'auto' }}>
            {activeGames.map(game => (
              <div 
                key={game.id}
                style={{
                  padding: '15px',
                  background: 'var(--bg-tertiary)',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', marginBottom: '5px' }}>
                      {game.username} (ID: {game.userId})
                    </div>
                    <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '10px' }}>
                      Gestartet: {new Date(game.startedAt).toLocaleString('de-DE')} • 
                      Deck: {game.deckName} • 
                      Bestätigte Events: {game.confirmedEvents.length}/{game.cardSize * game.cardSize}
                    </div>
                    {game.confirmedEvents.length > 0 && (
                      <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                        Bestätigte Events: {game.confirmedEvents.join(', ')}
                      </div>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Spiel ID: {game.id}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {!activeDeck && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div style={{ 
            padding: '30px', 
            textAlign: 'center', 
            color: 'var(--warning-color)',
            background: 'var(--bg-tertiary)',
            borderRadius: '6px',
            border: '2px dashed var(--warning-color)'
          }}>
            <div style={{ fontSize: '48px', marginBottom: '10px' }}>⚠️</div>
            <h3>Kein aktives Deck ausgewählt</h3>
            <p style={{ marginTop: '10px', color: 'var(--text-secondary)' }}>
              Gehen Sie zu "Bingo Decks" und aktivieren Sie ein Deck, um Bingo-Spiele zu ermöglichen.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default BingoEventManager;