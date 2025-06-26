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

  async registerCommands(config) {
    try {
      const currentConfig = this.getCurrentConfig();
      
      // Get slash command triggers
      const slashCommandTriggers = currentConfig.triggers?.filter(trigger => 
        trigger.type === 'slash_command'
      ) || [];

      // Also include old-style commands for backward compatibility
      const oldCommands = currentConfig.commands || [];

      if (slashCommandTriggers.length === 0 && oldCommands.length === 0) {
        this.log('info', 'Keine Commands zu registrieren');
        return;
      }

      const rest = new REST({ version: '10' }).setToken(config.token);
      
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
        user: user.username,
        isBot: user.bot,
        isPartial: reaction.partial
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
    const triggerEmoji = trigger.emoji;

    this.log('info', `🔍 Emoji Match Test`, {
      triggerEmoji: triggerEmoji,
      reactionEmojiName: emojiName,
      reactionEmojiId: emojiId
    });

    // Check for exact match with emoji name or ID
    if (triggerEmoji === emojiName || triggerEmoji === emojiId) {
      this.log('success', '✅ Direkter Emoji-Match gefunden');
      return true;
    }

    // Check for emoji format like :thumbsup:
    if (triggerEmoji.startsWith(':') && triggerEmoji.endsWith(':')) {
      const cleanTriggerEmoji = triggerEmoji.slice(1, -1);
      const matches = cleanTriggerEmoji === emojiName;
      this.log('info', `🔍 :emoji: Format Test: ":${cleanTriggerEmoji}:" gegen "${emojiName}" = ${matches}`);
      return matches;
    }

    // Check for Unicode emoji match
    if (triggerEmoji === emojiName) {
      this.log('success', '✅ Unicode Emoji-Match gefunden');
      return true;
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
}

module.exports = BotManager;