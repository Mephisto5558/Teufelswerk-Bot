const { EmbedBuilder, Colors } = require('discord.js');

module.exports = new MixedCommand({
  cooldowns: { channel: 1000 },
  dmPermission: true,
  beta: true,
  options: [new CommandOption({ name: 'average', type: 'Boolean' })],

  run: async function (lang) {
    const
      average = this.options?.getBoolean('average') ?? this.args?.[0] == 'average',
      embed = new EmbedBuilder({
        title: lang('embedTitle'),
        description: lang(
          average ? 'average.loading' : 'global.loading',
          { emoji: getEmoji('loading'), current: 1, target: 20, timestamp: Math.floor(Date.now() / 1000) + 4 }
        ), // 4 due to the moment it takes to update the embed
        color: Colors.Green
      }),
      startFirstMessagePing = performance.now(),
      msg = await this.customReply({ embeds: [embed] }),
      endFirstMessagePing = performance.now() - startFirstMessagePing;

    if (average) {
      const
        pingStart = performance.now(),
        msgPings = [endFirstMessagePing];

      let wsPings = [this.client.ws.ping];

      for (let i = 2; i <= 20; i++) {
        await sleep(3000);

        wsPings.push(this.client.ws.ping);

        const startMessagePing = performance.now();
        await msg.edit({ embeds: [embed.setDescription(lang('average.loading', { current: i, target: 20, timestamp: Math.floor(Date.now() / 1000) + 4 }))] });
        msgPings.push(performance.now() - startMessagePing);
      }

      const duration = Number.parseFloat(((performance.now() - pingStart) / 1000).toFixed(2));

      wsPings = wsPings.filter(e => e != -1);
      wsPings.sort((a, b) => a - b);
      msgPings.sort((a, b) => a - b);

      const averageWsPing = Math.round(wsPings.reduce((a, b) => a + b, 0) / 20 * 100) / 100;
      const averageMsgPing = Math.round(msgPings.reduce((a, b) => a + b, 0) / 20 * 100) / 100;

      embed.data.description = lang('average.embedDescription', {
        duration,
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
});