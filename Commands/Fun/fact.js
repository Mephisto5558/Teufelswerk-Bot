const
  { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, hyperlink } = require('discord.js'),
  fetch = import('node-fetch').then(e => e.default),
  { msInSecond } = require('#Utils').timeFormatter;

module.exports = new MixedCommand({
  usage: {
    usage: '["en" | "de"]',
    examples: 'fact en'
  },
  cooldowns: { channel: msInSecond / 10 },
  dmPermission: true,

  async run(lang) {
    const

      /** @type {{text: string, source: string, source_url: string}} */
      data = await (await fetch)(`https://uselessfacts.jsph.pl/api/v2/facts/random?language=${lang.__boundArgs__[0].locale}`).then(e => e.json()),
      embed = new EmbedBuilder({
        title: lang('embedTitle'),
        description: `${data.text}\n\nSource: ${hyperlink(data.source, data.source_url)}`,
        footer: { text: '- https://uselessfacts.jsph.pl' }
      }).setColor('Random'),
      component = new ActionRowBuilder({
        components: [new ButtonBuilder({
          label: lang('global.anotherone'),
          customId: 'fact',
          style: ButtonStyle.Primary
        })]
      });

    return this.customReply({ embeds: [embed], components: [component] });
  }
});