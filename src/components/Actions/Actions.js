import React, { useState } from 'react';

// Check if we're in Electron environment
const ipcRenderer = window.require ? window.require('electron').ipcRenderer : null;

const Actions = ({ config, onConfigChange }) => {
  const [showNewAction, setShowNewAction] = useState(false);
  const [editingAction, setEditingAction] = useState(null);
  const [actionType, setActionType] = useState('send_message');
  const [actionName, setActionName] = useState('');
  const [actionContent, setActionContent] = useState('');
  const [embedTitle, setEmbedTitle] = useState('');
  const [embedDescription, setEmbedDescription] = useState('');
  const [embedColor, setEmbedColor] = useState('#5865f2');
  const [roleId, setRoleId] = useState('');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookPayload, setWebhookPayload] = useState('');
  const [obsRequestType, setObsRequestType] = useState('SetCurrentProgramScene');
  const [obsParameters, setObsParameters] = useState('');
  const [delaySeconds, setDelaySeconds] = useState('5');
  const [conditionType, setConditionType] = useState('user_has_role');
  const [conditionValue, setConditionValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const actionTypes = [
    { value: 'send_message', label: 'Nachricht senden' },
    { value: 'send_embed', label: 'Embed senden' },
    { value: 'add_role', label: 'Rolle hinzufügen' },
    { value: 'remove_role', label: 'Rolle entfernen' },
    { value: 'send_dm', label: 'Private Nachricht' },
    { value: 'webhook_call', label: 'Webhook aufrufen' },
    { value: 'obs_action', label: 'OBS Aktion' },
    { value: 'streamerbot_action', label: 'StreamerBot Aktion' },
    { value: 'delay', label: 'Verzögerung' },
    { value: 'conditional', label: 'Bedingung' }
  ];

  const existingActions = config?.bot?.actions || [];

  const resetForm = () => {
    setActionType('send_message');
    setActionName('');
    setActionContent('');
    setEmbedTitle('');
    setEmbedDescription('');
    setEmbedColor('#5865f2');
    setRoleId('');
    setWebhookUrl('');
    setWebhookPayload('');
    setObsParameters('');
    setDelaySeconds('5');
    setConditionValue('');
    setShowNewAction(false);
    setEditingAction(null);
  };

  const loadActionForEdit = (action) => {
    setActionType(action.type);
    setActionName(action.name);
    setActionContent(action.content || '');
    setEmbedTitle(action.embedTitle || '');
    setEmbedDescription(action.embedDescription || '');
    setEmbedColor(action.embedColor || '#5865f2');
    setRoleId(action.roleId || '');
    setWebhookUrl(action.webhookUrl || '');
    setWebhookPayload(action.payload || '');
    setObsRequestType(action.requestType || 'SetCurrentProgramScene');
    setObsParameters(action.parameters || '');
    setDelaySeconds(String(action.seconds || 5));
    setConditionType(action.conditionType || 'user_has_role');
    setConditionValue(action.conditionValue || '');
    setEditingAction(action);
    setShowNewAction(true);
  };

  const handleCreateOrUpdateAction = async () => {
    if (!ipcRenderer) {
      alert('Actions-Funktionalität nur in Electron App verfügbar.');
      return;
    }

    if (!actionName.trim()) {
      alert('Bitte gib einen Namen für die Aktion ein.');
      return;
    }

    setIsLoading(true);

    try {
      const newAction = {
        type: actionType,
        name: actionName.trim(),
        content: actionContent.trim()
      };

      // Add type-specific properties
      switch (actionType) {
        case 'send_embed':
          newAction.embedTitle = embedTitle.trim();
          newAction.embedDescription = embedDescription.trim();
          newAction.embedColor = embedColor;
          break;
        case 'add_role':
        case 'remove_role':
          if (!roleId.trim()) {
            alert('Bitte gib eine Rollen-ID ein.');
            setIsLoading(false);
            return;
          }
          newAction.roleId = roleId.trim();
          break;
        case 'webhook_call':
          if (!webhookUrl.trim()) {
            alert('Bitte gib eine Webhook-URL ein.');
            setIsLoading(false);
            return;
          }
          newAction.webhookUrl = webhookUrl.trim();
          newAction.payload = webhookPayload.trim();
          break;
        case 'obs_action':
          newAction.requestType = obsRequestType;
          newAction.parameters = obsParameters.trim();
          break;
        case 'delay':
          const seconds = parseInt(delaySeconds);
          if (isNaN(seconds) || seconds < 1) {
            alert('Bitte gib eine gültige Anzahl Sekunden ein.');
            setIsLoading(false);
            return;
          }
          newAction.seconds = seconds;
          break;
        case 'conditional':
          if (!conditionValue.trim()) {
            alert('Bitte gib einen Wert für die Bedingung ein.');
            setIsLoading(false);
            return;
          }
          newAction.conditionType = conditionType;
          newAction.conditionValue = conditionValue.trim();
          break;
      }

      if (editingAction) {
        // Update existing action
        await ipcRenderer.invoke('config:updateAction', editingAction.id, newAction);
        console.log('Aktion erfolgreich aktualisiert');
      } else {
        // Create new action
        await ipcRenderer.invoke('config:addAction', newAction);
        console.log('Aktion erfolgreich erstellt');
      }
      
      // Update the local config
      if (onConfigChange) {
        await onConfigChange();
      }

      // Reset form
      resetForm();

    } catch (error) {
      console.error('Fehler beim Speichern der Aktion:', error);
      alert(`Fehler beim Speichern der Aktion: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAction = async (actionId) => {
    if (!ipcRenderer) {
      alert('Actions-Funktionalität nur in Electron App verfügbar.');
      return;
    }

    if (!confirm('Bist du sicher, dass du diese Aktion löschen möchtest?')) {
      return;
    }

    try {
      await ipcRenderer.invoke('config:deleteAction', actionId);
      
      // Update the local config
      if (onConfigChange) {
        await onConfigChange();
      }

      console.log('Aktion erfolgreich gelöscht');
    } catch (error) {
      console.error('Fehler beim Löschen der Aktion:', error);
      alert(`Fehler beim Löschen der Aktion: ${error.message}`);
    }
  };

  const getActionTypeLabel = (type) => {
    const typeObj = actionTypes.find(t => t.value === type);
    return typeObj ? typeObj.label : type;
  };

  const getActionDetails = (action) => {
    switch (action.type) {
      case 'send_message':
      case 'send_dm':
        return action.content ? `\"${action.content.substring(0, 50)}${action.content.length > 50 ? '...' : ''}\"` : 'Keine Nachricht';
      case 'send_embed':
        return action.embedTitle || 'Kein Titel';
      case 'add_role':
      case 'remove_role':
        return `Rolle: ${action.roleId}`;
      case 'webhook_call':
        return action.webhookUrl || 'Keine URL';
      case 'obs_action':
        return action.requestType || 'Keine Aktion';
      case 'delay':
        return `${action.seconds || 0} Sekunden`;
      case 'conditional':
        return `${action.conditionType}: ${action.conditionValue}`;
      default:
        return 'Keine Details';
    }
  };

  const renderActionConfig = () => {
    switch (actionType) {
      case 'send_message':
      case 'send_dm':
        return (
          <div className="form-group">
            <label className="form-label">Nachricht</label>
            <textarea
              className="form-textarea"
              value={actionContent}
              onChange={(e) => setActionContent(e.target.value)}
              placeholder="Hallo {user.displayName}! Willkommen auf dem Server."
              disabled={isLoading}
              rows="4"
            />
            <small style={{ color: 'var(--text-muted)' }}>
              Verfügbare Variablen: {`{user.username}, {user.displayName}, {user.mention}, {channel.name}, {guild.name}`}
            </small>
          </div>
        );

      case 'send_embed':
        return (
          <div>
            <div className="form-group">
              <label className="form-label">Embed Titel</label>
              <input
                type="text"
                className="form-input"
                value={embedTitle}
                onChange={(e) => setEmbedTitle(e.target.value)}
                placeholder="z.B. Willkommen!"
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Embed Beschreibung</label>
              <textarea
                className="form-textarea"
                value={embedDescription}
                onChange={(e) => setEmbedDescription(e.target.value)}
                placeholder="Beschreibung des Embeds..."
                disabled={isLoading}
                rows="3"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Embed Farbe (Hex)</label>
              <input
                type="color"
                className="form-input"
                value={embedColor}
                onChange={(e) => setEmbedColor(e.target.value)}
                disabled={isLoading}
                style={{ width: '100px', height: '40px' }}
              />
              <input
                type="text"
                className="form-input"
                value={embedColor}
                onChange={(e) => setEmbedColor(e.target.value)}
                placeholder="#5865f2"
                disabled={isLoading}
                style={{ marginLeft: '10px', width: 'calc(100% - 110px)' }}
              />
            </div>
          </div>
        );

      case 'add_role':
      case 'remove_role':
        return (
          <div className="form-group">
            <label className="form-label">Rollen ID</label>
            <input
              type="text"
              className="form-input"
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              placeholder="Rolle ID von Discord"
              disabled={isLoading}
            />
            <small style={{ color: 'var(--text-muted)' }}>
              Rechtsklick auf eine Rolle in Discord > ID kopieren (Developer Mode erforderlich)
            </small>
          </div>
        );

      case 'webhook_call':
        return (
          <div>
            <div className="form-group">
              <label className="form-label">Webhook URL</label>
              <input
                type="url"
                className="form-input"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://example.com/webhook"
                disabled={isLoading}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Payload (JSON)</label>
              <textarea
                className="form-textarea"
                value={webhookPayload}
                onChange={(e) => setWebhookPayload(e.target.value)}
                placeholder='{\"message\": \"Hello from bot!\", \"user\": \"{user.username}\"}'
                disabled={isLoading}
                rows="4"
              />
              <small style={{ color: 'var(--text-muted)' }}>
                JSON Format. Variablen funktionieren auch hier.
              </small>
            </div>
          </div>
        );

      case 'obs_action':
        return (
          <div>
            <div className="form-group">
              <label className="form-label">OBS Request Type</label>
              <select 
                className="form-select"
                value={obsRequestType}
                onChange={(e) => setObsRequestType(e.target.value)}
                disabled={isLoading}
              >
                <option value="SetCurrentProgramScene">Szene wechseln</option>
                <option value="ToggleRecording">Aufnahme umschalten</option>
                <option value="ToggleStream">Stream umschalten</option>
                <option value="SetSourceVisibility">Source Sichtbarkeit</option>
                <option value="SetSourceSettings">Source Einstellungen</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Parameter (JSON)</label>
              <textarea
                className="form-textarea"
                value={obsParameters}
                onChange={(e) => setObsParameters(e.target.value)}
                placeholder='{\"sceneName\": \"Streaming Scene\"}'
                disabled={isLoading}
                rows="3"
              />
            </div>
          </div>
        );

      case 'delay':
        return (
          <div className="form-group">
            <label className="form-label">Verzögerung (Sekunden)</label>
            <input
              type="number"
              className="form-input"
              value={delaySeconds}
              onChange={(e) => setDelaySeconds(e.target.value)}
              placeholder="5"
              min="1"
              max="3600"
              disabled={isLoading}
            />
          </div>
        );

      case 'conditional':
        return (
          <div>
            <div className="form-group">
              <label className="form-label">Bedingung</label>
              <select 
                className="form-select"
                value={conditionType}
                onChange={(e) => setConditionType(e.target.value)}
                disabled={isLoading}
              >
                <option value="user_has_role">User hat Rolle</option>
                <option value="user_in_channel">User in Channel</option>
                <option value="message_contains">Nachricht enthält</option>
                <option value="user_is_moderator">User ist Moderator</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Wert</label>
              <input
                type="text"
                className="form-input"
                value={conditionValue}
                onChange={(e) => setConditionValue(e.target.value)}
                placeholder="Rolle ID oder Text"
                disabled={isLoading}
              />
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 style={{ fontSize: '28px', fontWeight: '600' }}>
          Aktionen & Workflows
        </h1>
        <button 
          className="btn btn-primary"
          onClick={() => setShowNewAction(true)}
          disabled={isLoading}
        >
          ➕ Neue Aktion
        </button>
      </div>

      {showNewAction && (
        <div className="card mb-4">
          <div className="card-header">
            <h3 className="card-title">
              {editingAction ? 'Aktion bearbeiten' : 'Neue Aktion erstellen'}
            </h3>
          </div>
          
          <div className="form-group">
            <label className="form-label">Aktions Typ</label>
            <select 
              className="form-select"
              value={actionType}
              onChange={(e) => setActionType(e.target.value)}
              disabled={isLoading}
            >
              {actionTypes.map(type => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Aktions Name</label>
            <input
              type="text"
              className="form-input"
              value={actionName}
              onChange={(e) => setActionName(e.target.value)}
              placeholder="z.B. Willkommensnachricht, Rolle vergeben"
              disabled={isLoading}
            />
          </div>

          {renderActionConfig()}

          <div className="flex gap-2">
            <button 
              className="btn btn-primary" 
              onClick={handleCreateOrUpdateAction}
              disabled={isLoading}
            >
              {isLoading ? 'Speichere...' : (editingAction ? 'Aktualisieren' : 'Aktion erstellen')}
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
          <h3 className="card-title">Bestehende Aktionen</h3>
          <p className="card-subtitle">
            {existingActions.length} Aktionen konfiguriert
          </p>
        </div>
        
        {existingActions.length === 0 ? (
          <div style={{ 
            textAlign: 'center', 
            color: 'var(--text-muted)', 
            fontStyle: 'italic',
            padding: '40px 0'
          }}>
            Noch keine Aktionen erstellt. Klicke auf "Neue Aktion" um zu beginnen.
          </div>
        ) : (
          <div>
            {existingActions.map((action, index) => (
              <div 
                key={action.id || index}
                style={{
                  padding: '15px',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  marginBottom: '10px',
                  backgroundColor: 'var(--bg-tertiary)'
                }}
              >
                <div className="flex justify-between items-center">
                  <div style={{ flex: 1 }}>
                    <h4 style={{ color: 'var(--text-primary)', marginBottom: '5px' }}>
                      {action.name}
                    </h4>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '3px' }}>
                      {getActionTypeLabel(action.type)}
                    </p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '12px', wordBreak: 'break-word' }}>
                      {getActionDetails(action)}
                    </p>
                  </div>
                  <div className="flex gap-2" style={{ marginLeft: '15px' }}>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => loadActionForEdit(action)}
                    >
                      Bearbeiten
                    </button>
                    <button 
                      className="btn btn-danger"
                      onClick={() => handleDeleteAction(action.id)}
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
          <h3 className="card-title">Verfügbare Variablen</h3>
          <p className="card-subtitle">Diese können in Nachrichten, Embeds und Webhooks verwendet werden</p>
        </div>
        
        <div className="grid grid-3" style={{ padding: '15px' }}>
          <div>
            <h4 style={{ marginBottom: '10px', color: 'var(--text-primary)' }}>
              👤 User Variablen
            </h4>
            <ul style={{ listStyle: 'none', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <li><code>{`{user.id}`}</code> - User ID</li>
              <li><code>{`{user.username}`}</code> - Username</li>
              <li><code>{`{user.displayName}`}</code> - Display Name</li>
              <li><code>{`{user.mention}`}</code> - User erwähnen</li>
            </ul>
          </div>
          
          <div>
            <h4 style={{ marginBottom: '10px', color: 'var(--text-primary)' }}>
              💬 Channel/Guild
            </h4>
            <ul style={{ listStyle: 'none', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <li><code>{`{channel.name}`}</code> - Channel Name</li>
              <li><code>{`{channel.mention}`}</code> - Channel erwähnen</li>
              <li><code>{`{guild.name}`}</code> - Server Name</li>
              <li><code>{`{message.content}`}</code> - Nachricht Inhalt</li>
            </ul>
          </div>

          <div>
            <h4 style={{ marginBottom: '10px', color: 'var(--text-primary)' }}>
              🕐 Zeit & Datum
            </h4>
            <ul style={{ listStyle: 'none', color: 'var(--text-secondary)', fontSize: '13px' }}>
              <li><code>{`{date}`}</code> - Aktuelles Datum</li>
              <li><code>{`{time}`}</code> - Aktuelle Zeit</li>
              <li><code>{`{trigger.timestamp}`}</code> - ISO Timestamp</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Actions;