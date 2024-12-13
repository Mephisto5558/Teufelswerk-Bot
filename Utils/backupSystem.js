const
  {
    SnowflakeUtil, GatewayIntentBits, ChannelType, Constants, GuildFeature,
    StickerType, Collection, DiscordAPIError, GuildVerificationLevel, GuildExplicitContentFilter
  } = require('discord.js'),

  /** @type {import('.').BackupSystem['BackupSystem']['utils']} */
  utils = require('./backupSystem_utils.js'),

  { secsInMinute } = require('./timeFormatter.js'),

  /** @type {import('.')['DiscordAPIErrorCodes']} */
  DiscordAPIErrorCodes = require('../Utils/DiscordAPIErrorCodes.json');

/**
 * @typedef {import('.').BackupSystem.BackupSystem}TBackupSystem
 * @typedef {import('.').BackupSystem.Backup}TBackup */

class BackupSystem {
  /**
   * @param {import('@mephisto5558/mongoose-db').DB}db
   * @param {object}options
   * @param {string}options.dbName
   * @param {number}options.maxGuildBackups
   * @param {number}options.maxMessagesPerChannel
   * @param {boolean}options.saveImages
   * @param {boolean}options.clearGuildBeforeRestore
   */
  constructor(db, { dbName = 'backups', maxGuildBackups = 5, maxMessagesPerChannel = 10, saveImages = false, clearGuildBeforeRestore = true } = {}) {
    this.db = db;
    this.dbName = dbName;
    if (!this.db.get(this.dbName)) void this.db.set(this.dbName, {});

    this.defaultSettings = {
      maxGuildBackups, saveImages,
      clearGuildBeforeRestore, maxMessagesPerChannel
    };
  }

  /** @type {TBackupSystem['get']} */
  get = (backupId, guildId = '') => this.db.get(this.dbName, `${guildId}${backupId}`);

  /** @type {TBackupSystem['list']} */
  list = guildId => {
    /** @type {Collection<string, TBackup>} */
    const collection = new Collection(Object.entries(this.db.get(this.dbName)));
    return guildId ? collection.filter(e => e?.guildId == guildId) : collection;
  };

  /** @type {TBackupSystem['remove']} */
  remove = backupId => this.db.delete(this.dbName, backupId);

