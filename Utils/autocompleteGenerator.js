/**
 * @this {import('discord.js').AutocompleteInteraction}
 * @param {command<*, boolean, true>}command
 * @param {string}locale*/
module.exports = function autocompleteGenerator(command, locale) {
  /** @param {string|number}v*/
  const response = v => ({ name: this.client.i18n.__({ locale, undefinedNotFound: true },
    `commands.${command.category.toLowerCase()}.${command.name}.options.`
    + (this.options?._group ? this.options._group + '.' : '')
    + (this.options?._subcommand ? this.options._subcommand + '.' : '')
    + this.focused.name
    + `.choices.${v}`) ?? v,
  value: v });

  /** @type {command<'both', boolean, true>}*/
  let { options } = command.fMerge();
  if (this.options?._group) options = options.find(e => e.name == this.options._group);
  /* eslint-disable-next-line prefer-destructuring */
  if (this.options?._subcommand) options = options.find(e => e.name == this.options._subcommand).options;

  /** @type {{autocompleteOptions: Exclude<commandOptions['autocompleteOptions'], Function>}} Excludes<> because we call autocompleteOptions below if it is a function*/
  let { autocompleteOptions } = options.find(e => e.name == this.focused.name);
  if (typeof autocompleteOptions == 'function') autocompleteOptions = autocompleteOptions.call(this);

  if (typeof autocompleteOptions == 'string') return [response(autocompleteOptions)];
  if (Array.isArray(autocompleteOptions)) {
    return autocompleteOptions
      .filter(e => !this.focused.value || (typeof e == 'object' ? e.value.toLowerCase() : e.toLowerCase()).includes(this.focused.value.toLowerCase()))
      .slice(0, 25).map(e => typeof e == 'object' ? e : response(e));
  }

  return [autocompleteOptions];
};