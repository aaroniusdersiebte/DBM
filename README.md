# Discord Bot Manager

Ein intuitiver Discord Bot Manager mit GUI, entwickelt als Electron Desktop Application mit React Frontend.

## 🚀 Features

- **Visueller Bot Builder**: Erstelle Discord Bots ohne Code zu schreiben
- **Trigger System**: Unterstützt Slash Commands, Message Patterns, Reactions, Time-based und Webhooks
- **Action System**: Modulare Aktionen für Nachrichten, Rollen, OBS, StreamerBot und mehr
- **Live Bot Management**: Starte/Stoppe Bots direkt aus der App
- **WebSocket Integration**: Verbindung zu OBS und StreamerBot
- **Sichere Konfiguration**: Verschlüsselte Token-Speicherung
- **Dark Theme**: Minimalistisches, modernes Design

## 📁 Projektstruktur

```
DiscordBotManager/
├── electron.js                 # Electron Main Process
├── package.json                # Dependencies & Scripts
├── src/
│   ├── App.js                  # React Hauptkomponente
│   ├── App.css                 # Globale Styles
│   ├── index.js                # React Entry Point
│   ├── components/             # React Komponenten
│   │   ├── Layout/             # App Layout & Navigation
│   │   ├── Dashboard/          # Dashboard Übersicht
│   │   ├── Settings/           # Einstellungen
│   │   ├── Triggers/           # Trigger Verwaltung
│   │   └── Actions/            # Action Verwaltung
│   ├── services/               # Backend Services
│   │   ├── bot/                # Discord Bot Management
│   │   ├── config/             # Konfiguration & Speicherung
│   │   └── websocket/          # OBS/StreamerBot Integration
│   └── utils/                  # Utility Funktionen
├── public/
│   └── index.html              # HTML Template
└── config/                     # Konfigurationsdateien
    ├── app-settings.json       # App Einstellungen
    └── bot-config.json         # Bot Konfiguration
```

## 🛠 Installation & Setup

1. **Dependencies installieren:**
   ```bash
   npm install
   ```

2. **Development Mode starten:**
   ```bash
   npm run electron-dev
   ```

3. **Production Build:**
   ```bash
   npm run build
   npm run electron
   ```

## ⚙️ Konfiguration

### Discord Bot Setup
1. Gehe zum [Discord Developer Portal](https://discord.com/developers/applications)
2. Erstelle eine neue Application
3. Erstelle einen Bot und kopiere den Token
4. Aktiviere die nötigen Intents (Message Content Intent, etc.)
5. Invite den Bot auf deinen Server mit den richtigen Permissions

### App Konfiguration
1. Öffne die Settings in der App
2. Trage Bot Token und Server ID ein
3. Konfiguriere WebSocket URLs für OBS/StreamerBot (optional)

## 🎯 Architektur Konzepte

### Modulares Design
- **Komponenten**: Wiederverwendbare React Komponenten
- **Services**: Backend Logik getrennt von UI
- **Konfiguration**: JSON-basierte, verschlüsselte Speicherung

### Trigger System
- **Slash Commands**: Discord native Commands
- **Message Patterns**: Text-basierte Trigger mit Regex Support
- **Reactions**: Emoji-basierte Trigger
- **Time-based**: Cron-basierte zeitgesteuerte Trigger
- **Webhooks**: HTTP-basierte externe Trigger

### Action System
- **Send Message**: Einfache Textnachrichten mit Variablen
- **Send Embed**: Rich Embeds mit Formatierung
- **Role Management**: Rollen hinzufügen/entfernen
- **WebSocket Actions**: OBS/StreamerBot Integration
- **Conditional**: Bedingungsbasierte Aktionen
- **Delays**: Zeitverzögerungen in Workflows

### Variable System
Unterstützte Variablen in Aktionen:
- `{user.id}` - User ID
- `{user.username}` - Username
- `{user.displayName}` - Display Name
- `{message.content}` - Nachrichteninhalt
- `{channel.name}` - Channel Name
- `{guild.name}` - Server Name
- `{trigger.timestamp}` - Trigger Zeitstempel

## 🔧 Entwicklung

### Code Style
- **Minimalistisch**: Klare, lesbare Codestruktur
- **Modularity**: Getrennte Verantwortlichkeiten
- **Future-proof**: Erweiterbare Architektur

### Erweiterungen hinzufügen
1. **Neue Trigger**: Erweitere `botManager.js` um neue Trigger-Types
2. **Neue Actions**: Füge Action-Types in `executeAction()` hinzu
3. **UI Komponenten**: Erstelle neue Komponenten in entsprechenden Ordnern
4. **Services**: Neue Services in `src/services/` für spezielle Funktionalitäten

## 📝 Nächste Schritte

- [ ] Workflow Builder für komplexe Action-Ketten
- [ ] Plugin System für externe Erweiterungen
- [ ] Stream Bingo Feature
- [ ] Advanced Scheduling
- [ ] Multi-Server Support
- [ ] Import/Export von Konfigurationen
- [ ] Live Activity Logs
- [ ] Performance Monitoring

## 🎨 Design Prinzipien

- **Dark Theme**: Dunkles, augenschonendes Design
- **Minimalism**: Reduzierte, fokussierte UI
- **Accessibility**: Klare Kontraste und Hover-Effekte
- **Responsiveness**: Funktioniert auf verschiedenen Bildschirmgrößen
- **Intuitive Navigation**: Logische Struktur und klare Labels

## 🔒 Sicherheit

- **Token Verschlüsselung**: Bot Tokens werden verschlüsselt gespeichert
- **Local Storage**: Alle Daten bleiben lokal auf dem System
- **Input Validation**: Alle Eingaben werden validiert
- **Error Handling**: Robuste Fehlerbehandlung

---

**Für zukünftige Entwicklung:** Dieses Grundgerüst bietet eine solide Basis für die Erweiterung um komplexere Features. Die modulare Architektur ermöglicht es, neue Funktionen einfach hinzuzufügen, ohne das bestehende System zu beeinträchtigen.
