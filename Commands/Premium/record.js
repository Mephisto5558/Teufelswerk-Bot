const
  { Constants, ButtonBuilder, EmbedBuilder, ButtonStyle, ActionRowBuilder, Colors, userMention, channelMention, bold } = require('discord.js'),
  { access, mkdir } = require('node:fs/promises'),
  { msInSecond } = require('#Utils').timeFormatter;

// due to VoiceRecords being in .gitignore, we need this check
access('./VoiceRecords/raw').catch(() => mkdir('./VoiceRecords/raw', { recursive: true }));

module.exports = new SlashCommand({
  cooldowns: { user: msInSecond * 10 },
  options: [
    new CommandOption({ name: 'target', type: 'User' }),
    new CommandOption({
      name: 'channel',
      type: 'Channel',
      channelTypes: Constants.VoiceBasedChannelTypes
    }),
    new CommandOption({ name: 'public', type: 'Boolean' })
  ],

  async run(lang) {
    const
      isPublic = !!this.options.getBoolean('public'),

      /** @type {import('discord.js').VoiceBasedChannel?} */
      voiceChannel = this.options.getChannel('channel') ?? this.options.getMember('target')?.voice.channel ?? this.member.voice.channel,
      target = voiceChannel?.members.get(this.options.getMember('target')?.id),
      targets = (target ? [target] : [...voiceChannel?.members.values() ?? []]).filter(e => e.voice.channel && !e.user.bot);

    if (!voiceChannel) return this.editReply(lang('needVoiceChannel'));
    if (!voiceChannel.joinable) return this.editReply(lang('cannotJoin'));
    if (!targets.length) return this.editReply(lang('noTarget'));

    void this.deleteReply();

    const
      embed = new EmbedBuilder({
        title: lang('embedTitle'),
        description: lang('embedDescription', { user: userMention(this.user.id), channel: channelMention(voiceChannel.id), publicOrPrivate: bold(lang(isPublic ? 'isPublic' : 'isPrivate')) }),
        footer: { text: this.user.username, iconURL: this.member.displayAvatarURL({ forceStatic: true }) },
        color: Colors.Red
      }),
      components = [
        new ActionRowBuilder({
          components: [
            new ButtonBuilder({
              customId: `record.memberAllow.${this.user.id}.${voiceChannel.id}.${isPublic}`,
              label: lang('allow'),
              style: ButtonStyle.Success
            }),
            new ButtonBuilder({
              customId: `record.memberDeny.${this.user.id}.${voiceChannel.id}.${isPublic}`,
              label: lang('deny'),
              style: ButtonStyle.Danger
            })
          ]
        }),
        new ActionRowBuilder({
          components: [new ButtonBuilder({
            customId: `record.cancel.${this.user.id}.${voiceChannel.id}`,
            label: lang('global.cancel'),
            style: ButtonStyle.Danger
          })]
        })
      ];

    return this.channel.send({
      content: targets.join(', '),
      embeds: [embed],
      components
    });
  }
});