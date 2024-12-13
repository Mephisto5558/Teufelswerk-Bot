/* eslint-disable no-extend-native */
const
  { BaseInteraction, Message, Collection, AutocompleteInteraction, User, Guild, GuildMember, ButtonBuilder, Events, Client } = require('discord.js'),
  TicTacToe = require('discord-tictactoe'),
  GameBoardButtonBuilder = require('discord-tictactoe/dist/src/bot/builder/GameBoardButtonBuilder').default,
  { randomInt } = require('node:crypto'),
  { join } = require('node:path'),
  { DB } = require('@mephisto5558/mongoose-db'),
  { SlashCommand, PrefixCommand, MixedCommand, CommandOption } = require('@mephisto5558/command'),
  { I18nProvider } = require('@mephisto5558/i18n'),
  Log = require('./Log.js'),
  customReply = require('./message_customReply.js'),
  { runMessages } = require('./message_runMessages.js'),
  _patch = require('./message__patch.js'),
  playAgain = require('./TicTacToe_playAgain.js'),
  findAllEntries = require('../findAllEntries.js'),
  { setDefaultConfig } = require('../configValidator.js'),
  defaultValueLoggingMaxJSONLength = 100,

  parentUptime = Number(process.argv.find(e => e.startsWith('uptime'))?.split('=')[1]) || 0;

module.exports = { Log, _patch, customReply, runMessages, playAgain };

globalThis.log = new Log();
globalThis.sleep = require('node:util').promisify(setTimeout);

/* eslint-disable unicorn/no-null -- must be `null` for binding*/
globalThis.SlashCommand = SlashCommand.bind(null, globalThis.log);
globalThis.PrefixCommand = PrefixCommand.bind(null, globalThis.log);
globalThis.MixedCommand = MixedCommand.bind(null, globalThis.log);
globalThis.CommandOption = CommandOption.bind(null, globalThis.log);
/* eslint-enable unicorn/no-null*/

/**
 * @param {Record<string, any>}target
 * @param {Record<string, any>}source
 * @returns {object} recursively merged Object */
function deepMerge(target, source) {
  for (const key in source) {
    if (key == '__proto__' || key == 'constructor') continue;
    if (Object.hasOwn(source, key)) target[key] = source[key] instanceof Object ? deepMerge(target[key] ?? {}, source[key]) : source[key];
  }

  return target;
}

const config = setDefaultConfig();

if (!config.hideOverwriteWarning) {
  console.warn(
    'Overwriting the following variables and functions (if they exist):'
    + '\n  Globals:    global.sleep, global.log, global.getEmoji'
    + `\n  Vanilla:    ${parentUptime ? 'process#childUptime, process#uptime (adding parent process uptime),' : ''} Array#random, Array#unique, `
    + 'Number#limit, Number#inRange, Object#filterEmpty, Object#__count__, Function#bBind'
    + '\n  Discord.js: BaseInteraction#customReply, Message#user, Message#customReply, Message#runMessages, Client#prefixCommands, Client#slashCommands, Client#cooldowns, '
    + 'Client#loadEnvAndDB, Client#awaitReady, Client#defaultSettings, Client#settings, AutocompleteInteraction#focused, User#db, User#updateDB, Guild#db, guild#updateDB, '
    + 'Guild#localeCode, GuildMember#db'
    + '\n  Modifying Discord.js Message._patch method.'
  );
}

if (parentUptime) {
  /* eslint-disable-next-line custom/unbound-method -- still on the same class */
  process.childUptime = process.uptime;
  process.uptime = function uptime() {
    return this.childUptime() + parentUptime;
  };
}

