const
  { EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection } = require('discord.js'),
  fetch = import('node-fetch').then(e => e.default),
  { HTTP_STATUS_NOT_FOUND } = require('node:http2').constants,
  INCHES_IN_FEET = 12,
  CENTIMETERS_IN_METER = 100,
  CENTIMETERS_IN_INCH = 2.54,
  KILOGRAMS_IN_POUND = 2.205,

  /** @type {Collection<string, { height: string, name: string, types: string[], abilities: Record<string, string>, gender?: string[], family: Record<string, string> }>} */
  cache = new Collection();

module.exports = new MixedCommand({
  usage: { examples: 'Bulbasaur' },
  dmPermission: true,
  options: [new CommandOption({
    name: 'pokémon',
    type: 'String',
    required: true
  })],

  async run(lang) {
    const
      pokemon = this.options?.getString('pokémon', true) ?? this.args[0],
      msg = await this.customReply(lang('global.loading', getEmoji('loading')));

    let res = cache.get(pokemon.toLowerCase());
    if (!res) {
      try { res = (await (await fetch)(`https://pokeapi.glitch.me/v1/pokemon/${pokemon}`).then(e => e.json()))?.[0]; }
      catch (err) {
        if (err.type != 'invalid-json') throw err;
        return msg.edit(lang('invalidJson'));
      }

      if (res) {
        const
          [feet, inches] = res.height.split('\'').map(e => Number.parseFloat(e)),
          height = (feet * INCHES_IN_FEET + (inches || 0)) * CENTIMETERS_IN_INCH;

        res.height = height < CENTIMETERS_IN_METER ? `${height}cm` : `${Number.parseFloat((height / CENTIMETERS_IN_METER).toFixed(2))}m`;

        if (res.name) cache.set(res.name.toLowerCase(), res);
      }
    }

    if (!res || res.error == HTTP_STATUS_NOT_FOUND) return msg.edit(lang('notFound'));
    if (res.error) {
      log.error('pokedex.js: The api returned an error!', res);
      return msg.edit(lang('error'));
    }

    const
      name = res.name.toLowerCase(),
      embed = new EmbedBuilder({
        thumbnail: { url: `https://play.pokemonshowdown.com/sprites/ani/${name}.gif` },
        color: Colors.Blurple,
        footer: { text: res.description },
        author: {
          name: `PokéDex: ${res.name}`,
          iconURL: `https://play.pokemonshowdown.com/sprites/ani/${name}.gif`
        },
        fields: [
          { name: lang('types'), value: res.types.join(', '), inline: false },
          { name: lang('abilities'), value: `${res.abilities.normal}${res.abilities.hidden ? ' and ' + res.abilities.hidden : ''}.`, inline: false },
          { name: lang('genderRatio'), value: res.gender?.join(', ') ?? lang('noGender'), inline: false },
          { name: lang('heightWeight'), value: `${res.height}, ${(Number.parseFloat(res.weight) / KILOGRAMS_IN_POUND).toFixed(2)}kg`, inline: false },
          { name: lang('evolutionLine'), value: res.family.evolutionLine.join(', ') + lang('currentStage', res.family.evolutionStage), inline: false },
          { name: lang('gen'), value: res.gen, inline: false }
        ]
      }),
      component = new ActionRowBuilder({
        components: [
          new ButtonBuilder({
            label: 'Bulbapedia',
            style: ButtonStyle.Link,
            url: `https://bulbapedia.bulbagarden.net/wiki/${res.name}`
          }),
          new ButtonBuilder({
            label: 'Serebii',
            style: ButtonStyle.Link,
            url: `https://www.serebii.net/pokedex-swsh/${name}`
          }),
          new ButtonBuilder({
            label: 'Smogon',
            style: ButtonStyle.Link,
            url: `https://www.smogon.com/dex/ss/pokemon/${name}`
          })
        ]
      });

    return msg.edit({ content: '', embeds: [embed], components: [component] });
  }
});