  /** @type {TBackupSystem['create']} */
  create = async (guild, {
    statusObj = {}, id, save = true, maxGuildBackups = this.defaultSettings.maxGuildBackups,
    backupMembers = false, maxMessagesPerChannel = this.defaultSettings.maxMessagesPerChannel,
    doNotBackup = [], saveImages = this.defaultSettings.saveImages, metadata
  } = {}) => {
    if (!guild.client.options.intents.has(GatewayIntentBits.Guilds)) throw new Error('Guilds intent is required');

    statusObj.status = 'create.settings';
    const data = {
      /* eslint-disable-next-line sonarjs/no-incorrect-string-concat -- false positive */
      id: id ?? guild.id + SnowflakeUtil.generate().toString(),
      metadata: metadata ?? undefined,
      createdAt: new Date(),
      name: guild.name,
      guildId: guild.id,
      locale: guild.preferredLocale,
      features: guild.features,
      iconURL: guild.iconURL(),
      splashURL: guild.splashURL(),
      bannerURL: guild.bannerURL(),
      systemChannel: guild.systemChannel?.name,
      systemChannelFlags: guild.systemChannelFlags.bitfield,
      rulesChannel: guild.rulesChannel?.name,
      updatesChannel: guild.publicUpdatesChannel?.name,
      verificationLevel: guild.verificationLevel,
      explicitContentFilter: guild.explicitContentFilter,
      defaultMessageNotifications: guild.defaultMessageNotifications,
      afk: guild.afkChannel ? { name: guild.afkChannel.name, timeout: guild.afkTimeout } : undefined,
      widget: {
        enabled: guild.widgetEnabled,
        channel: guild.widgetChannel?.name
      },
      members: [],
      bans: [],
      roles: [],
      emojis: [],
      stickers: []
    };

    if (backupMembers) {
      statusObj.status = 'create.members';

      (await guild.members.fetch()).map(e => ({
        id: e.id,
        username: e.user.username,
        tag: e.user.tag,
        nickname: e.nickname,
        avatarUrl: e.displayAvatarURL(),
        roles: [...e.roles.cache.map(e => e.name).values()],
        bot: e.user.bot
      }));
    }

    if (!doNotBackup.includes('bans')) {
      statusObj.status = 'create.bans';

      data.bans = (await guild.bans.fetch()).map(e => ({ id: e.user.id, reason: e.reason }));
    }

    if (!doNotBackup.includes('roles')) {
      statusObj.status = 'create.roles';

      (await guild.roles.fetch()).filter(e => !e.managed).sort((a, b) => b.position - a.position).map(e => ({
        name: e.name,
        color: e.color,
        hoist: e.hoist,
        permissions: e.permissions.bitfield.toString(),
        mentionable: e.mentionable,
        position: e.position,
        isEveryone: guild.id == e.id
      }));
    }

    if (!doNotBackup.includes('emojis')) {
      statusObj.status = 'create.emojis';

      data.emojis = await Promise.all((await guild.emojis.fetch()).map(async e => {
        const emojiData = { name: e.name };
        if (saveImages) emojiData.base64 = await utils.fetchToBase64(e.imageURL());
        else emojiData.url = e.imageURL();

        return emojiData;
      }));
    }

    if (!doNotBackup.includes('stickers')) {
      statusObj.status = 'create.stickers';

      data.stickers = await (await guild.stickers.fetch()).reduce(async (acc, e) => {
        if (e.type == StickerType.Standard) return acc;

        const stickerData = { name: e.name, description: e.description, tags: e.tags };
        if (saveImages) stickerData.base64 = await utils.fetchToBase64(e.url);
        else stickerData.url = e.url;

        (await acc).push(stickerData);
        return acc;
      }, Promise.resolve([]));
    }

    if (!doNotBackup.includes('channels')) {
      statusObj.status = 'create.channels';

      const channels = (await guild.channels.fetch()).sort((a, b) => a.position - b.position);

      data.channels = {};
      data.channels.categories = await Promise.all(channels
        .filter(e => e.type == ChannelType.GuildCategory)
        .map(async e => ({
          name: e.name,
          permissions: utils.fetchChannelPermissions(e),
          children: await utils.fetchCategoryChildren(e, saveImages, maxMessagesPerChannel)
        })));

      data.channels.others = await Promise.all(channels
        .filter(e => !e.parent && ![ChannelType.GuildCategory, ...Constants.ThreadChannelTypes].includes(e.type))
        .map(e => utils.fetchTextChannelData(e, saveImages, maxMessagesPerChannel)));
    }


    statusObj.status = 'create.images';
    if (saveImages) {
      data.iconBase64 = await utils.fetchToBase64(guild.iconURL());
      data.splashBase64 = await utils.fetchToBase64(guild.splashURL());
      data.bannerBase64 = await utils.fetchToBase64(guild.bannerURL());
    }

    if (save) {
      const backups = this.db.get(this.dbName);
      backups[data.id] = data;

      let guildBackups = Object.keys(backups).filter(e => e.startsWith(guild.id));
      if (guildBackups.length > maxGuildBackups) {
        guildBackups = guildBackups.toSorted().reverse().slice(0, maxGuildBackups);
        for (const backupId of guildBackups) await this.db.delete(this.dbName, backupId);
      }
      else await this.db.update(this.dbName, data.id, data);
    }

    return data;
  };

