/* eslint camelcase: [error, {allow: [help_]}] */
const { help_commandQuery, help_categoryQuery, help_allQuery, help_getCommands, help_getCommandCategories } = require('#Utils/componentHandler');

module.exports = new MixedCommand({
  usage: { examples: 'fun joke\n{prefix}{cmdName} fun' },
  dmPermission: true,
  ephemeralDefer: true,
  beta: true,
  options: [
    new CommandOption({
      name: 'category',
      type: 'String',
      autocompleteOptions() {
        return help_getCommandCategories.call(this).map(e => ({ name: this.client.i18n.__({ locale: this.locale }, `commands.${e}.categoryName`), value: e }));
      },
      strictAutocomplete: true
    }),
    new CommandOption({
      name: 'command',
      type: 'String',
      autocompleteOptions() { return help_getCommands.call(this).map(e => e.name); },
      strictAutocomplete: true
    })
  ],

  run(lang) {
    const
      categoryQuery = (this.options?.getString('category') ?? this.args?.at(module.exports.options.findIndex(e => e.name == 'category')))?.toLowerCase(),
      commandQuery = (this.options?.getString('command') ?? this.args?.at(module.exports.options.findIndex(e => e.name == 'command')))?.toLowerCase();

    if (commandQuery) return help_commandQuery.call(this, lang, commandQuery);
    if (categoryQuery) return help_categoryQuery.call(this, lang, categoryQuery);
    return help_allQuery.call(this, lang);
  }
});