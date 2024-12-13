const
  { channelLink, bold } = require('discord.js'),
  { getTargetChannel } = require('#Utils');

module.exports = new PrefixCommand({
  aliases: { prefix: ['setcountingnum'] },

  async run(lang) {
    const
      channel = getTargetChannel(this, { returnSelf: true }).id,
      number = Number.parseInt(this.args[0] ?? 0);

    if (Number.isNaN(number)) return this.reply(lang('invalidNumber'));

    await this.guild.updateDB(`channelMinigames.counting.${channel}`, { lastNumber: number, lastAuthor: 'setcountingnumber' });
    return this.reply(lang('success', { channel: channelLink(channel), number: bold(number) }));
  }
});