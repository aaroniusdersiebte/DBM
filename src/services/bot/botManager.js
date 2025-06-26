const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');
const ConfigService = require('../config/configService');

class BotManager {
  constructor() {
    this.client = null;
    this.isConnected = false;
    this.isReady = false;
  }

  async startBot(config) {
    if (this.client) {
      await this.stopBot();
    }

    if (!config.token) {
      throw new Error('Bot Token ist erforderlich');
    }

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMessageReactions,
        GatewayIntentBits.GuildMembers
      ]
    });

    // Event Handlers
    this.client.on('ready', () => {
      console.log(`Bot eingeloggt als ${this.client.user.tag}`);
      this.isReady = true;
      this.registerCommands(config);
    });

    this.client.on('error', (error) => {
      console.error('Bot Fehler:', error);
    });

    this.client.on('disconnect', () => {
      console.log('Bot getrennt');
      this.isConnected = false;
      this.isReady = false;
    });

    // Setup message and interaction handlers
    this.setupEventHandlers();

    try {
      await this.client.login(config.token);
      this.isConnected = true;
      console.log('Bot erfolgreich gestartet');
    } catch (error) {
      this.isConnected = false;
      this.isReady = false;
      throw new Error(`Bot konnte nicht gestartet werden: ${error.message}`);
    }
  }

  async stopBot() {
    if (this.client) {
      try {
        await this.client.destroy();
        console.log('Bot gestoppt');
      } catch (error) {
        console.error('Fehler beim Stoppen des Bots:', error);
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
      console.error('Fehler beim Laden der aktuellen Konfiguration:', error);
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
        console.log('Keine Commands zu registrieren');
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
      });

      // Add old-style commands
      oldCommands.forEach(cmd => {
        commands.push({
          name: cmd.name,
          description: cmd.description || 'Bot Command',
          options: cmd.options || []
        });
      });

      if (config.guildId) {
        await rest.put(
          Routes.applicationGuildCommands(this.client.user.id, config.guildId),
          { body: commands }
        );
        console.log(`${commands.length} Guild Commands registriert für Guild ID: ${config.guildId}`);
      } else {
        // Register global commands if no guild ID
        await rest.put(
          Routes.applicationCommands(this.client.user.id),
          { body: commands }
        );
        console.log(`${commands.length} Global Commands registriert`);
      }

    } catch (error) {
      console.error('Fehler beim Registrieren der Commands:', error);
    }
  }

  setupEventHandlers() {
    // Slash Command Handler
    this.client.on('interactionCreate', async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      console.log(`Slash Command empfangen: /${interaction.commandName}`);

      const currentConfig = this.getCurrentConfig();
      
      // Find trigger for this command
      const trigger = currentConfig.triggers?.find(t => 
        t.type === 'slash_command' && t.name === interaction.commandName
      );

      if (trigger) {
        console.log(`Trigger gefunden für /${interaction.commandName}, führe ${trigger.actions?.length || 0} Aktionen aus`);
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
          console.log(`Legacy Command gefunden für /${interaction.commandName}`);
          await this.executeActions(command.actions, {
            user: interaction.user,
            member: interaction.member,
            channel: interaction.channel,
            guild: interaction.guild,
            interaction: interaction,
            commandParameters: this.extractParameters(interaction)
          });
        } else {
          console.log(`Kein Trigger/Command gefunden für /${interaction.commandName}`);
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

      console.log(`Nachricht erhalten: \"${message.content.substring(0, 50)}...\", prüfe ${triggers.length} Pattern-Trigger`);

      for (const trigger of triggers) {
        if (this.matchesPattern(message.content, trigger.pattern)) {
          console.log(`Pattern-Match gefunden für Trigger: ${trigger.name}`);
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

    // Reaction Handler
    this.client.on('messageReactionAdd', async (reaction, user) => {
      if (user.bot) return;

      // Handle partial reactions
      if (reaction.partial) {
        try {
          await reaction.fetch();
        } catch (error) {
          console.error('Fehler beim Laden der Reaktion:', error);
          return;
        }
      }

      const currentConfig = this.getCurrentConfig();
      const triggers = currentConfig.triggers?.filter(trigger => 
        trigger.type === 'message_reaction'
      ) || [];

      console.log(`Reaktion hinzugefügt: ${reaction.emoji.name || reaction.emoji.id}, prüfe ${triggers.length} Reaktions-Trigger`);

      for (const trigger of triggers) {
        if (this.matchesReaction(reaction, trigger)) {
          console.log(`Reaktions-Match gefunden für Trigger: ${trigger.name}`);
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
  }

  async executeTriggerActions(trigger, context) {
    if (!trigger.actions || trigger.actions.length === 0) {
      console.log(`Trigger ${trigger.name} hat keine Aktionen`);
      return;
    }

    const currentConfig = this.getCurrentConfig();
    const actions = currentConfig.actions || [];

    console.log(`Führe ${trigger.actions.length} Aktionen für Trigger ${trigger.name} aus`);

    for (const actionId of trigger.actions) {
      try {
        // Find action by ID
        const actionConfig = actions.find(a => a.id === actionId);
        if (actionConfig) {
          console.log(`Führe Aktion aus: ${actionConfig.name} (${actionConfig.type})`);
          await this.executeAction(actionConfig, context);
        } else {
          console.error(`Aktion mit ID ${actionId} nicht gefunden`);
        }
      } catch (error) {
        console.error(`Fehler beim Ausführen der Aktion ${actionId}:`, error);
      }
    }
  }

  async executeActions(actions, context) {
    if (!actions || actions.length === 0) return;

    for (const action of actions) {
      try {
        await this.executeAction(action, context);
      } catch (error) {
        console.error('Fehler beim Ausführen der Aktion:', error);
      }
    }
  }

  async executeAction(action, context) {
    console.log(`Executing action: ${action.type} - ${action.name}`);

    switch (action.type) {
      case 'send_message':
        const content = this.replaceVariables(action.content, context);
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
          console.log(`DM gesendet an ${context.user.username}`);
        } catch (error) {
          console.error('Konnte keine DM senden:', error);
        }
        break;

      case 'add_role':
        if (context.member && action.roleId) {
          try {
            await context.member.roles.add(action.roleId);
            console.log(`Rolle ${action.roleId} hinzugefügt für ${context.user.username}`);
          } catch (error) {
            console.error('Konnte Rolle nicht hinzufügen:', error);
          }
        }
        break;

      case 'remove_role':
        if (context.member && action.roleId) {
          try {
            await context.member.roles.remove(action.roleId);
            console.log(`Rolle ${action.roleId} entfernt für ${context.user.username}`);
          } catch (error) {
            console.error('Konnte Rolle nicht entfernen:', error);
          }
        }
        break;

      case 'delay':
        const seconds = action.seconds || 1;
        console.log(`Warte ${seconds} Sekunden...`);
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));
        break;

      case 'webhook_call':
        try {
          const fetch = require('node-fetch');
          const payload = action.payload ? JSON.parse(this.replaceVariables(action.payload, context)) : {};
          
          const response = await fetch(action.webhookUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload)
          });
          
          console.log(`Webhook aufgerufen: ${response.status}`);
        } catch (error) {
          console.error('Webhook-Fehler:', error);
        }
        break;

      default:
        console.log(`Aktion ${action.type} noch nicht implementiert`);
    }
  }

  replaceVariables(text, context) {
    if (!text) return '';

    return text
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
  }

  matchesPattern(content, pattern) {
    if (!pattern) return false;
    
    if (pattern.startsWith('/') && pattern.endsWith('/i')) {
      // Regex pattern
      try {
        const regex = new RegExp(pattern.slice(1, -2), 'i');
        return regex.test(content);
      } catch (error) {
        console.error('Ungültiges Regex Pattern:', pattern, error);
        return false;
      }
    } else {
      // Simple string match (case insensitive)
      return content.toLowerCase().includes(pattern.toLowerCase());
    }
  }

  matchesReaction(reaction, trigger) {
    const emojiName = reaction.emoji.name;
    const emojiId = reaction.emoji.id;
    const triggerEmoji = trigger.emoji;

    // Check for exact match with emoji name or ID
    if (triggerEmoji === emojiName || triggerEmoji === emojiId) {
      return true;
    }

    // Check for emoji format like :thumbsup:
    if (triggerEmoji.startsWith(':') && triggerEmoji.endsWith(':')) {
      const cleanTriggerEmoji = triggerEmoji.slice(1, -1);
      return cleanTriggerEmoji === emojiName;
    }

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