import React, { useState } from 'react';

const BingoDeckManager = ({ bingoConfig, updateBingoConfig, saving }) => {
  const [selectedDeckId, setSelectedDeckId] = useState(null);
  const [newDeckName, setNewDeckName] = useState('');
  const [newEventText, setNewEventText] = useState('');
  const [editingDeck, setEditingDeck] = useState(null);

  const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2);

  const createNewDeck = () => {
    if (!newDeckName.trim()) {
      alert('Bitte geben Sie einen Deck-Namen ein.');
      return;
    }

    const newDeck = {
      id: generateId(),
      name: newDeckName.trim(),
      events: [],
      createdAt: new Date().toISOString()
    };

    const updatedDecks = [...bingoConfig.decks, newDeck];
    updateBingoConfig({ 
      decks: updatedDecks,
      activeDeckId: bingoConfig.activeDeckId || newDeck.id
    });
    
    setNewDeckName('');
    setSelectedDeckId(newDeck.id);
  };

  const deleteDeck = (deckId) => {
    if (!confirm('Sind Sie sicher, dass Sie dieses Deck löschen möchten?')) return;

    const updatedDecks = bingoConfig.decks.filter(deck => deck.id !== deckId);
    const newActiveDeckId = bingoConfig.activeDeckId === deckId 
      ? (updatedDecks[0]?.id || null) 
      : bingoConfig.activeDeckId;

    updateBingoConfig({ 
      decks: updatedDecks,
      activeDeckId: newActiveDeckId
    });

    if (selectedDeckId === deckId) {
      setSelectedDeckId(null);
    }
  };

  const setActiveDeck = (deckId) => {
    updateBingoConfig({ activeDeckId: deckId });
  };

  const addEventToDeck = () => {
    if (!selectedDeckId || !newEventText.trim()) {
      alert('Bitte wählen Sie ein Deck aus und geben Sie einen Event-Text ein.');
      return;
    }

    const newEvent = {
      id: generateId(),
      text: newEventText.trim(),
      createdAt: new Date().toISOString()
    };

    const updatedDecks = bingoConfig.decks.map(deck => {
      if (deck.id === selectedDeckId) {
        return {
          ...deck,
          events: [...deck.events, newEvent]
        };
      }
      return deck;
    });

    updateBingoConfig({ decks: updatedDecks });
    setNewEventText('');
  };

  const deleteEvent = (deckId, eventId) => {
    const updatedDecks = bingoConfig.decks.map(deck => {
      if (deck.id === deckId) {
        return {
          ...deck,
          events: deck.events.filter(event => event.id !== eventId)
        };
      }
      return deck;
    });

    updateBingoConfig({ decks: updatedDecks });
  };

  const selectedDeck = selectedDeckId ? bingoConfig.decks.find(deck => deck.id === selectedDeckId) : null;
  const activeDeck = bingoConfig.activeDeckId ? bingoConfig.decks.find(deck => deck.id === bingoConfig.activeDeckId) : null;

  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (action === 'createDeck') {
        createNewDeck();
      } else if (action === 'addEvent') {
        addEventToDeck();
      }
    }
  };

  return (
    <div>
      <div className="grid grid-2" style={{ gap: '30px' }}>
        {/* Deck Management */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🎯 Bingo Decks verwalten</h3>
            <p className="card-subtitle">Erstellen und verwalten Sie verschiedene Event-Decks für verschiedene Spiele</p>
          </div>

          <div className="form-group">
            <label className="form-label">Neues Deck erstellen</label>
            <div style={{ display: 'flex', gap: '10px' }}>
              <input
                type="text"
                className="form-input"
                value={newDeckName}
                onChange={(e) => setNewDeckName(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, 'createDeck')}
                placeholder="z.B. Minecraft Events, Valorant Fails, etc."
                style={{ flex: 1 }}
              />
              <button className="btn btn-primary" onClick={createNewDeck}>
                Erstellen
              </button>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Vorhandene Decks</label>
            {bingoConfig.decks.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                Noch keine Decks erstellt
              </p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {bingoConfig.decks.map(deck => (
                  <div 
                    key={deck.id} 
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px',
                      background: selectedDeckId === deck.id ? 'var(--accent-color)' : 'var(--bg-tertiary)',
                      borderRadius: '6px',
                      border: bingoConfig.activeDeckId === deck.id ? '2px solid var(--success-color)' : '1px solid var(--border-color)',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease'
                    }}
                    onClick={() => setSelectedDeckId(deck.id)}
                  >
                    <div>
                      <div style={{ 
                        fontWeight: '500',
                        color: selectedDeckId === deck.id ? 'white' : 'var(--text-primary)'
                      }}>
                        {deck.name}
                        {bingoConfig.activeDeckId === deck.id && (
                          <span style={{ 
                            marginLeft: '8px', 
                            padding: '2px 6px', 
                            backgroundColor: 'var(--success-color)', 
                            color: 'var(--bg-primary)', 
                            fontSize: '10px', 
                            borderRadius: '3px',
                            fontWeight: '600'
                          }}>
                            AKTIV
                          </span>
                        )}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: selectedDeckId === deck.id ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)' 
                      }}>
                        {deck.events.length} Events
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {bingoConfig.activeDeckId !== deck.id && (
                        <button 
                          className="btn btn-success"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDeck(deck.id);
                          }}
                        >
                          Aktivieren
                        </button>
                      )}
                      <button 
                        className="btn btn-danger"
                        style={{ padding: '4px 8px', fontSize: '12px' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteDeck(deck.id);
                        }}
                      >
                        Löschen
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Event Management */}
        <div className="card">
          <div className="card-header">
            <h3 className="card-title">🎮 Events verwalten</h3>
            <p className="card-subtitle">
              {selectedDeck ? `Events für "${selectedDeck.name}"` : 'Wählen Sie ein Deck aus, um Events zu verwalten'}
            </p>
          </div>

          {selectedDeck ? (
            <>
              <div className="form-group">
                <label className="form-label">Neues Event hinzufügen</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  <input
                    type="text"
                    className="form-input"
                    value={newEventText}
                    onChange={(e) => setNewEventText(e.target.value)}
                    onKeyPress={(e) => handleKeyPress(e, 'addEvent')}
                    placeholder="z.B. 'Ich gehe 3 mal game over', 'Epischer Fail passiert'"
                  />
                  <button 
                    className="btn btn-primary" 
                    onClick={addEventToDeck}
                    style={{ alignSelf: 'flex-start' }}
                  >
                    Event hinzufügen
                  </button>
                </div>
                <small style={{ color: 'var(--text-muted)' }}>
                  Tipp: Drücken Sie Enter um das Event zu speichern und den Fokus zu behalten
                </small>
              </div>

              <div className="form-group">
                <label className="form-label">
                  Events in diesem Deck ({selectedDeck.events.length})
                </label>
                {selectedDeck.events.length === 0 ? (
                  <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                    Noch keine Events in diesem Deck
                  </p>
                ) : (
                  <div style={{ 
                    maxHeight: '400px', 
                    overflowY: 'auto',
                    border: '1px solid var(--border-color)',
                    borderRadius: '6px',
                    padding: '10px'
                  }}>
                    {selectedDeck.events.map((event, index) => (
                      <div 
                        key={event.id}
                        style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '8px',
                          marginBottom: '4px',
                          background: 'var(--bg-secondary)',
                          borderRadius: '4px',
                          border: '1px solid var(--border-color)'
                        }}
                      >
                        <div style={{ flex: 1 }}>
                          <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                            {index + 1}.
                          </span>
                          <span style={{ marginLeft: '8px' }}>
                            {event.text}
                          </span>
                        </div>
                        <button 
                          className="btn btn-danger"
                          style={{ padding: '4px 8px', fontSize: '12px' }}
                          onClick={() => deleteEvent(selectedDeck.id, event.id)}
                        >
                          Löschen
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div style={{ 
              padding: '40px', 
              textAlign: 'center', 
              color: 'var(--text-muted)',
              background: 'var(--bg-tertiary)',
              borderRadius: '6px',
              border: '1px dashed var(--border-color)'
            }}>
              <div style={{ fontSize: '48px', marginBottom: '10px' }}>🎯</div>
              <p>Wählen Sie links ein Deck aus, um Events zu verwalten</p>
            </div>
          )}
        </div>
      </div>

      {activeDeck && (
        <div className="card" style={{ marginTop: '20px' }}>
          <div className="card-header">
            <h3 className="card-title">🎮 Aktives Deck: {activeDeck.name}</h3>
            <p className="card-subtitle">
              Dieses Deck wird für neue Bingo-Karten verwendet • {activeDeck.events.length} Events verfügbar
            </p>
          </div>
          {activeDeck.events.length < 25 && (
            <div style={{ 
              padding: '10px', 
              background: 'var(--warning-color)', 
              color: 'var(--bg-primary)', 
              borderRadius: '6px',
              marginBottom: '10px' 
            }}>
              ⚠️ Warnung: Für eine 5x5 Bingo-Karte werden mindestens 25 Events empfohlen. 
              Aktuell: {activeDeck.events.length} Events
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default BingoDeckManager;