// #region BuildIn
Object.defineProperties(Array.prototype, {
  random: {
    /** @type {global['Array']['prototype']['random']} */
    value: function random() { return this[randomInt(this.length)]; },
    enumerable: false
  },
  unique: {
    /** @type {global['Array']['prototype']['unique']} */
    value: function unique() { return [...new Set(this)]; },
    enumerable: false
  }
});
Object.defineProperties(Number.prototype, {
  limit: {
    /** @type {global['Number']['prototype']['limit']} */
    value: function limit({ min = Number.NEGATIVE_INFINITY, max = Number.POSITIVE_INFINITY } = {}) { return Math.min(Math.max(Number(this), min), max); },
    enumerable: false
  },
  inRange: {
    /** @type {global['Number']['prototype']['inRange']} */
    value: function inRange(min, max) {
      let minRange, maxRange;
      if (typeof min == 'object') {
        maxRange = min.max;
        minRange = min.min;
      }

      return Number(this) > (minRange ?? min ?? Number.NEGATIVE_INFINITY) && Number(this) < (maxRange ?? max ?? Number.POSITIVE_INFINITY);
    },
    enumerable: false
  }
});
Object.defineProperties(Object.prototype, {
  /** @type {global['Object']['prototype']['filterEmpty']} */
  filterEmpty: {
    value: function filterEmpty() {
      return Object.entries(this).reduce((acc, [k, v]) => {
        if (!(v === null || (typeof v == 'object' && !v.__count__)))
          acc[k] = v instanceof Object ? v.filterEmpty() : v;
        return acc;
      }, {});
    },
    enumerable: false
  },
  __count__: {
    /** @type {global['Object']['prototype']['__count__']} */
    get: function get() {
      let count = 0;
      for (const prop in this) if (Object.hasOwn(this, prop)) count++;

      return count;
    },
    enumerable: false
  }
});
Object.defineProperty(Function.prototype, 'bBind', {
  /**
   * @type {global['Function']['prototype']['bBind']}
   * @this {CallableFunction} */
  value: function bBind(thisArg, ...args) {
    const bound = this.bind(thisArg, ...args);
    bound.__targetFunction__ = this;
    bound.__boundThis__ = thisArg;
    bound.__boundArgs__ = args;
    return bound;
  },
  enumerable: false
});

// #endregion

