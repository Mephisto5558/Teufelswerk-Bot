const
  { EmbedBuilder, Colors, PermissionFlagsBits } = require('discord.js'),
  { getMilliseconds } = require('better-ms');

module.exports = {
  name: 'mute',
  aliases: { prefix: ['timeout'], slash: ['timeout'] },
  permissions: { client: ['MuteMembers'], user: ['MuteMembers'] },
  cooldowns: { guild: 0, user: 100 },
  category: 'Moderation',
  slashCommand: true,
  prefixCommand: false,
  options: [
    {
      name: 'target',
      type: 'User',
      required: true,
    },
    {
      name: 'reason',
      type: 'String',
      required: true
    },
    {
      name: 'duration',
      type: 'String',
      required: true
    }
  ],

  run: async function (lang) {
    const
      target = this.options.getMember('target'),
      reason = this.options.getString('reason'),
      duration = getMilliseconds(this.options.getString('duration'))?.limit({ min: 3600000, max: 2419000000 }),
      date = new Date();

    let errorMsg, noMsg;

    if (!target) errorMsg = lang('notFound');
    else if (target.id === this.member.id) errorMsg = lang('cantMuteSelf');
    else if (target.roles.highest.comparePositionTo(this.member.roles.highest) > -1 && this.guild.ownerId != this.user.id)
      errorMsg = lang('noPerm', lang('global.you'));
    else if (target.permissions.has(PermissionFlagsBits.Administrator)) errorMsg = lang('targetIsAdmin');
    else if (!target.moderatable) errorMsg = lang('noPerm', lang('global.i'));
    else if (typeof duration == 'string') errorMsg = lang('invalidDuration');

    if (errorMsg) return this.editReply(errorMsg);

    date.setTime(date.getTime() + duration);

    try { await target.disableCommunicationUntil(date.getTime(), `${reason}, moderator ${this.user.tag}`) }
    catch (err) { return this.editReply(lang('error', err)) }

    const embed = new EmbedBuilder({
      title: lang('dmEmbedTitle'),
      description: lang('dmEmbedDescription', {
        guild: this.guild.name, mod: this.user.tag, reason,
        time: Math.round(target.communicationDisabledUntilTimestamp / 1000)
      }),
      color: Colors.Red
    });

    try { await target.send({ embeds: [embed] }) }
    catch { noMsg = true }

    embed.data.title = lang('infoEmbedTitle');
    embed.data.description = lang('infoEmbedDescription', { user: target.user.tag, reason, time: Math.round(target.communicationDisabledUntilTimestamp / 1000) });
    if (noMsg) embed.data.description += lang('noDM');

    this.editReply({ embeds: [embed] });
  }
}