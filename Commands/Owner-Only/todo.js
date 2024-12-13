const { hyperlink, channelLink } = require('discord.js');

module.exports = new PrefixCommand({
  dmPermission: true,

  async run(lang) {
    return this.reply(
      hyperlink(lang('list'), `<${this.client.config.website.domain}/todo>`)
      /* eslint-disable-next-line sonarjs/no-incorrect-string-concat -- is correct */
      + hyperlink(lang('website'), `<${this.client.config.website.domain}/vote>`)
      + hyperlink(lang('discordNotes'), `<${channelLink('1183014623507656745', '1011956895529041950')}>`)
    );
  }
});