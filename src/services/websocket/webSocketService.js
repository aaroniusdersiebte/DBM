const WebSocket = require('ws');

class WebSocketService {
  constructor() {
    this.obsConnection = null;
    this.streamerbotConnection = null;
    this.isObsConnected = false;
    this.isStreamerbotConnected = false;
  }

  async connectToOBS(url) {
    try {
      if (this.obsConnection) {
        this.obsConnection.close();
      }

      this.obsConnection = new WebSocket(url);
      
      this.obsConnection.on('open', () => {
        console.log('Verbunden mit OBS WebSocket');
        this.isObsConnected = true;
      });

      this.obsConnection.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log('OBS Nachricht:', message);
        } catch (error) {
          console.error('Fehler beim Parsen der OBS Nachricht:', error);
        }
      });

      this.obsConnection.on('close', () => {
        console.log('OBS WebSocket Verbindung geschlossen');
        this.isObsConnected = false;
      });

      this.obsConnection.on('error', (error) => {
        console.error('OBS WebSocket Fehler:', error);
        this.isObsConnected = false;
      });

    } catch (error) {
      console.error('Fehler beim Verbinden mit OBS:', error);
      throw error;
    }
  }

  async connectToStreamerBot(url) {
    try {
      if (this.streamerbotConnection) {
        this.streamerbotConnection.close();
      }

      this.streamerbotConnection = new WebSocket(url);
      
      this.streamerbotConnection.on('open', () => {
        console.log('Verbunden mit StreamerBot WebSocket');
        this.isStreamerbotConnected = true;
      });

      this.streamerbotConnection.on('message', (data) => {
        try {
          const message = JSON.parse(data);
          console.log('StreamerBot Nachricht:', message);
        } catch (error) {
          console.error('Fehler beim Parsen der StreamerBot Nachricht:', error);
        }
      });

      this.streamerbotConnection.on('close', () => {
        console.log('StreamerBot WebSocket Verbindung geschlossen');
        this.isStreamerbotConnected = false;
      });

      this.streamerbotConnection.on('error', (error) => {
        console.error('StreamerBot WebSocket Fehler:', error);
        this.isStreamerbotConnected = false;
      });

    } catch (error) {
      console.error('Fehler beim Verbinden mit StreamerBot:', error);
      throw error;
    }
  }

  sendToOBS(requestType, requestData = {}) {
    if (!this.isObsConnected || !this.obsConnection) {
      console.error('Nicht mit OBS verbunden');
      return false;
    }

    const message = {
      op: 6, // Request
      d: {
        requestType: requestType,
        requestId: this.generateRequestId(),
        requestData: requestData
      }
    };

    try {
      this.obsConnection.send(JSON.stringify(message));
      console.log('Nachricht an OBS gesendet:', requestType);
      return true;
    } catch (error) {
      console.error('Fehler beim Senden an OBS:', error);
      return false;
    }
  }

  sendToStreamerBot(action, data = {}) {
    if (!this.isStreamerbotConnected || !this.streamerbotConnection) {
      console.error('Nicht mit StreamerBot verbunden');
      return false;
    }

    const message = {
      action: action,
      data: data,
      id: this.generateRequestId()
    };

    try {
      this.streamerbotConnection.send(JSON.stringify(message));
      console.log('Nachricht an StreamerBot gesendet:', action);
      return true;
    } catch (error) {
      console.error('Fehler beim Senden an StreamerBot:', error);
      return false;
    }
  }

  disconnect() {
    if (this.obsConnection) {
      this.obsConnection.close();
      this.obsConnection = null;
      this.isObsConnected = false;
    }

    if (this.streamerbotConnection) {
      this.streamerbotConnection.close();
      this.streamerbotConnection = null;
      this.isStreamerbotConnected = false;
    }
  }

  getStatus() {
    return {
      obs: this.isObsConnected,
      streamerbot: this.isStreamerbotConnected
    };
  }

  generateRequestId() {
    return Date.now().toString() + Math.random().toString().substr(2, 5);
  }

  // Predefined OBS actions
  obsActions = {
    setScene: (sceneName) => this.sendToOBS('SetCurrentProgramScene', { sceneName }),
    toggleRecording: () => this.sendToOBS('ToggleRecord'),
    toggleStreaming: () => this.sendToOBS('ToggleStream'),
    setSourceVisibility: (sourceName, visible) => 
      this.sendToOBS('SetSceneItemEnabled', { sourceName, sceneItemEnabled: visible }),
    playPauseMedia: (sourceName) => 
      this.sendToOBS('TriggerMediaInputAction', { inputName: sourceName, mediaAction: 'OBS_WEBSOCKET_MEDIA_INPUT_ACTION_PLAY_PAUSE' })
  };

  // Predefined StreamerBot actions
  streamerbotActions = {
    executeAction: (actionName) => this.sendToStreamerBot('DoAction', { action: actionName }),
    sendMessage: (message) => this.sendToStreamerBot('SendMessage', { message }),
    setGlobalVariable: (name, value) => this.sendToStreamerBot('SetGlobalVar', { name, value })
  };
}

module.exports = new WebSocketService();
