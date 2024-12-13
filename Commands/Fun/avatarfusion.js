const
  { EmbedBuilder, Colors, ImageFormat, ALLOWED_SIZES } = require('discord.js'),
  { Canvas, loadImage } = require('skia-canvas'),
  { getTargetMember, timeFormatter: { msInSecond } } = require('#Utils'),
  IMAGE_SIZE = ALLOWED_SIZES[5]; /* eslint-disable-line @typescript-eslint/no-magic-numbers */

module.exports = new MixedCommand({
  cooldowns: { user: msInSecond * 2 },
  options: [
    new CommandOption({
      name: 'base',
      type: 'User',
      required: true
    }),
    new CommandOption({ name: 'overlay', type: 'User' }),
    new CommandOption({
      name: 'avatar_type',
      type: 'String',
      choices: ['server', 'global']
    })
  ],

  async run(lang) {
    const
      type = (this.options?.getString('avatar_type') ?? 'server') == 'server',
      base = getTargetMember(this, { targetOptionName: 'base' }),
      overlay = this.options?.getMember('overlay') ?? this.mentions?.members.at(1) ?? this.member;

    if (!base || base.id == overlay.id) return this.customReply(lang('missingParam'));

    const embed = new EmbedBuilder({
      title: lang('embedTitle', { user1: base.displayName, user2: overlay.displayName }),
      color: Colors.White,
      footer: { text: this.user.tag }
    });

    if (base.id == overlay.id) {
      embed.data.image = { url: type == 'server' ? base.displayAvatarURL({ forceStatic: true, size: IMAGE_SIZE }) : base.user.avatarURL({ forceStatic: true, size: IMAGE_SIZE }) };
      return this.customReply({ embeds: [embed] });
    }

    const
      msg = await this.customReply({ embeds: [embed.setDescription(lang('global.loading', getEmoji('loading')))] }),
      baseAvatar = await loadImage((type == 'server' ? base : base.user).displayAvatarURL({ extension: ImageFormat.PNG, size: IMAGE_SIZE })),
      overlayAvatar = await loadImage(overlay.displayAvatarURL({ extension: ImageFormat.PNG, size: IMAGE_SIZE })),
      canvas = new Canvas(baseAvatar.width, baseAvatar.height),
      ctx = canvas.getContext('2d');

    ctx.globalAlpha = 0.5; /* eslint-disable-line @typescript-eslint/no-magic-numbers */
    ctx.drawImage(baseAvatar, 0, 0);
    ctx.drawImage(overlayAvatar, 0, 0, baseAvatar.width, baseAvatar.height);

    delete embed.data.description;
    embed.data.image = { url: 'attachment://avatarfusion.png' };

    return msg.edit({ embeds: [embed], files: [{ attachment: await canvas.toBuffer(), name: 'avatarfusion.png' }] });
  }
});