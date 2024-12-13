const
  { EmbedBuilder, Colors, PermissionFlagsBits, AllowedMentionsTypes, DiscordAPIError, codeBlock } = require('discord.js'),
  { logSayCommandUse, constants, timeFormatter: { msInSecond } } = require('#Utils');

/**
 * @param {Interaction}interaction
 * @param {string}name */
// 2nd const keyword because of intellisense
const getStringOption = (interaction, name) => interaction.options.getString(name)?.replaceAll('/n', '\n');

module.exports = new SlashCommand({
  permissions: { user: ['EmbedLinks'] },
  /* eslint-disable-next-line @typescript-eslint/no-magic-numbers */
  cooldowns: { user: 200 },
  dmPermission: true,
  ephemeralDefer: true,
  options: [
    new CommandOption({
      name: 'custom',
      type: 'Subcommand',
      options: [
        new CommandOption({
          name: 'description',
          type: 'String',
          required: true
        }),
        new CommandOption({
          name: 'content',
          type: 'String',
          maxLength: constants.messageMaxLength
        }),
        new CommandOption({ name: 'title', type: 'String' }),
        new CommandOption({
          name: 'predefined_color',
          type: 'String',
          autocompleteOptions: Object.entries(Colors).map(e => e[0]),
          strictAutocomplete: true
        }),
        new CommandOption({ name: 'custom_color', type: 'String' }),
        new CommandOption({ name: 'footer_text', type: 'String' }),
        new CommandOption({ name: 'footer_icon', type: 'String' }),
        new CommandOption({ name: 'image', type: 'String' }),
        new CommandOption({ name: 'thumbnail', type: 'String' }),
        new CommandOption({ name: 'timestamp', type: 'Boolean' }),
        new CommandOption({ name: 'author_name', type: 'String' }),
        new CommandOption({ name: 'author_url', type: 'String' }),
        new CommandOption({ name: 'author_icon', type: 'String' })
      ]
    }),
    new CommandOption({
      name: 'json',
      type: 'Subcommand',
      options: [new CommandOption({
        name: 'json',
        type: 'String',
        required: true
      })]
    })
  ],

  async run(lang) {
    const

      /** @type {(name: string) => string | undefined} */
      getOption = getStringOption.bind(undefined, this),
      custom = getOption('json'),
      allowedMentions = { parse: [AllowedMentionsTypes.User] };

    let embed, sentMessage;

    try {
      embed = new EmbedBuilder(custom
        ? JSON.parse(custom)
        : {
          title: getOption('title'),
          description: getOption('description', true),
          thumbnail: { url: getOption('thumbnail') },
          image: { url: getOption('image') },
          color: Number.parseInt(getOption('custom_color')?.slice(1) ?? 0, 16) || Colors[getOption('predefined_color')] || 0,
          footer: { text: getOption('footer_text'), iconURL: getOption('footer_icon') },
          timestamp: this.options.getBoolean('timestamp') && Math.round(Date.now() / msInSecond),
          author: {
            name: getOption('author_name'),
            url: getOption('author_url'),
            iconURL: getOption('author_icon')
          }
        });

      if (this.member.permissionsIn(this.channel).has(PermissionFlagsBits.MentionEveryone))
        allowedMentions.parse.push(AllowedMentionsTypes.Role, AllowedMentionsTypes.Everyone);


      sentMessage = await this.channel.send({ content: getOption('content'), embeds: [embed], allowedMentions });
    }
    catch (err) {
      if (!(err instanceof DiscordAPIError) && !err.message?.includes('JSON at')) throw err;
      return this.editReply(lang('invalidOption', codeBlock(err.message)));
    }

    await this.editReply(custom ? lang('successJSON') : lang('success', codeBlock('json', JSON.stringify(embed.data.filterEmpty()))));
    return logSayCommandUse.call(sentMessage, this.member, lang);
  }
});