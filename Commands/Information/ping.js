const { EmbedBuilder, Colors } = require('discord.js');

/** @type {command<'both', false>}*/
module.exports = {
  cooldowns: { channel: 1000 },
  slashCommand: true,
  prefixCommand: true,
  dmPermission: true,
  beta: true,
  options: [{ name: 'average', type: 'Boolean' }],

  run: async function (lang) {
    const
      average = this.options?.getBoolean('average') ?? this.args?.[0] == 'average',
      embed = new EmbedBuilder({
        title: lang('embedTitle'),
        description: lang(average ? 'average.loading' : 'global.loading', { current: 1, target: 20 }),
        color: Colors.Green
      }),
      startFirstMessagePing = performance.now(),
      msg = await this.customReply({ embeds: [embed] }),
      endFirstMessagePing = performance.now() - startFirstMessagePing;

    if (average) {
      const
        wsPings = [this.client.ws.ping],
        msgPings = [endFirstMessagePing];

      for (let i = 2; i <= 20; i++) {
        await sleep(3000);

        wsPings.push(this.client.ws.ping);

        const startMessagePing = performance.now();
        await msg.edit({ embeds: [embed.setDescription(lang('average.loading', { current: i, target: 20 }))] });
        msgPings.push(performance.now() - startMessagePing);
      }

      wsPings.sort((a, b) => a - b);
      msgPings.sort((a, b) => a - b);

      const averageWsPing = Math.round(wsPings.reduce((a, b) => a + b, 0) / 20 * 100) / 100;
      const averageMsgPing = Math.round(msgPings.reduce((a, b) => a + b, 0) / 20 * 100) / 100;

      embed.data.description = lang('average.embedDescription', {
        pings: wsPings.length, wsLowest: wsPings[0], wsHighest: wsPings.at(-1), wsAverage: averageWsPing,
        msgLowest: msgPings[0].toFixed(2), msgHighest: msgPings.at(-1).toFixed(2), msgAverage: averageMsgPing
      });
    }
    else {
      embed.data.fields = [
        { name: lang('api'), value: `\`${Math.round(this.client.ws.ping)}\`ms`, inline: true },
        { name: lang('bot'), value: `\`${Math.abs(Date.now() - this.createdTimestamp)}\`ms`, inline: true },
        { name: lang('messageSend'), value: `\`${Math.round(endFirstMessagePing)}\`ms`, inline: true }
      ];

      delete embed.data.description;
    }

    return msg.edit({ embeds: [embed] });
  }
};