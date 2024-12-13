const
  { EmbedBuilder, Colors, inlineCode } = require('discord.js'),
  { getHashes, createHash } = require('node:crypto'),
  { constants: { embedDescriptionMaxLength }, timeFormatter: { msInSecond } } = require('#Utils');

module.exports = new SlashCommand({
  cooldowns: { user: msInSecond },
  dmPermission: true,
  ephemeralDefer: true,
  options: [
    new CommandOption({
      name: 'input',
      type: 'String',
      required: true
    }),
    new CommandOption({
      name: 'method',
      type: 'String',
      autocompleteOptions: getHashes(),
      strictAutocomplete: true,
      required: true
    })
  ],

  async run(lang) {
    const
      input = this.options.getString('input', true),
      method = this.options.getString('method', true),
      embed = new EmbedBuilder({
        title: lang('embedTitle'),
        description: lang('embedDescription', {
          input: inlineCode(input.length > embedDescriptionMaxLength ? `${input.slice(0, embedDescriptionMaxLength)}\n...` : input),
          method: inlineCode(method)
        }),
        color: Colors.DarkGold
      });

    return this.editReply({ content: lang('text', inlineCode(createHash(method).update(input).digest('hex'))), embeds: [embed] });
  }
});