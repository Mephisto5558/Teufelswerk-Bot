const
  { ActionRowBuilder, ButtonBuilder, ButtonStyle, DiscordAPIError, codeBlock } = require('discord.js'),
  { DiscordApiErrorCodes, constants: { buttonLabelMaxLength, buttonURLMaxLength, messageActionrowMaxAmt, actionRowMaxButtonAmt }, timeFormatter: { msInSecond } } = require('#Utils');

module.exports = new SlashCommand({
  cooldowns: { user: msInSecond / 2 },
  ephemeralDefer: true,
  options: [
    new CommandOption({
      name: 'json',
      type: 'Subcommand',
      options: [new CommandOption({ name: 'json', type: 'String' })]
    }),
    new CommandOption({
      name: 'custom',
      type: 'Subcommand',
      options: [
        new CommandOption({
          name: 'style',
          type: 'String',
          choices: Object.keys(ButtonStyle).filter(Number).map(String),
          required: true
        }),
        new CommandOption({ name: 'emoji', type: 'String' }),
        new CommandOption({
          name: 'label',
          type: 'String',
          maxLength: buttonLabelMaxLength
        }),
        new CommandOption({
          name: 'url',
          type: 'String',
          maxLength: buttonURLMaxLength
        }),
        new CommandOption({ name: 'new_row', type: 'Boolean' }),
        new CommandOption({ name: 'content', type: 'String' }),
        new CommandOption({ name: 'message_id', type: 'String' })
      ]
    })
  ],

  async run(lang) {
    const
      custom = this.options.getString('json'),
      content = this.options.getString('content') ?? undefined,
      isLink = this.options.getString('style', true) == ButtonStyle.Link,
      emoji = this.options.getString('emoji'),

      /** @type {`${bigint}` | null}*//* eslint-disable-line jsdoc/valid-types -- false positive */
      msgId = this.options.getString('message_id');

    let
      url = this.options.getString('url'),
      label = this.options.getString('label');

    if (!label && !emoji) label = '\u200E'; // U+200E (LEFT-TO-RIGHT MARK) is used as invisible text

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
          label, emoji, url
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
});