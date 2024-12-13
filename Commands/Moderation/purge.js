const
  { Message, Constants, Collection } = require('discord.js'),
  { getTargetChannel, DiscordAPIErrorCodes, timeFormatter: { msInSecond }, constants: { bulkDeleteMaxMessageAmt } } = require('#Utils'),
  maxPercentage = 100,
  maxMsgsToFetch = 100,
  maxAllowedPurgeAmt = 1000,

  /**
   * @param {string}str
   * filters discord invites, invite.gg, dsc.gg, disboard.org links */
  adRegex = str => new RegExp(
    String.raw`(?:(?=discord)(?<!support\.)(?:discord(?:app)?[\W_]*(?:com|gg|io|link|me|net|plus)\/|`
    + String.raw`(?<=\w\.)\w+\/)(?=.)|watchanimeattheoffice[\W_]*com)(?!\/?(?:attachments|channels)\/)`
    + String.raw`|(?:dsc|invite)[\W_]*gg|disboard[\W_]*org`, 'i'
  ).test(str),
  filterOptionsExist = /** @param {Record<string, string | number | boolean | undefined>}options */ options => Object.keys(options).some(e => e != 'amount' && e != 'channel'),

  /** @type {Record<string, (msg: Message<true>) => boolean>} */
  filterCheck = {
    text: msg => !!msg.content.length,
    embeds: msg => !!msg.embeds.length,
    mentions: msg => !!msg.mentions.users.size,
    images: msg => !!msg.attachments.some(e => e.contentType.includes('image')),
    /* eslint-disable-next-line camelcase -- option name for better user-readability */
    server_ads: msg => adRegex(msg.content) || !!msg.embeds.some(e => adRegex(e.description))
  };

/** @type {import('./purge')['shouldDeleteMsg']} */
function shouldDeleteMsg(msg, options) {
  const
    /* eslint-disable-next-line jsdoc/require-param -- false positive */
    check = /** @param {GenericFunction}fn @param {string}option */ (fn, option) => !!(
      !option
      || msg.content.toLowerCase()[fn](option.toLowerCase())
      || msg.embeds.some(e => e.description?.toLowerCase()[fn](option.toLowerCase()))
    ),
    checkCaps = () => !('caps_percentage' in options && options.caps_percentage > 0)
      || msg.content.replaceAll(/[^A-Z]/g, '').length / msg.content.length * maxPercentage >= options.caps_percentage
      || msg.embeds.some(e => e.description?.replaceAll(/[^A-Z]/g, '').length / (e.description?.length ?? 0) * maxPercentage >= options.caps_percentage)
      || !msg.content && !msg.embeds.some(e => e.description),
    bool = !!(msg.bulkDeletable && (!!options.remove_pinned || !msg.pinned)),
    userType = msg.user.bot ? 'bot' : 'human';

  if (!filterOptionsExist(options)) return bool;

  /* eslint-disable-next-line sonarjs/expression-complexity -- good readability */
  return bool
    && (!('member' in options) || msg.user.id == options.member.id)
    && (!('user_type' in options) || options.user_type == userType)
    && (!('only_containing' in options) || filterCheck[options.only_containing](msg))
    && checkCaps()
    && check('includes', options.contains) && check('includes', options.does_not_contain)
    && check('startsWith', options.starts_with) && check('startsWith', options.not_starts_with)
    && check('endsWith', options.ends_with) && check('endsWith', options.not_ends_with);
}

const maxMsgs = 250;

/**
 * @param {Message['channel']}channel
 * @param {string?}before
 * @param {string?}after
 * @param {number?}limit */
async function fetchMsgs(channel, before, after, limit = maxMsgs) {
  const options = { limit: Math.min(limit, maxMsgsToFetch), before, after };

  let
    lastId,
    collection = new Collection();

  while (collection.size < limit) {
    if (lastId) options.before = lastId;

    const messages = await channel.messages.fetch(options);
    if (!messages.size) break;

    /* eslint-disable-next-line unicorn/prefer-spread -- false positive: Collection extends Map, not Array */
    collection = collection.concat(messages);
    lastId = messages.at(-1).id;
    options.limit = Math.min(limit - collection.size, maxMsgsToFetch);
  }

  return collection;
}

