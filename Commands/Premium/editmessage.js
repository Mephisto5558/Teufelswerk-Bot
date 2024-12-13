const
  { ModalBuilder, ActionRowBuilder, TextInputBuilder, TextInputStyle, Constants, codeBlock, hyperlink } = require('discord.js'),
  { DiscordApiErrorCodes, constants: { messageMaxLength }, timeFormatter: { msInSecond, secsInMinute } } = require('#Utils'),
  MODALSUBMIT_TIMEOUT = msInSecond * secsInMinute / 2; // 30s

module.exports = new SlashCommand({
  permissions: { user: ['ManageMessages'] },
  cooldowns: { user: msInSecond * 5 }, /* eslint-disable-line @typescript-eslint/no-magic-numbers -- 5s */
  noDefer: true,
  options: [
    new CommandOption({
      name: 'channel',
      type: 'Channel',
      channelTypes: Constants.GuildTextBasedChannelTypes,
      required: true
    }),
    new CommandOption({
      name: 'message_id',
      type: 'String',
      required: true
    }),
    new CommandOption({ name: 'remove_attachments', type: 'Boolean' })
  ],

  async run(lang) {
    const
      modal = new ModalBuilder({
        title: lang('modalTitle'),
        customId: 'newContent_modal',
        components: [new ActionRowBuilder({
          components: [new TextInputBuilder({
            customId: 'newContent_text',
            label: lang('textInputLabel'),
            placeholder: lang('textInputPlaceholder'),
            style: TextInputStyle.Paragraph,
            required: true
          })]
        })]
      }),
      clear = this.options.getBoolean('remove_attachments');

    /** @type {Message?} */
    let msg, modalInteraction;
    try { msg = await this.options.getChannel('channel', true).messages.fetch(this.options.getString('message_id', true)); }
    catch (err) {
      if (err.code != DiscordApiErrorCodes.UnknownMessage) throw err;

      return this.reply({ content: lang('notFound'), ephemeral: true });
    }

    if (msg.author.id != this.client.user.id) return this.reply({ content: lang('notBotMessage'), ephemeral: true });
    if (!msg.editable) return this.reply({ content: lang('cannotEdit'), ephemeral: true });

    void this.showModal(modal);
    try { modalInteraction = await this.awaitModalSubmit({ filter: i => i.customId == 'newContent_modal', time: MODALSUBMIT_TIMEOUT }); }
    catch (err) { if (err.code != 'InteractionCollectorError') throw err; }

    if (!modalInteraction) return this.reply({ content: lang('global.menuTimedOut'), ephemeral: true });

    await modalInteraction.deferReply({ ephemeral: true });
    const content = modalInteraction.fields.getTextInputValue('newContent_text');

    /** @type {import('discord.js').APIEmbed & { content: string }} */
    let json = {};

    try {
      if (/^\s*[[{]/.test(content)) json = JSON.parse(content);
      else throw new SyntaxError('Invalid JSON format');

      if (!json.__count__) return modalInteraction.editReply(lang('emptyJson'));

      if (json.description !== undefined) json = { embeds: [json] };
      else if (json.every?.(e => e.description !== undefined)) json = { embeds: json };
      json.content.length = messageMaxLength;

      await msg.edit(clear ? { content: '', embeds: [], attachments: [], files: [], components: [], ...json } : json);
    }
    catch (err) {
      if (!(err instanceof SyntaxError)) return modalInteraction.editReply(lang('error', codeBlock(err.message)));
    }

    if (!json.__count__) await msg.edit(clear ? { content: content.slice(0, messageMaxLength + 1), embeds: [], attachments: [], files: [], components: [] } : content.slice(0, messageMaxLength));

    return modalInteraction.editReply(lang('success', hyperlink(lang('link'), msg.url)));
  }
});