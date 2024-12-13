const
  { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle, ALLOWED_SIZES, bold } = require('discord.js'),
  { getTargetMember, timeFormatter: { msInSecond } } = require('#Utils');

module.exports = new MixedCommand({
  cooldowns: { user: msInSecond },
  dmPermission: true,
  options: [
    new CommandOption({ name: 'target', type: 'User' }),
    new CommandOption({
      name: 'size',
      type: 'Integer',
      choices: ALLOWED_SIZES
    })
  ],

  async run(lang) {
    const
      target = getTargetMember(this, { returnSelf: true }),
      /* eslint-disable-next-line @typescript-eslint/no-magic-numbers -- 2nd largest resolution */
      avatarURL = target.displayAvatarURL({ size: this.options?.getInteger('size') ?? this.args?.at(-1) ?? ALLOWED_SIZES.at(-2) }),
      embed = new EmbedBuilder({
        description: bold(lang('embedDescription', target.user?.username ?? target.username)),
        color: Colors.White,
        image: { url: avatarURL },
        footer: { text: this.user.username }
      }),
      component = new ActionRowBuilder({
        components: [new ButtonBuilder({
          label: lang('global.downloadButton'),
          url: avatarURL,
          style: ButtonStyle.Link
        })]
      });

    return this.customReply({ embeds: [embed], components: [component] });
  }
});