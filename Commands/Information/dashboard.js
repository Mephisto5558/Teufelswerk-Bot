const
  { EmbedBuilder, Colors } = require('discord.js'),
  { Dashboard } = require('../../config.json')?.Website ?? {};

/** @type {command<'both', false>}*/
module.exports = {
  name: 'dashboard',
  slashCommand: true,
  prefixCommand: true,
  dmPermission: true,
  disabled: !Dashboard,
  disabledReason: 'Missing dashboard url in config.json',

  run: function (lang) {
    const embed = new EmbedBuilder({
      title: lang('embedTitle'),
      description: lang('embedDescriptionDashboard', Dashboard),
      color: Colors.Blurple
    });

    return this.customReply({ embeds: [embed] });
  }
};