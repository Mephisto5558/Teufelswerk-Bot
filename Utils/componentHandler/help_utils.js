const
  { EmbedBuilder, Colors, ActionRowBuilder, StringSelectMenuBuilder, codeBlock, inlineCode } = require('discord.js'),

  /** @type {import('..').permissionTranslator} */
  permissionTranslator = require('../permissionTranslator.js'),
  { secsInMinute, msInSecond } = require('../timeFormatter');

/**
 * @type {import('.').help_getCommands}
 * @this {ThisParameterType<import('.').help_getCommands>} */ // This is here due to eslint
function getCommands() { return [...this.client.prefixCommands.values(), ...this.client.slashCommands.values()].unique().filter(filterCommands.bind(this)); }

/**
 * @type {import('.').help_getCommandCategories}
 * @this {ThisParameterType<import('.').help_getCommandCategories>} */ // This is here due to eslint
function getCommandCategories() { return getCommands.call(this).map(e => e.category).unique(); }

/**
 * @this {Interaction | Message}
 * @param {lang}lang
 * @param {string[]?}commandCategories */
function createCategoryComponent(lang, commandCategories) {
  commandCategories ??= getCommandCategories.call(this);
  const defaultOption = (this.options?.getString('command') ? undefined : this.options?.getString('category'))
    ?? (this.client.prefixCommands.get(this.args?.[1]) ?? this.client.slashCommands.get(this.args?.[1]))?.category
    ?? (this.values ? this.message.components[0].components[0].options.find(e => e.value === this.values[0])?.value : undefined);

  if (this.message?.components.length) {
    if (defaultOption) {
      delete this.message.components[0].components[0].options.find(e => e.default)?.default;
      this.message.components[0].components[0].options.find(e => e.value === defaultOption.toLowerCase()).default = true;
    }
    return this.message.components[0];
  }

  return new ActionRowBuilder({
    components: [new StringSelectMenuBuilder({
      customId: 'help.category',
      placeholder: lang('categoryListPlaceholder'),
      minValues: 0,
      options: commandCategories.map(e => ({
        label: lang(`commands.${e}.categoryName`),
        value: e,
        default: defaultOption?.toLowerCase() == e
      }))
    })]
  });
}

/**
 * @this {Interaction | Message}
 * @param {lang}lang
 * @param {string}category */
function createCommandsComponent(lang, category) {
  const defaultOption = this.args?.[1] ?? this.options?.getString('command')
    ?? (this.message?.components[1] ? this.message.components[1].components[0].options.find(e => e.value === this.values[0])?.value : undefined);

  return new ActionRowBuilder({
    components: [new StringSelectMenuBuilder({
      customId: 'help.command',
      placeholder: lang('commandListPlaceholder'),
      minValues: 0,
      options: getCommands.call(this).reduce((acc, e) => {
        if (e.category == category && !e.aliasOf) acc.push({ label: e.name, value: e.name, default: defaultOption == e.name });
        return acc;
      }, [])
    })]
  });
}

/**
 * @this {Interaction | Message}
 * @param {SlashCommand | PrefixCommand | MixedCommand | undefined}cmd
 * @param {lang}lang */
function createInfoFields(cmd, lang) {
  const
    arr = [],
    prefixKey = this.client.botType == 'dev' ? 'betaBotPrefixes' : 'prefixes',
    prefix = this.guild?.db.config[prefixKey]?.[0].prefix ?? this.client.defaultSettings.config[prefixKey][0].prefix;

  cmd ??= {};
  if (cmd.aliases.prefix?.length ?? 0) arr.push({ name: lang('one.prefixAlias'), value: cmd.aliases.prefix.map(inlineCode).join(', '), inline: true });
  if (cmd.aliases.slash?.length ?? 0) arr.push({ name: lang('one.slashAlias'), value: cmd.aliases.slash.map(inlineCode).join(', '), inline: true });
  if (cmd.aliasOf) arr.push({ name: lang('one.aliasOf'), value: inlineCode(cmd.aliasOf), inline: true });
  if (cmd.permissions.client.length > 0)
    arr.push({ name: lang('one.botPerms'), value: permissionTranslator(cmd.permissions.client, lang.__boundArgs__[0].locale, this.client.i18n).map(inlineCode).join(', '), inline: false });
  if (cmd.permissions.user.length > 0)
    arr.push({ name: lang('one.userPerms'), value: permissionTranslator(cmd.permissions.user, lang.__boundArgs__[0].locale, this.client.i18n).map(inlineCode).join(', '), inline: true });

  const cooldowns = Object.entries(cmd.cooldowns).filter(([, e]) => e);
  if (cooldowns.length) {
    arr.push({
      name: lang('one.cooldowns'), inline: false,
      value: cooldowns.map(([k, v]) => {
        const min = Math.floor(v / secsInMinute * msInSecond);
        let sec = v % secsInMinute;
        sec = sec % 1 ? sec.toFixed(2) : Math.floor(sec);

        if (min && sec) return `${lang('global.' + k)}: ${min}min ${sec}s`;
        return `${lang('global.' + k)}: ` + (min ? `${min}min` : `${sec}s`);
      }).join(', ')
    });
  }

  const
    usage = (cmd.usageLocalizations[lang.__boundArgs__[0].locale]?.usage ?? cmd.usage.usage)?.replaceAll('{prefix}', prefix),
    examples = (cmd.usageLocalizations[lang.__boundArgs__[0].locale]?.examples ?? cmd.usage.examples)?.replaceAll('{prefix}', prefix);

  if (usage) arr.push({ name: codeBlock(lang('one.usage')), value: usage, inline: true });
  if (examples) arr.push({ name: codeBlock(lang('one.examples')), value: examples, inline: true });

  return arr;
}

