const { Client, GatewayIntentBits, REST, Routes, Partials } = require('discord.js');
const ConfigService = require('../config/configService');

class BotManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isReady = false;
    this.logger = console.log; // Default logger
  }

  setLogger(logFunction) {
    this.logger = logFunction;
  }

  log(level, message, data = null) {
    this.logger(level, message, data);
  }

  async startBot(config) {
    if (this.client) {
      await this.stopBot();
    }

    if (!config.token) {
      throw new Error('Bot Token ist erforderlich');
    }

    this.log('info', 'Erstelle Discord Client...');
    
    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
      ],
      partials: [
        Partials.Message,
        Partials.Channel,
        Partials.Reaction
      ]
    });

    // Event Handlers
    this.client.on('ready', () => {
      this.log('success', `Bot eingeloggt als ${this.client.user.tag}`);
      this.isReady = true;
      this.registerCommands(config);
    });

    this.client.on('error', (error) => {
      this.log('error', 'Bot Fehler', error.message);
    });

    this.client.on('warn', (warning) => {
      this.log('warn', 'Bot Warnung', warning);
    });

    this.client.on('disconnect', () => {
      this.log('info', 'Bot getrennt');
      this.isConnected = false;
      this.isReady = false;
    });

    this.client.on('reconnecting', () => {
      this.log('info', 'Bot versucht Reconnect...');
    });

    // Setup message and interaction handlers
    this.setupEventHandlers();

    try {
      this.log('info', 'Verbinde mit Discord...');
      await this.client.login(config.token);
      this.isConnected = true;
      this.log('success', 'Bot erfolgreich gestartet und verbunden');
    } catch (error) {
      this.isConnected = false;
      this.isReady = false;
      this.log('error', 'Bot konnte nicht gestartet werden', error.message);
      throw new Error(`Bot konnte nicht gestartet werden: ${error.message}`);
    }
  }

  async stopBot() {
    if (this.client) {
      try {
        await this.client.destroy();
        this.log('success', 'Bot gestoppt');
      } catch (error) {
        this.log('error', 'Fehler beim Stoppen des Bots', error.message);
      }
    }
    
    this.client = null;
    this.isConnected = false;
    this.isReady = false;
  }

  getStatus() {
    return {
      connected: this.isConnected,
      ready: this.isReady,
      user: this.client?.user?.tag || null
    };
  }

  // Get current config from ConfigService
  getCurrentConfig() {
    try {
      return ConfigService.loadBotConfig();
    } catch (error) {
      this.log('error', 'Fehler beim Laden der aktuellen Konfiguration', error.message);
      return { triggers: [], actions: [], commands: [] };
    }
  }

  // Get bingo config
  getBingoConfig() {
    try {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      // Try multiple config paths for robustness
      const possibleConfigPaths = [
        // Standard config path
        process.env.APPDATA ? path.join(process.env.APPDATA, 'DiscordBotManager', 'config', 'bingo-config.json') : null,
        // macOS
        process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support', 'DiscordBotManager', 'config', 'bingo-config.json') : null,
        // Linux
        process.platform === 'linux' ? path.join(os.homedir(), '.local', 'share', 'DiscordBotManager', 'config', 'bingo-config.json') : null,
        // Fallback
        path.join(os.tmpdir(), 'DiscordBotManager', 'config', 'bingo-config.json')
      ].filter(Boolean);
      
      for (const configPath of possibleConfigPaths) {
        if (fs.existsSync(configPath)) {
          try {
            const data = fs.readFileSync(configPath, 'utf8');
            const config = JSON.parse(data);
            this.log('info', `Bingo-Config geladen von: ${configPath}`);
            return config;
          } catch (error) {
            this.log('warn', `Konnte Bingo-Config nicht laden von: ${configPath}`, error.message);
            continue;
          }
        }
      }
      
      this.log('info', 'Keine Bingo-Config gefunden, verwende Defaults');
    } catch (error) {
      this.log('error', 'Fehler beim Laden der Bingo-Konfiguration', error.message);
    }
    
    return {
      enabled: false,
      slashCommand: '/bingo',
      bingoCommand: '/bingowin',
      cardSize: { width: 5, height: 5 },
      reactionEmoji: '✅',
      decks: [],
      activeDeckId: null
    };
  }

  async registerCommands(config) {
    try {
      const currentConfig = this.getCurrentConfig();
      const bingoConfig = this.getBingoConfig();
      
      // Get slash command triggers
      const slashCommandTriggers = currentConfig.triggers?.filter(trigger => 
        trigger.type === 'slash_command'
      ) || [];

      // Also include old-style commands for backward compatibility
      const oldCommands = currentConfig.commands || [];

      const commands = [];

      // Add slash command triggers
      slashCommandTriggers.forEach(trigger => {
        commands.push({
          name: trigger.name,
          description: trigger.description || 'Bot Command',
          options: trigger.options || []
        });
        this.log('info', `Command vorbereitet: /${trigger.name}`, trigger);
      });

      // Add old-style commands
      oldCommands.forEach(cmd => {
        commands.push({
          name: cmd.name,
          description: cmd.description || 'Bot Command',
          options: cmd.options || []
        });
      });

      // Add bingo commands if enabled
      if (bingoConfig.enabled) {
        // Add bingo start command
        const bingoCommandName = bingoConfig.slashCommand.replace('/', '');
        commands.push({
          name: bingoCommandName,
          description: 'Neue Streaming Bingo Karte anfordern'
        });
        this.log('info', `Bingo Command vorbereitet: /${bingoCommandName}`);

        // Add bingo win command
        const bingoWinCommandName = bingoConfig.bingoCommand.replace('/', '');
        commands.push({
          name: bingoWinCommandName,
          description: 'Bingo melden - Ich habe gewonnen!'
        });
        this.log('info', `Bingo Win Command vorbereitet: /${bingoWinCommandName}`);
      }

      if (commands.length === 0) {
        this.log('info', 'Keine Commands zu registrieren');
        return;
      }

      const rest = new REST({ version: '10' }).setToken(config.token);
      this.log('info', `Registriere ${commands.length} Commands...`);

      if (config.guildId) {
        await rest.put(
          Routes.applicationGuildCommands(this.client.user.id, config.guildId),
          { body: commands }
        );
        this.log('success', `${commands.length} Guild Commands registriert für Guild ID: ${config.guildId}`);
      } else {
        // Register global commands if no guild ID
        await rest.put(
          Routes.applicationCommands(this.client.user.id),
          { body: commands }
        );
        this.log('success', `${commands.length} Global Commands registriert`);
      }

    } catch (error) {
      this.log('error', 'Fehler beim Registrieren der Commands', error.message);
    }
  }

  setupEventHandlers() {
    this.log('info', 'Event Handlers werden eingerichtet...');

    // Slash Command Handler
    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      this.log('info', `🎯 Slash Command empfangen: /${interaction.commandName}`, {
        user: interaction.user.username,
        guild: interaction.guild?.name,
        channel: interaction.channel?.name
      });

      const currentConfig = this.getCurrentConfig();
      const bingoConfig = this.getBingoConfig();
      
      // Check for bingo commands first
      if (bingoConfig.enabled) {
        const bingoCommandName = bingoConfig.slashCommand.replace('/', '');
        const bingoWinCommandName = bingoConfig.bingoCommand.replace('/', '');
        
        if (interaction.commandName === bingoCommandName) {
          await this.handleBingoRequest(interaction, bingoConfig);
          return;
        }
        
        if (interaction.commandName === bingoWinCommandName) {
          await this.handleBingoWin(interaction, bingoConfig);
          return;
        }
      }
      
      // Find trigger for this command
      const trigger = currentConfig.triggers?.find(t => 
        t.type === 'slash_command' && t.name === interaction.commandName
      );

      if (trigger) {
        this.log('success', `✅ Trigger gefunden für /${interaction.commandName}`, {
          triggerName: trigger.name,
          actionCount: trigger.actions?.length || 0
        });
        
        await this.executeTriggerActions(trigger, {
          user: interaction.user,
          member: interaction.member,
          channel: interaction.channel,
          guild: interaction.guild,
          interaction: interaction,
          commandParameters: this.extractParameters(interaction)
        });
      } else {
        // Check old-style commands for backward compatibility
        const command = currentConfig.commands?.find(cmd => cmd.name === interaction.commandName);
        if (command) {
          this.log('info', `📜 Legacy Command gefunden für /${interaction.commandName}`);
          await this.executeActions(command.actions, {
            user: interaction.user,
            member: interaction.member,
            channel: interaction.channel,
            guild: interaction.guild,
            interaction: interaction,
            commandParameters: this.extractParameters(interaction)
          });
        } else {
          this.log('warn', `❌ Kein Trigger/Command gefunden für /${interaction.commandName}`);
        }
      }
    });

    // Message Handler for patterns
    this.client.on('messageCreate', async (message) => {
      if (message.author.bot) return;

      const currentConfig = this.getCurrentConfig();
      const triggers = currentConfig.triggers?.filter(trigger => 
        trigger.type === 'message_pattern'
      ) || [];

      this.log('info', `💬 Nachricht erhalten von ${message.author.username}`, {
        content: message.content.substring(0, 100),
        patternTriggersCount: triggers.length
      });

      for (const trigger of triggers) {
        if (this.matchesPattern(message.content, trigger.pattern)) {
          this.log('success', `🎯 Pattern-Match gefunden!`, {
            triggerName: trigger.name,
            pattern: trigger.pattern,
            message: message.content.substring(0, 50)
          });
          
          await this.executeTriggerActions(trigger, {
            user: message.author,
            member: message.member,
            channel: message.channel,
            guild: message.guild,
            message: message
          });
        }
      }
    });

    // Reaction Handler - IMPROVED
    this.client.on('messageReactionAdd', async (reaction, user) => {
      this.log('info', `👍 Reaktion hinzugefügt`, {
        emoji: reaction.emoji.name || reaction.emoji.id,
        emojiId: reaction.emoji.id,
        emojiUnicode: reaction.emoji.toString(),
        user: user.username,
        isBot: user.bot,
        isPartial: reaction.partial,
        messageContent: reaction.message.content.substring(0, 100)
      });

      if (user.bot) {
        this.log('info', '🤖 Reaktion von Bot ignoriert');
        return;
      }

      // Handle partial reactions
      if (reaction.partial) {
        try {
          this.log('info', '🔄 Fetching partial reaction...');
          await reaction.fetch();
          this.log('success', '✅ Partial reaction gefetcht');
        } catch (error) {
          this.log('error', 'Fehler beim Laden der Reaktion', error.message);
          return;
        }
      }

      // Check for bingo event reactions first
      const bingoConfig = this.getBingoConfig();
      this.log('info', '🎯 Prüfe Bingo-Konfiguration', {
        bingoEnabled: bingoConfig.enabled,
        reactionEmoji: bingoConfig.reactionEmoji,
        messageStartsWith: reaction.message.content.startsWith('🎯')
      });
      
      if (bingoConfig.enabled) {
        // Check if this is a bingo event message
        const isBingoMessage = reaction.message.content.includes('🎯 **');
        this.log('info', '🔍 Bingo Message Check', {
          isBingoMessage,
          messageContent: reaction.message.content.substring(0, 50)
        });
        
        if (isBingoMessage && this.matchesReaction(reaction, { emoji: bingoConfig.reactionEmoji })) {
          this.log('success', '🎯 Bingo Event Reaktion erkannt!');
          await this.handleBingoEventReaction(reaction, user, bingoConfig);
          return;
        }
      }

      const currentConfig = this.getCurrentConfig();
      const triggers = currentConfig.triggers?.filter(trigger => 
        trigger.type === 'message_reaction'
      ) || [];

      this.log('info', `🔍 Prüfe ${triggers.length} Reaktions-Trigger`, {
        emojiName: reaction.emoji.name,
        emojiId: reaction.emoji.id,
        availableTriggers: triggers.map(t => ({ name: t.name, emoji: t.emoji }))
      });

      for (const trigger of triggers) {
        const matchResult = this.matchesReaction(reaction, trigger);
        this.log('info', `🔎 Checking trigger "${trigger.name}"`, {
          triggerEmoji: trigger.emoji,
          reactionEmoji: reaction.emoji.name || reaction.emoji.id,
          matches: matchResult
        });

        if (matchResult) {
          this.log('success', `🎉 Reaktions-Match gefunden!`, {
            triggerName: trigger.name,
            triggerEmoji: trigger.emoji,
            reactionEmoji: reaction.emoji.name || reaction.emoji.id
          });
          
          await this.executeTriggerActions(trigger, {
            user: user,
            member: reaction.message.guild?.members.cache.get(user.id),
            channel: reaction.message.channel,
            guild: reaction.message.guild,
            reaction: reaction,
            message: reaction.message
          });
        }
      }
    });

    this.log('success', 'Event Handlers erfolgreich eingerichtet');
  }

  async executeTriggerActions(trigger, context) {
    if (!trigger.actions || trigger.actions.length === 0) {
      this.log('warn', `⚠️ Trigger ${trigger.name} hat keine Aktionen`);
      return;
    }

    const currentConfig = this.getCurrentConfig();
    const actions = currentConfig.actions || [];

    this.log('info', `🚀 Führe ${trigger.actions.length} Aktionen für Trigger "${trigger.name}" aus`);

    for (let i = 0; i < trigger.actions.length; i++) {
      const actionId = trigger.actions[i];
      try {
        // Find action by ID
        const actionConfig = actions.find(a => a.id === actionId);
        if (actionConfig) {
          this.log('info', `⚡ Führe Aktion ${i + 1}/${trigger.actions.length} aus: ${actionConfig.name} (${actionConfig.type})`);
          await this.executeAction(actionConfig, context);
          this.log('success', `✅ Aktion erfolgreich ausgeführt: ${actionConfig.name}`);
        } else {
          this.log('error', `❌ Aktion mit ID ${actionId} nicht gefunden`);
        }
      } catch (error) {
        this.log('error', `💥 Fehler beim Ausführen der Aktion ${actionId}`, error.message);
      }
    }

    this.log('success', `🏁 Alle Aktionen für Trigger "${trigger.name}" abgeschlossen`);
  }

  async executeActions(actions, context) {
    if (!actions || actions.length === 0) return;

    for (const action of actions) {
      try {
        await this.executeAction(action, context);
      } catch (error) {
        this.log('error', 'Fehler beim Ausführen der Aktion', error.message);
      }
    }
  }

  async executeAction(action, context) {
    this.log('info', `🎬 Executing action: ${action.type} - ${action.name}`);

    switch (action.type) {
      case 'send_message':
        const content = this.replaceVariables(action.content, context);
        this.log('info', `💌 Sende Nachricht: "${content.substring(0, 50)}..."`);
        
        if (context.interaction) {
          await context.interaction.reply(content);
        } else if (context.channel) {
          await context.channel.send(content);
        }
        break;

      case 'send_embed':
        const embed = {
          title: this.replaceVariables(action.embedTitle, context),
          description: this.replaceVariables(action.embedDescription, context),
          color: parseInt(action.embedColor?.replace('#', '') || '5865f2', 16)
        };
        
        this.log('info', `📋 Sende Embed: "${embed.title}"`);
        
        if (context.interaction) {
          await context.interaction.reply({ embeds: [embed] });
        } else if (context.channel) {
          await context.channel.send({ embeds: [embed] });
        }
        break;

      case 'send_dm':
        try {
          const dmContent = this.replaceVariables(action.content, context);
          await context.user.send(dmContent);
          this.log('success', `📨 DM gesendet an ${context.user.username}: "${dmContent.substring(0, 30)}..."`);
        } catch (error) {
          this.log('error', `❌ Konnte keine DM an ${context.user.username} senden`, error.message);
        }
        break;

      case 'add_role':
        if (context.member && action.roleId) {
          try {
            await context.member.roles.add(action.roleId);
            this.log('success', `➕ Rolle ${action.roleId} hinzugefügt für ${context.user.username}`);
          } catch (error) {
            this.log('error', `❌ Konnte Rolle ${action.roleId} nicht hinzufügen für ${context.user.username}`, error.message);
          }
        }
        break;

      case 'remove_role':
        if (context.member && action.roleId) {
          try {
            await context.member.roles.remove(action.roleId);
            this.log('success', `➖ Rolle ${action.roleId} entfernt für ${context.user.username}`);
          } catch (error) {
            this.log('error', `❌ Konnte Rolle ${action.roleId} nicht entfernen für ${context.user.username}`, error.message);
          }
        }
        break;

      case 'delay':
        const seconds = action.seconds || 1;
        this.log('info', `⏱️ Warte ${seconds} Sekunden...`);
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));
        this.log('info', `✅ Wartezeit von ${seconds} Sekunden beendet`);
        break;

      case 'webhook_call':
        try {
          const fetch = require('node-fetch');
          const payload = action.payload ? JSON.parse(this.replaceVariables(action.payload, context)) : {};
          
          this.log('info', `🌐 Rufe Webhook auf: ${action.webhookUrl}`);
          
          const response = await fetch(action.webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          });
          
          this.log('success', `📡 Webhook aufgerufen: ${response.status} ${response.statusText}`);
        } catch (error) {
          this.log('error', '🚫 Webhook-Fehler', error.message);
        }
        break;

      default:
        this.log('warn', `⚠️ Aktion ${action.type} noch nicht implementiert`);
    }
  }

  replaceVariables(text, context) {
    if (!text) return '';

    const result = text
      .replace(/\{user\.id\}/g, context.user?.id || '')
      .replace(/\{user\.username\}/g, context.user?.username || '')
      .replace(/\{user\.displayName\}/g, context.member?.displayName || context.user?.username || '')
      .replace(/\{user\.mention\}/g, context.user ? `<@${context.user.id}>` : '')
      .replace(/\{message\.content\}/g, context.message?.content || '')
      .replace(/\{channel\.name\}/g, context.channel?.name || '')
      .replace(/\{channel\.mention\}/g, context.channel ? `<#${context.channel.id}>` : '')
      .replace(/\{guild\.name\}/g, context.guild?.name || '')
      .replace(/\{trigger\.timestamp\}/g, new Date().toISOString())
      .replace(/\{date\}/g, new Date().toLocaleDateString('de-DE'))
      .replace(/\{time\}/g, new Date().toLocaleTimeString('de-DE'));

    return result;
  }

  matchesPattern(content, pattern) {
    if (!pattern) return false;
    
    if (pattern.startsWith('/') && pattern.endsWith('/i')) {
      // Regex pattern
      try {
        const regex = new RegExp(pattern.slice(1, -2), 'i');
        const matches = regex.test(content);
        this.log('info', `🔍 Regex Pattern Test: "${pattern}" gegen "${content}" = ${matches}`);
        return matches;
      } catch (error) {
        this.log('error', 'Ungültiges Regex Pattern', { pattern, error: error.message });
        return false;
      }
    } else {
      // Simple string match (case insensitive)
      const matches = content.toLowerCase().includes(pattern.toLowerCase());
      this.log('info', `🔍 String Pattern Test: "${pattern}" gegen "${content}" = ${matches}`);
      return matches;
    }
  }

  matchesReaction(reaction, trigger) {
    const emojiName = reaction.emoji.name;
    const emojiId = reaction.emoji.id;
    const emojiUnicode = reaction.emoji.toString();
    const triggerEmoji = trigger.emoji;

    this.log('info', `🔍 Emoji Match Test`, {
      triggerEmoji: triggerEmoji,
      reactionEmojiName: emojiName,
      reactionEmojiId: emojiId,
      reactionEmojiUnicode: emojiUnicode
    });

    // Check for exact match with emoji name or ID
    if (triggerEmoji === emojiName || triggerEmoji === emojiId) {
      this.log('success', '✅ Direkter Emoji-Match gefunden');
      return true;
    }

    // Check for Unicode emoji match (most important fix)
    if (triggerEmoji === emojiUnicode) {
      this.log('success', '✅ Unicode Emoji-Match gefunden');
      return true;
    }

    // Check for emoji format like :thumbsup:
    if (triggerEmoji.startsWith(':') && triggerEmoji.endsWith(':')) {
      const cleanTriggerEmoji = triggerEmoji.slice(1, -1);
      const matches = cleanTriggerEmoji === emojiName;
      this.log('info', `🔍 :emoji: Format Test: ":${cleanTriggerEmoji}:" gegen "${emojiName}" = ${matches}`);
      return matches;
    }

    // Additional check for custom emoji format <:name:id>
    if (triggerEmoji.includes('<:') && triggerEmoji.includes('>')) {
      const customEmojiMatch = triggerEmoji.includes(emojiId) || triggerEmoji.includes(emojiName);
      if (customEmojiMatch) {
        this.log('success', '✅ Custom Emoji-Match gefunden');
        return true;
      }
    }

    this.log('info', '❌ Kein Emoji-Match gefunden');
    return false;
  }

  extractParameters(interaction) {
    const params = {};
    if (interaction.options) {
      interaction.options.data.forEach(option => {
        params[option.name] = option.value;
      });
    }
    return params;
  }

  // Bingo Methods
  async handleBingoRequest(interaction, bingoConfig) {
    try {
      this.log('info', `🎯 Bingo Request von ${interaction.user.username}`);
      
      if (!bingoConfig.activeDeckId) {
        await interaction.reply({
          content: '❌ Aktuell ist kein Bingo-Deck aktiv. Bitte wende dich an den Streamer!',
          ephemeral: true
        });
        return;
      }
      
      const activeDeck = bingoConfig.decks.find(deck => deck.id === bingoConfig.activeDeckId);
      if (!activeDeck || activeDeck.events.length < bingoConfig.cardSize.width * bingoConfig.cardSize.height) {
        await interaction.reply({
          content: `❌ Das aktive Deck hat zu wenige Events für eine ${bingoConfig.cardSize.width}x${bingoConfig.cardSize.height} Karte!`,
          ephemeral: true
        });
        return;
      }
      
      await interaction.deferReply({ ephemeral: true });
      
      // Generate bingo card
      const bingoCard = this.generateBingoCard(activeDeck, bingoConfig.cardSize);
      const gameId = this.generateGameId();
      
      // Save game data
      await this.saveBingoGame({
        id: gameId,
        userId: interaction.user.id,
        username: interaction.user.username,
        deckId: activeDeck.id,
        deckName: activeDeck.name,
        cardData: bingoCard,
        cardSize: bingoConfig.cardSize.width,
        confirmedEvents: [],
        startedAt: new Date().toISOString()
      });
      
      try {
        // Send DM with bingo card info
        const dmChannel = await interaction.user.createDM();
        
        // Send individual event messages privately
        let eventMessages = [];
        
        await dmChannel.send(`🎯 **Deine Bingo-Karte für "${activeDeck.name}"**\n📋 Spiel-ID: ${gameId}\n\n**Reagiere mit ${bingoConfig.reactionEmoji} auf die Events wenn sie passieren!**`);
        
        this.log('info', `Header-Nachricht gesendet, beginne mit ${bingoCard.length} Event-Nachrichten`);
        
        for (let i = 0; i < bingoCard.length; i++) {
          const event = bingoCard[i];
          const row = Math.floor(i / bingoConfig.cardSize.width) + 1;
          const col = (i % bingoConfig.cardSize.width) + 1;
          
          const eventMsg = await dmChannel.send(`🎯 **${row}.${col}** ${event.text}`);
          
          this.log('info', `Event-Nachricht ${i+1}/${bingoCard.length} gesendet: ${row}.${col} - ${event.text.substring(0, 30)}...`);
          
          // Add reaction emoji
          await eventMsg.react(bingoConfig.reactionEmoji);
          eventMessages.push({ messageId: eventMsg.id, eventId: event.id });
          
          // Small delay to avoid rate limits
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
        // Send text-based bingo card
        const textCard = this.generateTextBingoCard(bingoCard, bingoConfig, interaction.user.username);
        await dmChannel.send({ content: textCard });
        
        // Save message references
        await this.updateBingoGameMessages(gameId, eventMessages);
        
        await interaction.editReply('✅ Deine Bingo-Karte wurde dir privat gesendet! Schau in deine DMs.');
        
        this.log('success', `✅ Bingo-Karte erstellt und privat gesendet für ${interaction.user.username}`);
        
      } catch (dmError) {
        this.log('warn', 'Konnte keine DM senden, sende öffentlich', dmError.message);
        
        // Fallback: Send publicly if DM fails
        let eventMessages = [];
        for (let i = 0; i < bingoCard.length; i++) {
          const event = bingoCard[i];
          const row = Math.floor(i / bingoConfig.cardSize.width) + 1;
          const col = (i % bingoConfig.cardSize.width) + 1;
          
          const eventMsg = await interaction.followUp({
            content: `🎯 **${row}.${col}** ${event.text}`,
            fetchReply: true
          });
          
          await eventMsg.react(bingoConfig.reactionEmoji);
          eventMessages.push({ messageId: eventMsg.id, eventId: event.id });
        }
        
        const textCard = this.generateTextBingoCard(bingoCard, bingoConfig, interaction.user.username);
        await interaction.followUp({ content: textCard });
        
        await this.updateBingoGameMessages(gameId, eventMessages);
        await interaction.editReply('✅ Bingo-Karte erstellt! (DM fehlgeschlagen, öffentlich gesendet)');
      }
      
    } catch (error) {
      this.log('error', 'Fehler beim Erstellen der Bingo-Karte', error.message);
      await interaction.editReply('❌ Fehler beim Erstellen der Bingo-Karte!');
    }
  }
  
  async handleBingoWin(interaction, bingoConfig) {
    try {
      this.log('info', `🏆 Bingo Win Claim von ${interaction.user.username}`);
      
      // Find user's active game
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      const userDataDir = process.env.APPDATA || 
                         (process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support') : 
                          path.join(os.homedir(), '.local', 'share'));
      const dataDir = path.join(userDataDir, 'DiscordBotManager', 'bingo-data');
      const gamesFile = path.join(dataDir, 'active-games.json');
      
      let userGame = null;
      if (fs.existsSync(gamesFile)) {
        const games = JSON.parse(fs.readFileSync(gamesFile, 'utf8'));
        userGame = games.find(game => game.userId === interaction.user.id);
      }
      
      if (!userGame) {
        await interaction.reply({
          content: '❌ Du hast derzeit kein aktives Bingo-Spiel! Verwende zuerst `/bingo` um eine Karte anzufordern.',
          ephemeral: true
        });
        return;
      }
      
      // Save bingo win claim with game ID
      await this.saveBingoWin({
        id: this.generateGameId(),
        userId: interaction.user.id,
        username: interaction.user.username,
        gameId: userGame.id,
        deckName: userGame.deckName,
        confirmedEventsCount: userGame.confirmedEvents.length,
        totalEventsCount: userGame.cardData.length,
        timestamp: new Date().toISOString()
      });
      
      await interaction.reply({
        content: `🏆 **BINGO!** ${interaction.user.mention} behauptet ein Bingo zu haben!\n🔍 Der Streamer überprüft deine Karte...\n\n📊 **Dein Status:** ${userGame.confirmedEvents.length}/${userGame.cardData.length} Events bestätigt`,
        allowedMentions: { parse: [] }
      });
      
      this.log('success', `✅ Bingo Win gespeichert für ${interaction.user.username}`, {
        gameId: userGame.id,
        confirmedEvents: userGame.confirmedEvents.length,
        totalEvents: userGame.cardData.length
      });
      
    } catch (error) {
      this.log('error', 'Fehler beim Verarbeiten des Bingo Wins', error.message);
      await interaction.reply({
        content: '❌ Fehler beim Melden des Bingos!',
        ephemeral: true
      });
    }
  }
  
  generateBingoCard(deck, cardSize) {
    const totalFields = cardSize.width * cardSize.height;
    const shuffled = [...deck.events].sort(() => Math.random() - 0.5);
    return shuffled.slice(0, totalFields);
  }
  
  generateTextBingoCard(cardData, bingoConfig, username) {
    const gridSize = bingoConfig.cardSize.width;
    let card = `🎯 **STREAMING BINGO - ${username.toUpperCase()}**\n\n`;
    
    // Create header row with column numbers
    card += '┌';
    for (let col = 0; col < gridSize; col++) {
      card += '─────';
      if (col < gridSize - 1) card += '┬';
    }
    card += '┐\n';
    
    // Create rows
    for (let row = 0; row < gridSize; row++) {
      let rowText = '│';
      
      for (let col = 0; col < gridSize; col++) {
        const index = row * gridSize + col;
        const cellNumber = `${row + 1}.${col + 1}`;
        
        // Truncate long text and center align
        let cellText = cellNumber.padEnd(4);
        rowText += ` ${cellText}`;
        if (col < gridSize - 1) rowText += '│';
      }
      
      rowText += '│\n';
      card += rowText;
      
      // Add separator row (except for last row)
      if (row < gridSize - 1) {
        card += '├';
        for (let col = 0; col < gridSize; col++) {
          card += '─────';
          if (col < gridSize - 1) card += '┼';
        }
        card += '┤\n';
      }
    }
    
    // Bottom border
    card += '└';
    for (let col = 0; col < gridSize; col++) {
      card += '─────';
      if (col < gridSize - 1) card += '┴';
    }
    card += '┘\n';
    
    card += `\n🏆 **Ziel:** Vervollständige eine Reihe horizontal, vertikal oder diagonal!`;
    card += `\n🔄 **Anleitung:** Reagiere mit ${bingoConfig.reactionEmoji} auf Event-Nachrichten!`;
    
    return '```' + card + '```';
  }
  
  async saveBingoGame(gameData) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const dataDir = this.getDataDirectory();
      const gamesFile = path.join(dataDir, 'active-games.json');
      
      this.log('info', `Speichere Bingo Game in: ${gamesFile}`);
      
      let games = [];
      
      if (fs.existsSync(gamesFile)) {
        try {
          games = JSON.parse(fs.readFileSync(gamesFile, 'utf8'));
        } catch (parseError) {
          this.log('warn', 'Konnte bestehende Games nicht laden', parseError.message);
          games = [];
        }
      }
      
      games.push(gameData);
      fs.writeFileSync(gamesFile, JSON.stringify(games, null, 2));
      
      this.log('success', `Bingo Game erfolgreich gespeichert. Total: ${games.length} aktive Spiele`);
      
    } catch (error) {
      this.log('error', 'Fehler beim Speichern des Bingo-Spiels', error.message);
    }
  }
  
  async saveBingoWin(winData) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const dataDir = this.getDataDirectory();
      const winsFile = path.join(dataDir, 'bingo-wins.json');
      
      this.log('info', `Speichere Bingo Win in: ${winsFile}`);
      
      let wins = [];
      
      if (fs.existsSync(winsFile)) {
        try {
          wins = JSON.parse(fs.readFileSync(winsFile, 'utf8'));
        } catch (parseError) {
          this.log('warn', 'Konnte bestehende Wins nicht laden', parseError.message);
          wins = [];
        }
      }
      
      wins.push(winData);
      fs.writeFileSync(winsFile, JSON.stringify(wins, null, 2));
      
      this.log('success', `Bingo Win erfolgreich gespeichert. Total: ${wins.length} Wins`);
      
    } catch (error) {
      this.log('error', 'Fehler beim Speichern des Bingo-Wins', error.message);
    }
  }
  
  async updateBingoGameMessages(gameId, eventMessages) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const dataDir = this.getDataDirectory();
      const messagesFile = path.join(dataDir, 'game-messages.json');
      
      this.log('info', `Speichere Game Messages in: ${messagesFile}`);
      
      let gameMessages = {};
      if (fs.existsSync(messagesFile)) {
        try {
          gameMessages = JSON.parse(fs.readFileSync(messagesFile, 'utf8'));
        } catch (parseError) {
          this.log('warn', 'Konnte bestehende Game Messages nicht laden', parseError.message);
          gameMessages = {};
        }
      }
      
      gameMessages[gameId] = eventMessages;
      fs.writeFileSync(messagesFile, JSON.stringify(gameMessages, null, 2));
      
      this.log('success', `Game Messages erfolgreich gespeichert für Game: ${gameId}`);
      
    } catch (error) {
      this.log('error', 'Fehler beim Speichern der Game Messages', error.message);
    }
  }
  
  generateGameId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
  }
  
  getDataDirectory() {
    try {
      const fs = require('fs');
      const path = require('path');
      const os = require('os');
      
      let dataDir;
      
      // Try multiple possible paths for robustness
      const possiblePaths = [
        // Electron app.getPath('userData') equivalent
        process.env.APPDATA ? path.join(process.env.APPDATA, 'DiscordBotManager', 'bingo-data') : null,
        // macOS
        process.platform === 'darwin' ? path.join(os.homedir(), 'Library', 'Application Support', 'DiscordBotManager', 'bingo-data') : null,
        // Linux
        process.platform === 'linux' ? path.join(os.homedir(), '.local', 'share', 'DiscordBotManager', 'bingo-data') : null,
        // Fallback to temp directory
        path.join(os.tmpdir(), 'DiscordBotManager', 'bingo-data'),
        // Last resort fallback
        path.join(__dirname, '..', '..', '..', 'bingo-data')
      ].filter(Boolean);
      
      // Try each path until we find one that works
      for (const testPath of possiblePaths) {
        try {
          if (!fs.existsSync(testPath)) {
            fs.mkdirSync(testPath, { recursive: true });
          }
          // Test write access
          const testFile = path.join(testPath, 'test-write.txt');
          fs.writeFileSync(testFile, 'test');
          fs.unlinkSync(testFile);
          
          dataDir = testPath;
          break;
        } catch (error) {
          this.log('warn', `Pfad nicht verwendbar: ${testPath}`, error.message);
          continue;
        }
      }
      
      if (!dataDir) {
        throw new Error('Konnte kein verwendbares Datenverzeichnis finden');
      }
      
      this.log('info', `Datenverzeichnis gefunden: ${dataDir}`);
      return dataDir;
      
    } catch (error) {
      this.log('error', 'Fehler beim Bestimmen des Datenverzeichnisses', error.message);
      // Ultimate fallback
      const fallback = require('path').join(require('os').tmpdir(), 'bingo-data');
      this.log('warn', `Verwende Fallback-Pfad: ${fallback}`);
      return fallback;
    }
  }
  
  async handleBingoEventReaction(reaction, user, bingoConfig) {
    try {
      this.log('info', `🎯 Bingo Event Reaktion von ${user.username}`);
      
      // Check if this is a bingo event message
      const messageContent = reaction.message.content;
      if (!messageContent.includes('🎯 **')) {
        this.log('warn', 'Nachricht ist keine Bingo-Event-Nachricht', { content: messageContent.substring(0, 50) });
        return;
      }
      
      // Extract event text from message
      const eventTextMatch = messageContent.match(/🎯 \*\*(\d+\.\d+)\*\* (.+)/);
      if (!eventTextMatch) {
        this.log('warn', 'Konnte Event-Text nicht extrahieren', { content: messageContent });
        return;
      }
      
      const eventPosition = eventTextMatch[1];
      const eventText = eventTextMatch[2];
      
      this.log('info', `Event extrahiert: ${eventPosition} - ${eventText}`);
      
      // Get data directory with better path handling for production
      const dataDir = this.getDataDirectory();
      this.log('info', `Verwende Datenverzeichnis: ${dataDir}`);
      
      // Save event notification
      await this.saveBingoEventNotification({
        id: this.generateGameId(),
        eventText: eventText,
        eventPosition: eventPosition,
        messageId: reaction.message.id,
        channelId: reaction.message.channel.id,
        users: [{
          id: user.id,
          username: user.username
        }],
        timestamp: new Date().toISOString()
      });
      
      this.log('success', `✅ Bingo Event Notification gespeichert: "${eventText}" von ${user.username}`);
      
      // Send confirmation reaction
      try {
        await reaction.message.react('📝'); // Note emoji
        this.log('info', 'Bestätigungs-Reaktion hinzugefügt');
      } catch (reactionError) {
        this.log('warn', 'Konnte Bestätigungs-Reaktion nicht hinzufügen', reactionError.message);
      }
      
    } catch (error) {
      this.log('error', 'Fehler beim Verarbeiten der Bingo Event Reaktion', error.message);
    }
  }
  
  async saveBingoEventNotification(notification) {
    try {
      const fs = require('fs');
      const path = require('path');
      
      const dataDir = this.getDataDirectory();
      const notificationsFile = path.join(dataDir, 'event-notifications.json');
      
      this.log('info', `Speichere Event Notification in: ${notificationsFile}`);
      
      let notifications = [];
      
      // Load existing notifications
      if (fs.existsSync(notificationsFile)) {
        try {
          const data = fs.readFileSync(notificationsFile, 'utf8');
          notifications = JSON.parse(data);
          this.log('info', `${notifications.length} bestehende Notifications geladen`);
        } catch (parseError) {
          this.log('warn', 'Konnte bestehende Notifications nicht laden, starte mit leerem Array', parseError.message);
          notifications = [];
        }
      }
      
      // Check if notification for this event already exists
      const existingNotification = notifications.find(n => 
        n.eventText === notification.eventText && 
        n.eventPosition === notification.eventPosition
      );
      
      if (existingNotification) {
        // Add user to existing notification if not already there
        const userExists = existingNotification.users.find(u => u.id === notification.users[0].id);
        if (!userExists) {
          existingNotification.users.push(notification.users[0]);
          this.log('info', `User zu bestehender Notification hinzugefügt: ${notification.users[0].username}`);
        } else {
          this.log('info', `User bereits in Notification vorhanden: ${notification.users[0].username}`);
          return; // No need to save if user already exists
        }
      } else {
        // Create new notification
        notifications.push(notification);
        this.log('info', `Neue Notification erstellt für Event: ${notification.eventText}`);
      }
      
      // Save notifications with error handling
      try {
        fs.writeFileSync(notificationsFile, JSON.stringify(notifications, null, 2));
        this.log('success', `Event Notifications erfolgreich gespeichert (${notifications.length} total)`);
      } catch (writeError) {
        this.log('error', 'Fehler beim Schreiben der Notifications-Datei', writeError.message);
        throw writeError;
      }
      
    } catch (error) {
      this.log('error', 'Fehler beim Speichern der Event Notification', error.message);
      // Don't throw here to prevent breaking the reaction handling
    }
  }
}

module.exports = BotManager;