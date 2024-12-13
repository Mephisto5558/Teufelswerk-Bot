const
  { EmbedBuilder, Colors, hyperlink } = require('discord.js'),

  /** @type {Client['config']} */
  { website: { domain } = {}, disableWebserver } = require(require('node:path').resolve(process.cwd(), 'config.json'));

module.exports = new MixedCommand({
  dmPermission: true,
  disabled: !!disableWebserver || !domain,
  disabledReason: disableWebserver ? 'The webserver is disabled.' : 'Missing domain url in config.json',

  async run(lang) {
    const embed = new EmbedBuilder({
      title: lang('embedTitle'),
      description: lang('embedDescriptionVote', hyperlink(lang('global.here'), `${this.client.config.website.domain}/vote`)),
      color: Colors.Blurple
    });

    return this.customReply({ embeds: [embed] });
  }
});