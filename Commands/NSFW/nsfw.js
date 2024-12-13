const
  { randomInt } = require('node:crypto'),
  { EmbedBuilder } = require('discord.js'),
  fetch = import('node-fetch').then(e => e.default),
  { msInSecond } = require('#Utils').timeFormatter,
  secretChance = 1e4; // 1 in 10_000

module.exports = new MixedCommand({
  usage: { examples: 'hentai' },
  cooldowns: { user: msInSecond },
  ephemeralDefer: true,
  options: [new CommandOption({
    name: 'type',
    type: 'String',
    autocompleteOptions: [
      'hass', 'hmidriff', 'pgif', '4k', 'hentai', 'hneko', 'neko', 'hkitsune', 'anal', 'hanal',
      'gonewild', 'ass', 'pussy', 'thigh', 'hthigh', 'paizuri', 'tentacle', 'boobs', 'hboobs', 'yaoi'
    ],
    strictAutocomplete: true
  })],

  async run(lang) {
    /** @type {{success: boolean, color: number, message: string}} */
    const data = await (await fetch)(`https://nekobot.xyz/api/image?type=${(this.options?.getString('type') ?? this.args?.[0] ?? 'hentai').toLowerCase()}`).then(e => e.json());
    if (!data.success) {
      void this.customReply(lang('error'));
      return log.error('NSFW Command API Error: ', JSON.stringify(data));
    }

    const embed = new EmbedBuilder({ color: data.color, image: { url: data.message } });

    if (!randomInt(secretChance)) embed.data.title = lang('embedTitle');

    return this.customReply({ embeds: [embed] });
  }
});