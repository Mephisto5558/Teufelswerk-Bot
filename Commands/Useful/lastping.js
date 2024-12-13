const
  { Constants, EmbedBuilder, Colors, hyperlink } = require('discord.js'),
  { getTargetChannel, getTargetMember, constants: { embedDescriptionMaxLength }, timeFormatter: { msInSecond } } = require('#Utils');

module.exports = new MixedCommand({
  /* eslint-disable-next-line @typescript-eslint/no-magic-numbers */
  cooldowns: { guild: 200, user: msInSecond * 10 },
  ephemeralDefer: true,
  options: [
    new CommandOption({
      name: 'channel',
      type: 'Channel',
      channelTypes: Constants.GuildTextBasedChannelTypes
    }),
    new CommandOption({ name: 'member', type: 'User' })
  ],

  async run(lang) {
    const
      target = getTargetMember(this, { targetOptionName: 'member' }),

      /** @type {import('discord.js').GuildTextBasedChannel | undefined} */
      channel = getTargetChannel(this);

    if (target) {
      if (!channel) return this.customReply(lang('memberRequiresChannel'));
      if (!channel.isTextBased()) return this.customReply(lang('invalidChannel'));
    }

    const { url, content, author, createdAt } = (channel
      ? channel.messages.cache.find(e => (!target || e.author.id == target.id) && e.mentions.everyone || e.mentions.users.has(this.user.id) || e.mentions.roles.hasAny(this.member.roles.cache.keys()))
      : this.guild.db.lastMentions?.[this.user.id]) ?? {};

    if (!url) return this.customReply(lang('noneFound'));

    const embed = new EmbedBuilder({
      title: lang('embedTitle'),
      description: lang('embedDescription', {
        author,
        link: hyperlink(lang('global.here'), url),
        content: content ? `>>> ${content.slice(0, embedDescriptionMaxLength)}` : lang('global.unknown')
      }),
      timestamp: createdAt,
      color: Colors.White
    });

    return this.customReply({ embeds: [embed] });
  }
});