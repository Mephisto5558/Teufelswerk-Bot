const
  { ActionRowBuilder, ButtonBuilder, ButtonStyle, DiscordAPIError, codeBlock } = require('discord.js'),
  { DiscordApiErrorCodes, constants: { buttonLabelMaxLength, messageActionrowMaxAmt, actionRowMaxButtonAmt }, timeFormatter: { msInSecond } } = require('#Utils');

/** @type {command<'slash'>} */
module.exports = {
  cooldowns: { user: msInSecond / 2 },
  slashCommand: true,
  prefixCommand: false,
  ephemeralDefer: true,
  options: [
    {
      name: 'json',
      type: 'Subcommand',
      options: [{ name: 'json', type: 'String' }]
    },
    {
      name: 'custom',
      type: 'Subcommand',
      options: [
        {
          name: 'style',
          type: 'String',
          choices: Object.keys(ButtonStyle).filter(Number).map(String),
          required: true
        },
        { name: 'emoji', type: 'String' },
        {
          name: 'label',
          type: 'String',
          maxLength: buttonLabelMaxLength
        },
        {
          name: 'url',
          type: 'String',
          maxLength: 1000 /* eslint-disable-line @typescript-eslint/no-magic-numbers -- todo: find out max valid button url length */
        },
        { name: 'new_row', type: 'Boolean' },
        { name: 'content', type: 'String' },
        { name: 'message_id', type: 'String' }
      ]
    }
  ],

  async run(lang) {
    const
      custom = this.options.getString('json'),
      content = this.options.getString('content') ?? undefined,
      isLink = this.options.getString('style', true) == ButtonStyle.Link,

      /** @type {`${bigint}` | null}*//* eslint-disable-line jsdoc/valid-types -- false positive */
      msgId = this.options.getString('message_id');

    let url = this.options.getString('url');

    if (isLink) {
      if (!/^(?:(?:discord|https?):\/\/)?[\w\-.]+\.[a-z]+/i.test(url)) return this.editReply(lang('invalidURL'));
      if (!url.startsWith('http') && !url.startsWith('discord://')) url = `https://${url}`;
    }

    let msg;
    if (msgId) {
      try { msg = await this.channel.messages.fetch(msgId); }
      catch (err) {
        if (err.code != DiscordApiErrorCodes.UnknownMessage) throw err;
        return this.editReply(lang('msgNotFound'));
      }

      if (msg.user.id != this.client.user.id) return this.editReply(lang('botIsNotAuthor'));
      if (msg.components.length >= messageActionrowMaxAmt && this.options.getBoolean('new_row') || msg.components[messageActionrowMaxAmt - 1].components.length >= actionRowMaxButtonAmt)
        return this.editReply(lang('buttonLimitReached'));
    }

    try {
      const button = new ButtonBuilder(custom
        ? JSON.parse(custom)
        : {
          style: Number.parseInt(this.options.getString('style')),
          label: this.options.getString('label'),
          emoji: this.options.getString('emoji'),
          url
        });

      if (!isLink) button.setCustomId(`buttonCommandButton_${Date.now()}`);

      const components = msg?.components ? [...msg.components] : [];

      if (!(msg?.components.length ?? 0) || this.options.getBoolean('new_row') || !components[components.length]?.components.push(button))
        components.push(new ActionRowBuilder({ components: [button] }));

      await (msg?.edit({ content, components }) ?? this.channel.send({ content, components }));

      delete button.data.custom_id;
      return this.editReply(custom ? lang('successJSON') : lang('success', codeBlock('json', JSON.stringify(button.data.filterEmpty()))));
    }
    catch (err) {
      if (!(err instanceof DiscordAPIError) && !err.message?.includes('JSON at')) throw err;
      return this.editReply(lang('invalidOption', codeBlock(err.message)));
    }
  }
};