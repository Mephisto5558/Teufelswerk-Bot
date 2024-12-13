/* eslint camelcase: [error, {allow: [toggle_module, toggle_command, \w*_prefix]}] */
const
  { Constants, EmbedBuilder, Colors, roleMention, channelMention, userMention, channelLink, bold, inlineCode } = require('discord.js'),
  { constants: { autocompleteOptionsMaxAmt }, timeFormatter: { msInSecond }, commandMention } = require('#Utils'),
  /* eslint-disable-next-line @typescript-eslint/no-magic-numbers -- this is like an enum */
  backup = new Map([['creator', 0], ['owner', 1], ['creator+owner', 2], ['admins', 3]]),
  loggerActionTypes = ['messageDelete', 'messageUpdate', 'voiceChannelActivity', 'sayCommandUsed'],
  MAX_PREFIXES_PER_GUILD = 2,
  getCMDs = /** @param {Client}client */ client => [...client.prefixCommands, ...client.slashCommands].filter(([,e]) => !e.aliasOf).map(([e]) => e).unique(),
  /** @type {Record<string, (this: GuildInteraction, lang: lang) => Promise<void>>} */
  setupMainFunctions = {
    toggle_module: async function toggleModule(lang) {
      const
        module = this.options.getString('module', true),
        setting = this.guild.db[module]?.enable; // Todo: document and probably sth like `this.guild.db.modules[module]` for better typing

      await this.guild.updateDB(`${module}.enable`, !setting);
      return this.editReply(lang('success', { name: inlineCode(module), state: lang(setting ? 'global.disabled' : 'global.enabled') }));
    },

    toggle_command: async function toggleCommand(lang) {
      const
        command = this.options.getString('command', true),
        commandData = this.guild.db.config.commands?.[command]?.disabled ?? {},
        { roles = [], channels = [], users = [] } = commandData,
        count = { enabled: { channels: 0, users: 0, roles: 0 }, disabled: { channels: 0, users: 0, roles: 0 } };

      if (!getCMDs(this.client).includes(command)) return this.editReply(lang('notFound'));

      if (this.options.getBoolean('get')) {
        /** @type {[[string, (Snowflake | '*')[]],[string, (Snowflake | '*')[]],[string, (Snowflake | '*')[]]]} */
        const fieldList = [['roles', roles], ['channels', channels], ['users', users]];
        const fields = fieldList.filter(([, e]) => e.length).map(([k, v]) => ({
          name: lang(k),
          value: v.includes('*')
            ? lang('list.all')
            : v.map(/** @param {Snowflake}e*/e => {
              if (k == 'roles') return roleMention(e);
              return k == 'channels' ? channelMention(e) : userMention(e);
            }).join(', '),
          inline: false
        }));

        const embed = new EmbedBuilder({
          title: lang('list.embedTitle', command),
          color: Colors.White,
          ...fields.length ? { fields } : { description: lang('list.embedDescription') }
        });

        return this.editReply({ embeds: [embed] });
      }

      if (this.options.data[0].options.length == (this.options.data[0].options.some(e => e.name == 'get') ? 2 : 1)) {
        await this.guild.updateDB(`config.commands.${command}.disabled.users`, users.includes('*') ? users.filter(e => e != '*') : ['*', ...users]);
        return this.editReply(lang(users.includes('*') ? 'enabled' : 'disabled', inlineCode(command)));
      }

      if (users.includes('*')) return this.editReply(lang('isDisabled', { command: inlineCode(command), commandMention: commandMention(`${this.commandName} toggle_command`, this.command.id) }));

      for (const [typeIndex, typeFilter] of ['role', 'member', 'channel'].entries()) {
        const ids = this.options.data[0].options.filter(e => e.name.includes(typeFilter)).map(e => e.value).unique();

        let type = 'roles';
        if (typeIndex == 1) type = 'users';
        else if (typeIndex == 2) type = 'channels';

        for (const id of ids) {
          if (commandData[type]?.includes(id)) {
            commandData[type] = commandData[type].filter(e => e !== id);
            count.enabled[type]++;
            continue;
          }

          commandData[type] = [...commandData[type] ?? [], id];
          count.disabled[type]++;
        }
      }

      const embed = new EmbedBuilder({
        title: lang('embedTitle', command),
        description: lang('embedDescription', commandMention(`${this.commandName} toggle_command`, this.command.id)),
        fields: Object.entries(count).filter(([, v]) => Object.values(v).find(Boolean))
          .map(([k, v]) => ({
            name: lang(`embed.${k}`),
            value: Object.entries(v).filter(([, e]) => e)
              .map(([k, v]) => `${lang(k)}: ${bold(v)}`)
              .join('\n'),
            inline: true
          })),
        color: Colors.White
      });

      await this.guild.updateDB(`config.commands.${command}.disabled`, commandData);
      return this.editReply({ embeds: [embed] });
    },

    language: async function setLanguage() {
      const
        language = this.options.getString('language', true),

        /** @type {lang} */
        newLang = this.client.i18n.__.bind(this.client.i18n, { locale: this.client.i18n.availableLocales.has(language) ? language : this.client.i18n.config.defaultLocale });

      /** @type {SlashCommand<true>} */
      let { aliasOf, name, category } = this.client.slashCommands.get(this.commandName);
      if (aliasOf) ({ name, category } = this.client.slashCommands.get(aliasOf));

      const embed = new EmbedBuilder({
        title: newLang(`commands.${category.toLowerCase()}.${name}.language.embedTitle`),
        description: newLang(`commands.${category.toLowerCase()}.${name}.language.embedDescription`, newLang('global.languageName')),
        color: Colors.Green
      });

      await this.guild.updateDB('config.lang', language);
      return this.editReply({ embeds: [embed] });
    },

    set_prefix: async function setPrefix(lang) {
      await this.client.db.delete('guildSettings', `${this.guild.id}.config.${this.client.botType == 'dev' ? 'betaBotP' : 'p'}refixes`);
      return setupMainFunctions.add_prefix.call(this, lang);
    },

    add_prefix: async function addPrefix(lang) {
      const
        prefix = this.options.getString('new_prefix', true),
        db = this.guild.db.config[`${this.client.botType == 'dev' ? 'betaBotP' : 'p'}refixes`] ?? [];

      let prefixInDB = db.find(e => prefix == e.prefix);

      const caseinsensitive = this.options.getBoolean('case_insensitive') ?? prefixInDB?.caseinsensitive ?? false;

      if (!prefixInDB && db.length >= MAX_PREFIXES_PER_GUILD) return this.customReply(lang('limitReached'));

      if (!db.length) await this.guild.updateDB(`config.${this.client.botType == 'dev' ? 'betaBotP' : 'p'}refixes`, [{ prefix, caseinsensitive }]);
      else if (prefixInDB) {
        prefixInDB ??= {};
        prefixInDB.prefix = prefix;
        prefixInDB.caseinsensitive = caseinsensitive;

        if (!db.length) db.push(prefixInDB);
        await this.guild.updateDB(`config.${this.client.botType == 'dev' ? 'betaBotP' : 'p'}refixes`, db);
      }
      else await this.client.db.pushToSet('guildSettings', `${this.guild.id}.config.${this.client.botType == 'dev' ? 'betaBotP' : 'p'}refixes`, { prefix, caseinsensitive });

      return this.customReply(lang('saved', inlineCode(prefix)));
    },
    remove_prefix: async function removePrefix(lang) {
      const
        prefix = this.options.getString('prefix', true),
        db = this.guild.db.config[`${this.client.botType == 'dev' ? 'betaBotP' : 'p'}refixes`];

      if (db.length < 2) return this.customReply(lang('cannotRemoveLastPrefix'));

      await this.guild.updateDB(`config.${this.client.botType == 'dev' ? 'betaBotP' : 'p'}refixes`, db.filter(e => e.prefix != prefix));
      return this.customReply(lang('removed', inlineCode(prefix)));
    },

    serverbackup: async function serverBackup(lang) {
      await this.guild.updateDB('serverbackup.allowedToLoad', Number.parseInt(backup.get(this.options.getString('allowed_to_load', true))));
      return this.editReply(lang('success'));
    },

    autopublish: async function toggleAutopublish(lang) {
      const enabled = this.options.getBoolean('enabled');
      await this.guild.updateDB('config.autopublish', enabled);
      return this.customReply(lang('success', lang(`global.${enabled ? 'enabled' : 'disabled'}`)));
    },

    logger: async function configureLogger(lang) {
      const
        action = this.options.getString('action', true),
        channel = (this.options.getChannel('channel') ?? this.guild.channels.cache.get(this.guild.db.config.logger?.[action].channel))?.id ?? this.channel?.id,
        enabled = this.options.getBoolean('enabled') ?? (action == 'all' ? undefined : !this.guild.db.config.logger?.[action].enabled);

      if (channel == undefined) return this.editReply(lang('noChannel'));
      if (action == 'all') {
        if (enabled == undefined) return this.editReply(lang('noEnabled'));
        for (const actionType of loggerActionTypes) await this.guild.updateDB(`config.logger.${actionType}`, { channel, enabled });
      }

      await this.guild.updateDB(`config.logger.${action}`, { channel, enabled });
      return this.editReply(lang(enabled ? 'enabled' : 'disabled', { channel: channelLink(channel), action: lang(`actions.${action}`) }));
    }
  };

