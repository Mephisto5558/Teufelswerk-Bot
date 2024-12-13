const
  { EmbedBuilder, Colors, hyperlink } = require('discord.js'),
  { timeFormatter, msInSecond } = require('#Utils').timeFormatter;

module.exports = new MixedCommand({
  cooldowns: { channel: msInSecond / 10 },
  dmPermission: true,

  async run(lang) {
    const embed = new EmbedBuilder({
      description: lang(
        this.client.config.website.domain && !this.client.config.disableWebserver ? 'embedDescription' : 'embedDescriptionNoURL',
        { time: timeFormatter({ sec: process.uptime(), lang }).formatted, link: hyperlink(lang('online'), `${this.client.config.website.domain}/uptime`) }
      ),
      color: Colors.White
    });

    return this.customReply({ embeds: [embed] });
  }
});