// #region Discord.js
Object.defineProperty(BaseInteraction.prototype, 'customReply', {
  value: customReply,
  enumerable: false
});
Object.defineProperties(Client.prototype, {
  commands: {
    value: { slash: new Collection(), prefix: new Collection() }
  },
  i18n: {
    value: new I18nProvider({
      notFoundMessage: 'TEXT_NOT_FOUND: {key}', localesPath: join(process.cwd(), 'Locales'),
      warnLoggingFunction: log._log.bind(log, { file: 'warn', type: 'I18n' })
    })
  },
  cooldowns: { value: new Map() },
  config: { value: config },

  /** @type {Record<string, (this: Client, val: any) => any>} */
  settings: {
    get() { return this.db.get('botSettings'); },
    set(val) { void this.db.set('botSettings', val); }
  },

  /** @type {Record<string, (this: Client, val: any) => any>} */
  defaultSettings: {
    get() { return this.db.get('botSettings', 'defaultGuild'); },
    set(val) { void this.db.update('botSettings', 'defaultGuild', val); }
  },
  loadEnvAndDB: {
    /** @type {Client['loadEnvAndDB']} */
    value: async function loadEnvAndDB() {
      let /** @type {import('../../types/locals').EnvJSON} */env, /** @type {import('@mephisto5558/mongoose-db').DB | undefined} */db;
      try { env = require('../../env.json'); }
      catch (err) {
        if (err.code != 'MODULE_NOT_FOUND') throw err;

        db = await new DB().init(process.env.dbConnectionStr, 'db-collections', defaultValueLoggingMaxJSONLength, log._log.bind(log, { file: 'debug', type: 'DB' }));
        env = db.get('botSettings', 'env');
      }

      env = deepMerge(env.global, env[env.global.environment]);
      db ??= await new DB().init(env.dbConnectionStr, 'db-collections', defaultValueLoggingMaxJSONLength, log._log.bind(log, { file: 'debug', type: 'DB' }));

      if (!db.cache.size) {
        log('Database is empty, generating default data');
        await db.generate();
      }

      this.db = db;
      this.botType = env.environment;
      this.keys = env.keys;
    }
  },
  awaitReady: {
    /** @type {Client['awaitReady']} */
    value: async function awaitReady() {
      return new Promise(res => this.once(Events.ClientReady, () => res(this.application.name ? this.application : this.application.fetch())));
    }
  }
});
Object.defineProperty(AutocompleteInteraction.prototype, 'focused', {
  /** @this {AutocompleteInteraction} */
  get() { return this.options.getFocused(true); },

  /**
   * @this {AutocompleteInteraction}
   * @param {AutocompleteInteraction['focused']['value']}val */
  set(val) { this.options.data.find(e => e.focused).value = val; }
});
Object.defineProperty(Message.prototype, 'user', {
  /** @this {Message} */
  get() { return this.author; }
});
Object.assign(Message.prototype, { customReply, runMessages, _patch });
Object.defineProperties(User.prototype, {
  /** @type {Record<string, (this: User, val: any) => any>} */
  db: {
    get() { return this.client.db.get('userSettings', this.id) ?? {}; },
    set(val) { void this.updateDB(undefined, val); }
  },
  updateDB: {
    /** @type {User['updateDB']} */
    value: async function updateDB(key, value) { return this.client.db.update('userSettings', `${this.id}${key ? '.' + key : ''}`, value); }
  },

  /** @type {Record<string, (this: User, val: any) => any>} */
  customName: {
    get() { return this.db.customName ?? this.username; },
    set(val) { void this.updateDB('customName', val); }
  }
});
Object.defineProperties(GuildMember.prototype, {
  /** @type {Record<string, (this: GuildMember, val: any) => any>} */
  db: {
    get() { return findAllEntries(this.guild.db, this.id); },
    set() { throw new Error('You cannot set a value to GuildMember#db!'); }
  },

  /** @type {Record<string, (this: GuildMember, val: any) => any>} */
  customName: {
    get() { return this.guild.db.customNames?.[this.id] ?? this.nickname ?? this.user.username; },
    set(val) { void this.guild.updateDB(`customNames.${this.id}`, val); }
  }
});
Object.defineProperties(Guild.prototype, {
  /** @type {Record<string, (this: Guild, val: any) => any>} */
  db: {
    get() { return this.client.db.get('guildSettings', this.id) ?? {}; },
    set(val) { void this.updateDB(undefined, val); }
  },
  updateDB: {
    /** @type {Guild['updateDB']} */
    value: function updateDB(key, value) { return this.client.db.update('guildSettings', this.id + (key ? `.${key}` : ''), value); }
  },

  /** @type {Record<string, (this: Guild, val: Guild['localeCode']) => Guild['localeCode']>} */
  localeCode: {
    get() { return this.db.config.lang ?? (this.preferredLocale.startsWith('en') ? 'en' : this.preferredLocale); },
    set(val) { void this.updateDB('config.lang', val); }
  }
});

// #endregion

// #region mongoose-db
Object.defineProperty(DB.prototype, 'generate', {
  /** @type {DB['generate']} */
  value: async function generate(overwrite = false) {
    this.saveLog(`generating db files${overwrite ? ', overwriting existing data' : ''}`);
    await Promise.all(require('../../Templates/db_collections.json').map(({ key, value }) => this.set(key, value, overwrite)));
  },
  enumerable: false
});

// #endregion

// #region discord-tictactoe
Object.defineProperty(TicTacToe.prototype, 'playAgain', {
  value: playAgain,
  enumerable: false
});

Object.defineProperty(GameBoardButtonBuilder.prototype, 'createButton', {
  /**
   * @param {number}row
   * @param {number}col */
  value: function createButton(row, col) {
    const
      button = new ButtonBuilder(),
      buttonIndex = row * this.boardSize + col,
      buttonData = this.boardData[buttonIndex];

    // Discord does not allow empty strings as label, this is a "ZERO WIDTH SPACE"
    if (buttonData === 0) button.setLabel('\u200B');
    else {
      if (this.customEmojies) button.setEmoji(this.emojies[buttonData]);
      else button.setLabel(this.buttonLabels[buttonData - 1]);

      if (this.disableButtonsAfterUsed) button.setDisabled(true);
    }
    return button.setCustomId(buttonIndex.toString()).setStyle(this.buttonStyles[buttonData]);
  },
  enumerable: false
});

// #endregion