module.exports = new MixedCommand({
  aliases: { prefix: ['clear'] },
  permissions: { client: ['ManageMessages', 'ReadMessageHistory'], user: ['ManageMessages'] },
  cooldowns: { guild: msInSecond },
  ephemeralDefer: true,
  options: [
    new CommandOption({
      name: 'amount',
      type: 'Integer',
      minValue: 1,
      maxValue: maxAllowedPurgeAmt,
      required: true
    }),
    new CommandOption({
      name: 'only_containing',
      type: 'String',
      choices: ['text', 'mentions', 'server_ads', 'images', 'embeds']
    }),
    new CommandOption({ name: 'member', type: 'User' }),
    new CommandOption({
      name: 'channel',
      type: 'Channel',
      channelTypes: Constants.GuildTextBasedChannelTypes
    }),
    new CommandOption({ name: 'remove_pinned', type: 'Boolean' }),
    new CommandOption({
      name: 'caps_percentage',
      type: 'Number',
      minValue: 1,
      maxValue: maxPercentage
    }),
    new CommandOption({ name: 'contains', type: 'String' }),
    new CommandOption({ name: 'does_not_contain', type: 'String' }),
    new CommandOption({ name: 'starts_with', type: 'String' }),
    new CommandOption({ name: 'not_starts_with', type: 'String' }),
    new CommandOption({ name: 'ends_with', type: 'String' }),
    new CommandOption({ name: 'not_ends_with', type: 'String' }),
    new CommandOption({
      name: 'user_type',
      type: 'String',
      choices: ['bot', 'human']
    }),
    new CommandOption({ name: 'before_message', type: 'String' }),
    new CommandOption({ name: 'after_message', type: 'String' })
  ],

  async run(lang) {
    const
      amount = this.options?.getInteger('amount', true) ?? Number.parseInt(this.args[0]).limit({ min: 0, max: maxAllowedPurgeAmt }),

      /** @type {import('discord.js').GuildTextBasedChannel} */
      channel = getTargetChannel(this, { returnSelf: true }),
      options = Object.fromEntries(this.options?.data.map(e => [e.name, e.value]) ?? []);

    let
      messages,
      count = 0;

    if (!amount) return this.customReply(Number.isNaN(amount) ? lang('invalidNumber') : lang('noNumber'));
    if (options.before != undefined && options.after != undefined) return this.customReply(lang('beforeAndAfter'));

    if (this instanceof Message) {
      try { await this.delete(); }
      catch (err) {
        if (err.code != DiscordAPIErrorCodes.UnknownMessage) throw err;
      }
    }

    if (filterOptionsExist(options)) {
      if (
        options.contains?.includes(options.does_not_contain) || options.does_not_contains?.includes(options.contains)
        || options.starts_with != undefined && options.does_not_contain == options.not_starts_with
        || options.ends_with != undefined && options.ends_with == options.not_ends_with
      ) return this.editReply(lang('paramsExcludeOther'));

      messages = await fetchMsgs(channel, options.before, options.after, amount);
    }
    else messages = await fetchMsgs(channel, undefined, undefined, amount);

    messages = [...messages.filter(e => shouldDeleteMsg(e, options)).keys()];
    if (!messages.length) return this.customReply(lang('noneFound'));

    const sleepTime = 2000;
    for (let i = 0; i < messages.length; i += bulkDeleteMaxMessageAmt) {
      count += (await channel.bulkDelete(messages.slice(i, i + bulkDeleteMaxMessageAmt))).size;
      if (messages[i + bulkDeleteMaxMessageAmt]) await sleep(sleepTime);
    }

    return this.customReply(lang('success', { count, all: messages.length }), msInSecond * 10);
  }
});

/* eslint-disable unicorn/consistent-function-scoping, camelcase, @typescript-eslint/no-magic-numbers
-- in there due to performance reasons (testing code not used in production) */

