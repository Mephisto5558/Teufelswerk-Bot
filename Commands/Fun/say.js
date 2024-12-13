const
  { Constants, PermissionFlagsBits, Message, AllowedMentionsTypes } = require('discord.js'),
  { getTargetChannel, logSayCommandUse, constants } = require('#Utils');

module.exports = new MixedCommand({
  /* eslint-disable-next-line @typescript-eslint/no-magic-numbers */
  cooldowns: { user: 200 },
  ephemeralDefer: true,
  options: [
    new CommandOption({
      name: 'msg',
      type: 'String',
      maxLength: constants.messageMaxLength,
      required: true
    }),
    new CommandOption({
      name: 'channel',
      type: 'Channel',
      channelTypes: Constants.GuildTextBasedChannelTypes
    }),
    new CommandOption({
      name: 'reply_to', type: 'String',
      minLength: constants.snowflakeMinLength,
      maxLength: constants.snowflakeMaxLength
    })
  ],

  async run(lang) {
    const

      /** @type {string} */
      msg = this.options?.getString('msg', true) ?? this.content,
      allowedMentions = { parse: [AllowedMentionsTypes.User] },

      /** @type {import('discord.js').GuildTextBasedChannel} */
      channel = getTargetChannel(this, { returnSelf: true }),
      replyTo = this.options?.getString('reply_to');

    if (!this.member.permissionsIn(channel).has([PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages])) return this.customReply(lang('noPerm'));

    if (this.member.permissionsIn(channel).has(PermissionFlagsBits.MentionEveryone))
      allowedMentions.parse.push(AllowedMentionsTypes.Role, AllowedMentionsTypes.Everyone);

    const sentMessage = await channel.send({ allowedMentions, content: msg.replaceAll('/n', '\n'), reply: { messageReference: replyTo, failIfNotExists: false } });
    await (this instanceof Message ? this.react('👍') : this.customReply(lang('global.messageSent')));

    return logSayCommandUse.call(sentMessage, this.member, lang);
  }
});