module.exports = new SlashCommand({
  aliases: { slash: ['config'] },
  permissions: { user: ['ManageGuild'] },
  cooldowns: { user: msInSecond * 10 },
  options: [
    new CommandOption({
      name: 'toggle_module',
      type: 'Subcommand',
      options: [new CommandOption({
        name: 'module',
        type: 'String',
        required: true,
        choices: ['gatekeeper', 'birthday']
      })]
    }),
    new CommandOption({
      name: 'toggle_command',
      type: 'Subcommand',
      options: [
        new CommandOption({
          name: 'command',
          type: 'String',
          required: true,
          autocompleteOptions() { return getCMDs(this.client); },
          strictAutocomplete: true
        }),
        new CommandOption({ name: 'get', type: 'Boolean' }),
        /* eslint-disable @typescript-eslint/no-magic-numbers -- TODO: convert to selectMenu */
        ...Array.from({ length: 6 }, (_, i) => new CommandOption({ type: 'Role', name: `role_${i + 1}` })),
        ...Array.from({ length: 6 }, (_, i) => new CommandOption({ type: 'Channel', name: `channel_${i + 1}`, channelTypes: Constants.GuildTextBasedChannelTypes })),
        ...Array.from({ length: 6 }, (_, i) => new CommandOption({ type: 'User', name: `member_${i + 1}` }))
        /* eslint-enable @typescript-eslint/no-magic-numbers */
      ]
    }),
    new CommandOption({
      name: 'language',
      type: 'Subcommand',
      cooldowns: { guild: msInSecond * 10 },
      options: [new CommandOption({
        name: 'language',
        type: 'String',
        required: true,
        autocompleteOptions() {
          return [...this.client.i18n.availableLocales.keys()].reduce((acc, locale) => {
            if (acc.length > autocompleteOptionsMaxAmt) return acc;

            const name = this.client.i18n.__({ locale, undefinedNotFound: true }, 'global.languageName') ?? locale;
            if (name.toLowerCase().includes(this.focused.value.toLowerCase()) || locale.toLowerCase().includes(this.focused.value.toLowerCase()))
              acc.push({ name, value: locale });

            return acc;
          }, []);
        },
        strictAutocomplete: true
      })]
    }),
    new CommandOption({
      name: 'set_prefix',
      type: 'Subcommand',
      options: [
        new CommandOption({
          name: 'new_prefix',
          type: 'String',
          required: true
        }),
        new CommandOption({ name: 'case_insensitive', type: 'Boolean' })
      ]
    }),
    new CommandOption({
      name: 'add_prefix',
      type: 'Subcommand',
      options: [
        new CommandOption({
          name: 'new_prefix',
          type: 'String',
          required: true
        }),
        new CommandOption({ name: 'case_insensitive', type: 'Boolean' })
      ]
    }),
    new CommandOption({
      name: 'remove_prefix',
      type: 'Subcommand',
      options: [
        new CommandOption({
          name: 'prefix',
          type: 'String',
          autocompleteOptions() { return this.guild.db.config[this.client.botType == 'dev' ? 'betaBotPrefixes' : 'prefixes']?.map(e => e.prefix) ?? []; },
          strictAutocomplete: true,
          required: true
        })
      ]
    }),
    new CommandOption({
      name: 'serverbackup',
      type: 'Subcommand',
      options: [new CommandOption({
        name: 'allowed_to_load',
        type: 'String',
        required: true,
        autocompleteOptions: [...backup.keys()],
        strictAutocomplete: true
      })]
    }),
    new CommandOption({
      name: 'autopublish',
      type: 'Subcommand',
      options: [new CommandOption({
        name: 'enabled',
        type: 'Boolean',
        required: true
      })]
    }),
    new CommandOption({
      name: 'logger',
      type: 'Subcommand',
      options: [
        new CommandOption({
          name: 'action',
          type: 'String',
          required: true,
          choices: ['all', ...loggerActionTypes]
        }),
        new CommandOption({
          name: 'channel',
          type: 'Channel',
          channelTypes: Constants.GuildTextBasedChannelTypes
        }),
        new CommandOption({ name: 'enabled', type: 'Boolean' })
      ]
    })
  ],

  async run(lang) {
    lang.__boundArgs__[0].backupPath += `.${this.options.getSubcommand().replaceAll(/_./g, e => e[1].toUpperCase())}`;
    return setupMainFunctions[this.options.getSubcommand()].call(this, lang);
  }
});