/**
 * @this {Interaction | Message}
 * @param {SlashCommand | PrefixCommand | MixedCommand | undefined}cmd */
function filterCommands(cmd) {
  return !!cmd?.name && !cmd.disabled && (this.client.botType != 'dev' || cmd.beta)
    && (!this.client.config.ownerOnlyFolders.includes(cmd.category) || this.client.config.devIds.has(this.user.id));
}

/** @type {import('.').help_commandQuery} */
module.exports.commandQuery = async function commandQuery(lang, query) {
  if (this.values && !this.values.length) return module.exports.categoryQuery.call(this, lang, this.message.components[0].components[0].data.options.find(e => e.default).value);

  const command = this.client.slashCommands.get(query) ?? this.client.prefixCommands.get(query);
  if (!filterCommands.call(this, command)) {
    const embed = new EmbedBuilder({
      description: lang('one.notFound', inlineCode(query)),
      color: Colors.Red
    });

    return this.customReply({ embeds: [embed], components: [createCategoryComponent.call(this, lang)] });
  }

  const

    /** @type {langUNF} */
    helpLang = this.client.i18n.__.bind(this.client.i18n, {
      undefinedNotFound: true, locale: this.guild?.localeCode ?? this.client.defaultSettings.config.lang, backupPath: `commands.${command.category}.${command.name}`
    }),
    prefixKey = this.client.botType == 'dev' ? 'betaBotPrefixes' : 'prefixes',
    embed = new EmbedBuilder({
      title: lang('one.embedTitle', { category: command.category, command: command.name }),
      description: helpLang('description') ?? command.description,
      fields: createInfoFields.call(this, command, lang),
      footer: { text: lang('one.embedFooterText', `"${(this.guild?.db.config[prefixKey] ?? this.client.defaultSettings.config[prefixKey]).map(e => e.prefix).join('", "')}"`) },
      color: Colors.Blurple
    });

  return this.customReply({ embeds: [embed], components: [createCategoryComponent.call(this, lang), createCommandsComponent.call(this, lang, command.category)] });
};

/** @type {import('.').help_categoryQuery} */
module.exports.categoryQuery = async function categoryQuery(lang, query) {
  if (!query) {
    delete this.message?.components[0].components[0].data.options.find(e => e.default)?.default;
    return module.exports.allQuery.call(this, lang);
  }

  const

    /** @type {langUNF} */
    helpLang = this.client.i18n.__.bind(this.client.i18n, {
      undefinedNotFound: true, locale: this.guild?.localeCode ?? this.client.defaultSettings.config.lang,
      backupPath: `commands.${query}`
    }),
    commands = getCommands.call(this),
    embed = new EmbedBuilder({
      title: lang(`commands.${query}.categoryName`),
      description: lang(`commands.${query}.categoryDescription`),
      fields: commands.reduce((acc, e) => { // U+200E (LEFT-TO-RIGHT MARK) is used to make a newline for better spacing
        if (e.category == query && !e.aliasOf && filterCommands.call(this, e))
          acc.push({ name: e.name, value: (helpLang(`${e.name}.description`) ?? e.description) + '\n\u200E', inline: true });
        return acc;
      }, []),
      footer: { text: lang(this.client.botType == 'dev' ? 'devEmbedFooterText' : 'all.embedFooterText') },
      color: Colors.Blurple
    });

  if (!embed.data.fields.length) embed.data.description = lang('all.notFound');

  return this.customReply({ embeds: [embed], components: [createCategoryComponent.call(this, lang), createCommandsComponent.call(this, lang, query)] });
};

/** @type {import('.').help_allQuery} */
module.exports.allQuery = async function allQuery(lang) {
  const
    commandCategories = getCommandCategories.call(this),
    embed = new EmbedBuilder({
      title: lang('all.embedTitle'),
      description: lang(commandCategories.length ? 'all.embedDescription' : 'all.notFound'),

      // /u200E is used here to add extra space
      fields: commandCategories.map(e => ({
        name: lang(`commands.${e}.categoryName`),
        value: lang(`commands.${e}.categoryDescription`) + '\n\u200E',
        inline: true
      })),
      footer: { text: lang('all.embedFooterText') },
      color: commandCategories.length ? Colors.Blurple : Colors.Red
    });

  return this.customReply({ embeds: [embed], components: [createCategoryComponent.call(this, lang, commandCategories)] });
};

module.exports.getCommands = getCommands;
module.exports.getCommandCategories = getCommandCategories;