/** Tests the purge filters */
/** @typedef {{input: [Record<string, unknown>, Record<string, string>], expectedOutput: boolean}}data */
function _testPurge() {
  /** @param {data[]}data */
  function addEmbed(...data) {
    return data.reduce((acc, e) => {
      const obj = structuredClone(e);

      obj.input[0].embeds = [{ description: obj.input[0].content }];
      delete obj.input[0].content;
      acc.push(e, obj);

      return acc;
    }, []).sort((/** @type {data} */a, /** @type {data} */b) => Number('content' in b.input[0]) - Number('content' in a.input[0]));
  }

  /** @param {data[]}data */
  function addFlip(...data) {
    return data.reduce((acc, e) => {
      const obj = structuredClone(e);

      obj.input[1].does_not_contain = obj.input[1].contains;
      obj.input[1].not_starts_with = obj.input[1].starts_with;
      obj.input[1].not_ends_with = obj.input[1].ends_with;

      delete obj.input[1].contains;
      delete obj.input[1].starts_with;
      delete obj.input[1].ends_with;

      acc.push(e, obj);

      return acc;
    }, []).sort((/** @type {data} */a, /** @type {data} */b) => {
      const orderMap = { contains: 0, starts_with: 1, ends_with: 2, does_not_contain: 3, not_starts_with: 4, not_ends_with: 5 };
      return orderMap[Object.keys(a.input[1])[0]] - orderMap[Object.keys(b.input[1])[0]];
    });
  }

  const
    msg = { bulkDeletable: true, user: {} },
    testCases = [
      [{ input: [{ ...msg }, {}], expectedOutput: true }],
      [
        { input: [{ ...msg, bulkDeletable: false }, {}], expectedOutput: false },
        { input: [{ ...msg, bulkDeletable: true }, {}], expectedOutput: true }
      ],
      [
        { input: [{ ...msg, pinned: false }, { remove_pinned: true }], expectedOutput: true },
        { input: [{ ...msg, pinned: true }, { remove_pinned: true }], expectedOutput: true },
        { input: [{ ...msg, pinned: false }, { remove_pinned: false }], expectedOutput: true },
        { input: [{ ...msg, pinned: true }, { remove_pinned: false }], expectedOutput: false }
      ],
      [
        { input: [{ ...msg, user: { id: '123' } }, { member: '123' }], expectedOutput: true },
        { input: [{ ...msg, user: { id: '987' } }, { member: '123' }], expectedOutput: false }
      ],
      [
        { input: [{ ...msg, user: { bot: true } }, { user_type: 'human' }], expectedOutput: false },
        { input: [{ ...msg, user: { bot: true } }, { user_type: 'bot' }], expectedOutput: true },
        { input: [{ ...msg, user: { bot: false } }, { user_type: 'human' }], expectedOutput: true },
        { input: [{ ...msg, user: { bot: false } }, { user_type: 'bot' }], expectedOutput: false }
      ],
      [
        { input: [{ ...msg, content: undefined }, { only_containing: 'text' }], expectedOutput: false },
        { input: [{ ...msg, content: 'test' }, { only_containing: 'text' }], expectedOutput: true },
        { input: [{ ...msg, embeds: undefined }, { only_containing: 'embeds' }], expectedOutput: false },
        { input: [{ ...msg, embeds: [] }, { only_containing: 'embeds' }], expectedOutput: false },
        { input: [{ ...msg, embeds: [{}] }, { only_containing: 'embeds' }], expectedOutput: true },
        { input: [{ ...msg, mentions: { users: { size: 0 } } }, { only_containing: 'mentions' }], expectedOutput: false },
        { input: [{ ...msg, mentions: { users: { size: 5 } } }, { only_containing: 'mentions' }], expectedOutput: true },
        { input: [{ ...msg, attachments: undefined }, { only_containing: 'images' }], expectedOutput: false },
        { input: [{ ...msg, attachments: [] }, { only_containing: 'images' }], expectedOutput: false },
        { input: [{ ...msg, attachments: [{ contentType: 'video' }] }, { only_containing: 'images' }], expectedOutput: false },
        { input: [{ ...msg, attachments: [{ contentType: 'image' }] }, { only_containing: 'images' }], expectedOutput: true },
        { input: [{ ...msg, content: undefined }, { only_containing: 'server_ads' }], expectedOutput: false },
        { input: [{ ...msg, content: 'hi' }, { only_containing: 'server_ads' }], expectedOutput: false },
        { input: [{ ...msg, content: 'discord.gg/123' }, { only_containing: 'server_ads' }], expectedOutput: true }
      ],
      [
        ...addEmbed(
          { input: [{ ...msg, content: undefined }, { caps_percentage: 0 }], expectedOutput: true },
          { input: [{ ...msg, content: '' }, { caps_percentage: 0 }], expectedOutput: true },
          { input: [{ ...msg, content: 'hi' }, { caps_percentage: 0 }], expectedOutput: true },
          { input: [{ ...msg, content: 'HI' }, { caps_percentage: 0 }], expectedOutput: true },
          { input: [{ ...msg, content: undefined }, { caps_percentage: 10 }], expectedOutput: true },
          { input: [{ ...msg, content: '' }, { caps_percentage: 10 }], expectedOutput: true },
          { input: [{ ...msg, content: 'hi' }, { caps_percentage: 10 }], expectedOutput: false },
          { input: [{ ...msg, content: 'HI' }, { caps_percentage: 10 }], expectedOutput: true },
          { input: [{ ...msg, content: 'Hi' }, { caps_percentage: 10 }], expectedOutput: true },
          { input: [{ ...msg, content: 'abcdefghij' }, { caps_percentage: 10 }], expectedOutput: false },
          { input: [{ ...msg, content: 'Abcdefghij' }, { caps_percentage: 10 }], expectedOutput: true },
          { input: [{ ...msg, content: 'Abcdefghij' }, { caps_percentage: 100 }], expectedOutput: false },
          { input: [{ ...msg, content: 'ABCDEFGHIJ' }, { caps_percentage: 100 }], expectedOutput: true }
        ),
        { input: [{ ...msg, embeds: undefined }, { caps_percentage: 0 }], expectedOutput: true },
        { input: [{ ...msg, embeds: [] }, { caps_percentage: 0 }], expectedOutput: true },
        { input: [{ ...msg, embeds: [{}] }, { caps_percentage: 0 }], expectedOutput: true }
      ],
      addFlip(
        ...addEmbed(
          { input: [{ ...msg, content: undefined }, { contains: 'test' }], expectedOutput: false },
          { input: [{ ...msg, content: '' }, { contains: 'test' }], expectedOutput: false },
          { input: [{ ...msg, content: 'test' }, { contains: 'test' }], expectedOutput: true },
          { input: [{ ...msg, content: '123test123' }, { contains: 'test' }], expectedOutput: true },
          { input: [{ ...msg, content: '123TEST123' }, { contains: 'test' }], expectedOutput: true },
          { input: [{ ...msg, content: '123no123' }, { contains: 'test' }], expectedOutput: false }
        ),
        { input: [{ ...msg, embeds: undefined }, { contains: 'test' }], expectedOutput: false },
        { input: [{ ...msg, embeds: [] }, { contains: 'test' }], expectedOutput: false },
        { input: [{ ...msg, embeds: [{}] }, { contains: 'test' }], expectedOutput: false }
      ),
      addFlip(
        ...addEmbed(
          { input: [{ ...msg, content: undefined }, { starts_with: 'test' }], expectedOutput: false },
          { input: [{ ...msg, content: '' }, { starts_with: 'test' }], expectedOutput: false },
          { input: [{ ...msg, content: 'test' }, { starts_with: 'test' }], expectedOutput: true },
          { input: [{ ...msg, content: '123test123' }, { starts_with: 'test' }], expectedOutput: false },
          { input: [{ ...msg, content: 'TEST123' }, { starts_with: 'test' }], expectedOutput: true },
          { input: [{ ...msg, content: '123TEST123' }, { starts_with: 'test' }], expectedOutput: false },
          { input: [{ ...msg, content: 'no123' }, { starts_with: 'test' }], expectedOutput: false },
          { input: [{ ...msg, content: '123no123' }, { starts_with: 'test' }], expectedOutput: false }
        ),
        { input: [{ ...msg, embeds: undefined }, { starts_with: 'test' }], expectedOutput: false },
        { input: [{ ...msg, embeds: [] }, { starts_with: 'test' }], expectedOutput: false },
        { input: [{ ...msg, embeds: [{}] }, { starts_with: 'test' }], expectedOutput: false }
      )
    ].flat();

  require('#Utils/testAFunction.js')(shouldDeleteMsg, testCases);
}