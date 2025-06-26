import React, { useState } from 'react';

// Check if we're in Electron environment
const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const Triggers = ({ config, onConfigChange }) => {
  const [showNewTrigger, setShowNewTrigger] = useState(false);
  const [editingTrigger, setEditingTrigger] = useState(null);
  const [triggerType, setTriggerType] = useState('slash_command');
  const [triggerName, setTriggerName] = useState('');
  const [triggerDescription, setTriggerDescription] = useState('');
  const [triggerPattern, setTriggerPattern] = useState('');
  const [triggerEmoji, setTriggerEmoji] = useState('');
  const [cronExpression, setCronExpression] = useState('');
  const [selectedActions, setSelectedActions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  const triggerTypes = [
    { value: 'slash_command', label: 'Slash Command (/command)' },
    { value: 'message_reaction', label: 'Nachricht Reaktion' },
    { value: 'message_pattern', label: 'Nachricht Pattern' },
    { value: 'time_based', label: 'Zeit basiert' },
    { value: 'webhook', label: 'Webhook' }
  ];

  const existingTriggers = config?.bot?.triggers || [];

  const resetForm = () => {
    setTriggerType('slash_command');
    setTriggerName('');
    setTriggerDescription('');
    setTriggerPattern('');
    setTriggerEmoji('');
    setCronExpression('');
    setSelectedActions([]);
    setShowNewTrigger(false);
    setEditingTrigger(null);
  };

  const loadTriggerForEdit = (trigger) => {
    setTriggerType(trigger.type);
    setTriggerName(trigger.name);
    setTriggerDescription(trigger.description || '');
    setTriggerPattern(trigger.pattern || '');
    setTriggerEmoji(trigger.emoji || '');
    setCronExpression(trigger.cronExpression || '');
    setSelectedActions(trigger.actions || []);
    setEditingTrigger(trigger);
    setShowNewTrigger(true);
  };

  const handleCreateOrUpdateTrigger = async () => {
    if (!ipcRenderer) {
      alert('Trigger-Funktionalität nur in Electron App verfügbar.');
      return;
    }

    if (!triggerName.trim()) {
      alert('Bitte gib einen Namen für den Trigger ein.');
      return;
    }

    setIsLoading(true);

    try {
      const triggerData = {
        type: triggerType,
        name: triggerName.trim(),
        description: triggerDescription.trim(),
        pattern: triggerPattern.trim(),
        emoji: triggerEmoji.trim(),
        cronExpression: cronExpression.trim(),
        actions: selectedActions
      };

      // Add type-specific validation
      if (triggerType === 'message_pattern' && !triggerPattern.trim()) {
        alert('Bitte gib ein Nachricht-Pattern ein.');
        setIsLoading(false);
        return;
      }

      if (triggerType === 'message_reaction' && !triggerEmoji.trim()) {
        alert('Bitte gib ein Emoji für die Reaktion ein.');
        setIsLoading(false);
        return;
      }

      if (triggerType === 'time_based' && !cronExpression.trim()) {
        alert('Bitte gib eine Cron-Expression ein.');
        setIsLoading(false);
        return;
      }

      if (editingTrigger) {
        // Update existing trigger
        await ipcRenderer.invoke('config:updateTrigger', editingTrigger.id, triggerData);
        console.log('Trigger erfolgreich aktualisiert');
      } else {
        // Create new trigger
        await ipcRenderer.invoke('config:addTrigger', triggerData);
        console.log('Trigger erfolgreich erstellt');
      }
      
      // Update the local config
      if (onConfigChange) {
        await onConfigChange();
      }

      // Reset form
      resetForm();

    } catch (error) {
      console.error('Fehler beim Speichern des Triggers:', error);
      alert(`Fehler beim Speichern des Triggers: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteTrigger = async (triggerId) => {
    if (!ipcRenderer) {
      alert('Trigger-Funktionalität nur in Electron App verfügbar.');
      return;
    }

    if (!confirm('Bist du sicher, dass du diesen Trigger löschen möchtest?')) {
      return;
    }

    try {
      await ipcRenderer.invoke('config:deleteTrigger', triggerId);
      
      // Update the local config
      if (onConfigChange) {
        await onConfigChange();
      }

      console.log('Trigger erfolgreich gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen des Triggers:', error);
      alert(`Fehler beim Löschen des Triggers: ${error.message}`);
    }
  };

  const getTriggerTypeLabel = (type) => {
    const typeObj = triggerTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  const getTriggerDetails = (trigger) => {
    switch (trigger.type) {
      case 'slash_command':
        return `Command: /${trigger.name}`;
      case 'message_pattern':
        return `Pattern: ${trigger.pattern}`;
      case 'message_reaction':
        return `Emoji: ${trigger.emoji}`;
      case 'time_based':
        return `Cron: ${trigger.cronExpression}`;
      default:
        return trigger.description || 'Keine Details';
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 style={{ fontSize: '28px', fontWeight: '600' }}>
          Trigger & Commands
        </h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowNewTrigger(true)}
          disabled={isLoading}
        >
          ➕ Neuer Trigger
        </button>
      </div>

      {showNewTrigger && (
        <div className="card mb-4">
          <div className="card-header">
            <h3 className="card-title">
              {editingTrigger ? 'Trigger bearbeiten' : 'Neuen Trigger erstellen'}
            </h3>
          </div>
          
          <div className="form-group">
            <label className="form-label">Trigger Typ</label>
            <select 
              className="form-select"
              value={triggerType}
              onChange={(e) => setTriggerType(e.target.value)}
              disabled={isLoading}
            >
              {triggerTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Name</label>
            <input
              type="text"
              className="form-input"
              value={triggerName}
              onChange={(e) => setTriggerName(e.target.value)}
              placeholder="z.B. greet, info, help"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Beschreibung</label>
            <input
              type="text"
              className="form-input"
              value={triggerDescription}
              onChange={(e) => setTriggerDescription(e.target.value)}
              placeholder="Was macht dieser Trigger?"
              disabled={isLoading}
            />
          </div>

          {triggerType === 'message_pattern' && (
            <div className="form-group">
              <label className="form-label">Nachricht Pattern</label>
              <input
                type="text"
                className="form-input"
                value={triggerPattern}
                onChange={(e) => setTriggerPattern(e.target.value)}
                placeholder="z.B. !help oder hallo oder /hello.*/i für Regex"
                disabled={isLoading}
              />
              <small style={{ color: 'var(--text-muted)' }}>
                Einfacher Text oder Regex mit /pattern/i Format
              </small>
            </div>
          )}

          {triggerType === 'message_reaction' && (
            <div className="form-group">
              <label className="form-label">Emoji für Reaktion</label>
              <input
                type="text"
                className="form-input"
                value={triggerEmoji}
                onChange={(e) => setTriggerEmoji(e.target.value)}
                placeholder="z.B. ✅ oder :thumbsup: oder thumbsup"
                disabled={isLoading}
              />
              <small style={{ color: 'var(--text-muted)' }}>
                Unicode-Emoji (✅), Emoji-Namen (:thumbsup:) oder nur den Namen (thumbsup)
              </small>
            </div>
          )}

          {triggerType === 'time_based' && (
            <div className="form-group">
              <label className="form-label">Cron Expression</label>
              <input
                type="text"
                className="form-input"
                value={cronExpression}
                onChange={(e) => setCronExpression(e.target.value)}
                placeholder="z.B. 0 */5 * * * * (alle 5 Minuten)"
                disabled={isLoading}
              />
              <small style={{ color: 'var(--text-muted)' }}>
                Format: Sekunde Minute Stunde Tag Monat Wochentag
              </small>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Aktionen zuweisen</label>
            <div style={{
              border: '1px solid var(--border-color)',
              borderRadius: '6px',
              padding: '10px',
              maxHeight: '200px',
              overflowY: 'auto'
            }}>
              {config?.bot?.actions?.length > 0 ? (
                config.bot.actions.map((action, index) => (
                  <label key={action.id || index} style={{
                    display: 'flex',
                    alignItems: 'center',
                    padding: '5px 0',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      style={{ marginRight: '10px' }}
                      checked={selectedActions.includes(action.id)}
                      onChange={(e) => {
                        const actionId = action.id;
                        if (e.target.checked) {
                          setSelectedActions(prev => [...prev, actionId]);
                        } else {
                          setSelectedActions(prev => prev.filter(id => id !== actionId));
                        }
                      }}
                      disabled={isLoading}
                    />
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{action.name}</strong>
                      <br />
                      <small style={{ color: 'var(--text-muted)' }}>{action.type}</small>
                    </div>
                  </label>
                ))
              ) : (
                <p style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>
                  Keine Aktionen verfügbar. Erstelle zuerst Aktionen im "Aktionen" Tab.
                </p>
              )}
            </div>
          </div>

          <div className="flex gap-2">
            <button 
              className="btn btn-primary" 
              onClick={handleCreateOrUpdateTrigger}
              disabled={isLoading}
            >
              {isLoading ? 'Speichere...' : (editingTrigger ? 'Aktualisieren' : 'Trigger erstellen')}
            </button>
            <button 
              className="btn btn-secondary" 
              onClick={resetForm}
              disabled={isLoading}
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Bestehende Trigger</h3>
          <p className="card-subtitle">
            {existingTriggers.length} Trigger konfiguriert
          </p>
        </div>
        
        {existingTriggers.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: 'var(--text-muted)', 
            fontStyle: 'italic',
            padding: '40px 0'
          }}>
            Noch keine Trigger erstellt. Klicke auf "Neuer Trigger" um zu beginnen.
          </div>
        ) : (
          <div>
            {existingTriggers.map((trigger, index) => (
              <div 
                key={trigger.id || index}
                style={{
                  padding: '15px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  marginBottom: '10px',
                  backgroundColor: 'var(--bg-tertiary)'
                }}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <h4 style={{ color: 'var(--text-primary)', marginBottom: '5px' }}>
                      {trigger.name}
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '3px' }}>
                      {trigger.description}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      {getTriggerTypeLabel(trigger.type)} • {getTriggerDetails(trigger)}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px' }}>
                      Aktionen: {trigger.actions?.length || 0}
                      {trigger.actions?.length > 0 && (
                        <span style={{ marginLeft: '10px', color: 'var(--text-secondary)' }}>
                          ({trigger.actions.map(actionId => {
                            const action = config?.bot?.actions?.find(a => a.id === actionId);
                            return action ? action.name : actionId;
                          }).join(', ')})
                        </span>
                      )}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      className="btn btn-secondary"
                      onClick={() => loadTriggerForEdit(trigger)}
                    >
                      Bearbeiten
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDeleteTrigger(trigger.id)}
                    >
                      Löschen
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Debug-Tipps</h3>
          <p className="card-subtitle">So testest du deine Trigger</p>
        </div>
        
        <div style={{ padding: '15px' }}>
          <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Slash Commands testen:</h4>
          <ul style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>
            <li>• Typ einen Slash Command im Discord: /{`{trigger_name}`}</li>
            <li>• Der Bot muss eine Guild ID konfiguriert haben</li>
            <li>• Commands können 1-2 Minuten dauern um zu erscheinen</li>
          </ul>

          <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Message Patterns testen:</h4>
          <ul style={{ color: 'var(--text-secondary)', marginBottom: '15px' }}>
            <li>• Schreibe eine Nachricht mit dem konfigurierten Pattern</li>
            <li>• Beispiel Pattern: "hallo" reagiert auf Nachrichten mit "hallo"</li>
            <li>• Regex Patterns: /hello.*/i für erweiterte Patterns</li>
          </ul>

          <h4 style={{ color: 'var(--text-primary)', marginBottom: '10px' }}>Reactions testen:</h4>
          <ul style={{ color: 'var(--text-secondary)' }}>
            <li>• Reagiere mit dem konfigurierten Emoji auf eine Nachricht</li>
            <li>• Emoji-Namen ohne : funktionieren oft besser als :name:</li>
            <li>• Custom Emojis brauchen die Emoji-ID</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default Triggers;