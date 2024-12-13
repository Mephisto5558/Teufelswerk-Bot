const
  { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js'),
  fetch = import('node-fetch').then(e => e.default);

module.exports = new MixedCommand({
  dmPermission: true,

  async run(lang) {
    const
      embed = new EmbedBuilder({
        title: lang('embedTitle'),
        description: (await (await fetch)('https://api.adviceslip.com/advice').then(res => res.json())).slip.advice,
        footer: { text: '- https://api.adviceslip.com' }
      }).setColor('Random'),
      component = new ActionRowBuilder({
        components: [new ButtonBuilder({
          label: lang('global.anotherone'),
          customId: 'advice',
          style: ButtonStyle.Primary
        })]
      });

    return this.customReply({ embeds: [embed], components: [component] });
  }
});