const
  { PermissionFlagsBits, OverwriteType, EmbedBuilder, Colors } = require('discord.js'),
  getTargetChannel = require('../getTargetChannel.js');

/** @type {import('.').lock_unlock} */
/* eslint-disable-next-line camelcase -- This casing is used to better display the commandNames. */
module.exports = async function lock_unlock(lang) {
  this.args?.shift();

  const
    msg = await this.customReply(lang('global.loading', getEmoji('loading'))),

    /** @type {import('discord.js').BaseGuildTextChannel} */
    channel = getTargetChannel(this, { returnSelf: true }),
    reason = this.options?.getString('reason') ?? this.args?.join(' ') ?? lang('noReason'),
    embed = new EmbedBuilder({
      title: lang('embedTitle'),
      description: lang('embedDescription', { mod: this.user.username, reason }),
      color: Colors.Red
    }),
    roles = await this.guild.roles.fetch(),
    members = await this.guild.members.fetch();

  /** @type {NonNullable<import('../../types/database').Database['guildSettings'][Snowflake]>['lockedChannels']} */
  let overwrites;

  if (this.commandName == 'lock') {
    overwrites = channel.permissionOverwrites.cache.reduce((acc, e) => {
      if (
        e.allow.has(PermissionFlagsBits.SendMessages) && !e.allow.has(PermissionFlagsBits.Administrator)
        && (e.type == OverwriteType.Role && roles.get(e.id)?.editable || members.get(e.id).manageable)
      ) acc[e.id] = e.type;

      return acc;
    }, {});

    if (
      this.guild.roles.everyone.editable
      && channel.permissionsFor(this.guild.roles.everyone.id).has(PermissionFlagsBits.SendMessages)
    ) overwrites[this.guild.roles.everyone.id] = OverwriteType.Role;

    if (overwrites.__count__) await this.guild.updateDB(`lockedChannels.${channel.id}`, overwrites);
  }
  else {
    overwrites = Object.entries(this.guild.db.lockedChannels?.[channel.id] ?? {}).filter(([k, v]) => {
      if (channel.permissionOverwrites.cache.get(k)?.allow.has(PermissionFlagsBits.SendMessages)) return false;
      if (v == OverwriteType.Role) return roles.get(k).position - this.guild.members.me.roles.highest.position < 0;
      return members.get(k).manageable;
    });

    if (!overwrites.length) return msg.edit(lang('notLocked'));

    await this.client.db.delete('guildSettings', `${this.guild.id}.lockedChannels.${channel.id}`);
  }

  await channel.send({ embeds: [embed] });
  for (const [id, type] of Array.isArray(overwrites) ? overwrites : Object.entries(overwrites)) {
    await channel.permissionOverwrites.edit(id,
      { [PermissionFlagsBits.SendMessages]: this.commandName == 'lock' },
      { type, reason: lang('global.modReason', { command: this.commandName, user: this.user.username }) });
  }

  return msg.edit(lang('success'));
};