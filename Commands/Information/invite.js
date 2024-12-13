const
  { EmbedBuilder, Colors, hyperlink } = require('discord.js'),

  /** @type {Client['config']} */
  { website: { invite } = {}, disableWebserver } = require(require('node:path').resolve(process.cwd(), 'config.json'));

module.exports = new MixedCommand({
  dmPermission: true,
  disabled: !!disableWebserver || !invite,
  disabledReason: disableWebserver ? 'The webserver is disabled.' : 'Missing invite url in config.json',

  async run(lang) {
    const embed = new EmbedBuilder({
      title: lang('embedTitle'),
      description: lang('embedDescription', hyperlink(lang('global.here'), this.client.config.website.invite)),
      color: Colors.Blue
    });

    return this.customReply({ embeds: [embed] });
  }
});