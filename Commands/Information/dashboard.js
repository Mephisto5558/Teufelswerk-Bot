const
  { EmbedBuilder, Colors, hyperlink } = require('discord.js'),

  /** @type {Client['config']} */
  { website: { dashboard } = {}, disableWebserver } = require(require('node:path').resolve(process.cwd(), 'config.json'));

module.exports = new MixedCommand({
  dmPermission: true,
  disabled: !!disableWebserver || !dashboard,
  disabledReason: disableWebserver ? 'The webserver is disabled.' : 'Missing dashboard url in config.json',

  async run(lang) {
    const embed = new EmbedBuilder({
      title: lang('embedTitle'),
      description: lang('embedDescriptionDashboard', hyperlink(lang('globals.here', this.client.config.website.dashboard))),
      color: Colors.Blurple
    });

    return this.customReply({ embeds: [embed] });
  }
});