  /** @type {TBackupSystem['load']} */
  load = async (id, guild, {
    statusObj, clearGuildBeforeRestore = this.defaultSettings.clearGuildBeforeRestore, maxMessagesPerChannel = this.defaultSettings.maxMessagesPerChannel,
    allowedMentions = [], reason = 'Backup Feature | Load'
  } = {}) => {
    /** @type {NonNullable<NonNullable<import('../types/database').Database['backups']>[`${Snowflake}${Snowflake}`]>} *//* eslint-disable-line jsdoc/valid-types -- false positive */
    let data, rulesChannel, publicUpdatesChannel;

    if (id == undefined) data = this.list(guild.id).sort((a, b) => b.createdAt - a.createdAt).first();
    else data = typeof id == 'string' ? this.get(id) : id;

    if (clearGuildBeforeRestore) {
      statusObj.status = 'clear.items';
      for (const [, item] of [
        ...await guild.channels.fetch(), ...await guild.emojis.fetch(), ...await guild.stickers.fetch(),
        ...(await guild.roles.fetch()).filter(e => !e.managed && e.editable && e.id != guild.id && !guild.roles.cache.some(e2 => e2.name == e.name && e2.editable))
      ]) {
        try { await item.delete(reason); }
        catch (err) {
          if (!(err instanceof DiscordAPIError)) throw err;
        }
      }

      statusObj.status = 'clear.bans';
      for (const [, { user, reason: banReason }] of await guild.bans.fetch()) {
        if (!data.bans.some(e => user.id == e.id && banReason == e.reason)) {
          try { await guild.bans.remove(user.id, reason); }
          catch (err) {
            if (!(err instanceof DiscordAPIError)) throw err;
          }
        }
      }

      statusObj.status = 'clear.settings';
      await guild.edit({
        /* eslint-disable unicorn/no-null -- `null` must be used here, as `undefined` is interpreted as 'Keep current data' */
        reason,
        verificationLevel: guild.features.includes(GuildFeature.Community) ? undefined : GuildVerificationLevel.None,
        explicitContentFilter: guild.features.includes(GuildFeature.Community) ? undefined : GuildExplicitContentFilter.Disabled,
        afkTimeout: secsInMinute * 5, /* eslint-disable-line @typescript-eslint/no-magic-numbers -- 5mins */
        systemChannel: null,
        systemChannelFlags: [],
        preferredLocale: null,
        defaultMessageNotifications: null,
        afkChannel: null,
        icon: data.iconURL ? undefined : null,
        splash: data.splashURL && guild.splash ? undefined : null,
        banner: data.bannerURL && guild.banner ? undefined : null
      });

      if (data.widget.enabled != guild.widgetEnabled || guild.widgetChannel) await guild.setWidgetSettings({ enabled: false, channel: null }, reason);
      /* eslint-enable unicorn/no-null */
    }

    statusObj.status = 'load.settings';
    await guild.edit({
      reason, name: data.name,
      verificationLevel: data.verificationLevel,
      explicitContentFilter: data.explicitContentFilter,
      systemChannelFlags: data.systemChannelFlags,
      preferredLocale: data.locale,
      defaultMessageNotifications: data.defaultMessageNotifications,
      afkTimeout: data.afk.timeout,
      afkChannel: data.afk?.name ? guild.channels.cache.find(e => e.name == data.afk.name && e.type == ChannelType.GuildVoice) : undefined,
      icon: data.iconBase64 ? utils.loadFromBase64(data.iconBase64) : data.iconURL,
      splash: data.splashBase64 ? utils.loadFromBase64(data.splashBase64) : data.splashURL,
      banner: data.bannerBase64 ? utils.loadFromBase64(data.bannerBase64) : data.bannerURL
    });

    if (data.features.includes(GuildFeature.Community)) {
      data.features = data.features.filter(e => e != GuildFeature.Community);
      rulesChannel = guild.rulesChannel ?? await guild.channels.create({ name: 'temp_rules', type: ChannelType.GuildText });
      publicUpdatesChannel = guild.publicUpdatesChannel ?? await guild.channels.create({ name: 'temp_updates', type: ChannelType.GuildText });
      await guild.edit({ features: [...guild.features, GuildFeature.Community].unique(), rulesChannel, publicUpdatesChannel, reason });
    }

    statusObj.status = 'load.features';
    for (const feature of data.features) {
      try { await guild.edit({ features: [...guild.features, feature].unique(), reason }); }
      catch (err) {
        if (!(err instanceof DiscordAPIError)) throw err;
      }
    }

    statusObj.status = 'load.roles';
    for (const { isEveryone, name, color, hoist, permissions, mentionable } of data.roles) {
      const roleData = { reason, name, color, hoist, mentionable, permissions: BigInt(permissions) };
      const roleToEdit = isEveryone ? guild.roles.cache.get(guild.id) : guild.roles.cache.find(e => e.name == name && e.editable);
      await (roleToEdit?.edit(roleData) ?? guild.roles.create(roleData));
    }

    statusObj.status = 'load.members';
    const members = await guild.members.fetch();
    for (const memberData of data.members) {
      const member = members.get(memberData.id);
      if (!memberData.roles.length && !memberData.nickname || !member?.manageable) continue;

      await member.edit({
        roles: memberData.roles.map(e => guild.roles.cache.find(e2 => e2.name == e)?.id).filter(e => e?.editable),
        nickname: memberData.nickname ?? undefined
      });
    }

    statusObj.status = 'load.channels';
    for (const category of data.channels.categories) {
      const channel = await guild.channels.create({
        reason, name: category.name,
        type: ChannelType.GuildCategory,
        permissionOverwrites: category.permissions.map(e => {
          const role = guild.roles.cache.find(e2 => e2.name == e.name);
          return role ? { id: role.id, allow: BigInt(e.allow), deny: BigInt(e.deny) } : undefined;
        })
      });

      for (const child of category.children) await utils.loadChannel(child, guild, channel, maxMessagesPerChannel, allowedMentions);
    }

    for (const channel of data.channels.others) await utils.loadChannel(channel, guild, undefined, maxMessagesPerChannel, allowedMentions);

    statusObj.status = 'load.emojis';
    for (const emoji of data.emojis) {
      try { await guild.emojis.create({ name: emoji.name, attachment: emoji.url ?? utils.loadFromBase64(emoji.base64), reason }); }
      catch (err) {
        if (err.code != DiscordAPIErrorCodes.MaximumNumberOfEmojisReached) throw err;
        break;
      }
    }

    statusObj.status = 'load.stickers';
    for (const sticker of data.stickers) {
      try { await guild.stickers.create({ name: sticker.name, description: sticker.description, tags: sticker.tags, file: sticker.url ?? utils.loadFromBase64(sticker.base64), reason }); }
      catch (err) {
        if (err.code != DiscordAPIErrorCodes.MaximumNumberOfStickersReached) throw err;
        break;
      }
    }

    statusObj.status = 'load.bans';
    for (const ban of data.bans) {
      try { await guild.bans.create(ban.id, { reason: ban.reason, deleteMessageSeconds: 0 }); }
      catch (err) {
        if (!(err instanceof DiscordAPIError)) throw err;
      }
    }

    if (data.widget.channel) await guild.setWidgetSettings({ enabled: data.widget.enabled, channel: guild.channels.cache.find(e => e.name == data.widget.channel) }, reason);

    if (rulesChannel || publicUpdatesChannel) {
      statusObj.status = 'load.settings';
      const rChannel = guild.channels.cache.find(e => e.name == data.rulesChannel);
      const uChannel = guild.channels.cache.find(e => e.name == data.publicUpdatesChannel);

      await guild.edit({
        rulesChannel: rChannel ?? undefined,
        publicUpdatesChannel: uChannel ?? undefined,
        reason
      });

      if (rulesChannel && rChannel) await guild.channels.delete(rulesChannel, reason);
      if (publicUpdatesChannel && uChannel) await guild.channels.delete(publicUpdatesChannel, reason);
    }

    statusObj.status = 'clear.ownWebhooks';
    for (const [, webhook] of (await guild.fetchWebhooks()).filter(e => e.name == 'MessagesBackup')) await webhook.delete(reason);

    return data;
  };

  static utils = utils;
}

module.exports = BackupSystem;