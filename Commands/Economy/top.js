const
  { Command } = require('reconlx'),
  { EmbedBuilder, Colors } = require('discord.js');

module.exports = new Command({
  name: 'top',
  aliases: { prefix: ['t'], slash: [] },
  description: 'Displays the most powerful members.',
  usage: '',
  permissions: { client: [], user: [] },
  cooldowns: { guild: 0, user: 0 },
  category: 'Economy',
  slashCommand: true,
  prefixCommand: true,
  beta: true,

  run: async (message, lang, { db }) => {
    const description = Object.entries(db.get('guildSettings')[message.guild.id]?.economy || {})
      .sort(([, a], [, b]) => b.power - a.power)
      .slice(0, 10)
      .filter(([, e]) => e.currency)
      .map(([k, v], i) =>
        ([':first_place: ', ':second_place: ', ':third_place: '][i] || `${i}. `) + `<@${k}>\n` +
        lang('currency', v.currency) +
        lang('power', v.power)
      )
      .join('\n');

    const embed = new EmbedBuilder({
      title: lang('embedTitle'),
      color: Colors.White,
      footer: { text: message.user.tag },
      description: description ? lang('embedDescription') + description : lang('noneFound')
    });

    message.customreply({ embeds: [embed] });
  }
})