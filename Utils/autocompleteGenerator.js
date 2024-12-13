const { autocompleteOptionsMaxAmt } = require('./constants');

/** @type {import('.').autocompleteGenerator} */
module.exports = function autocompleteGenerator(command, locale) {
  /** @param {string | number}v */
  const response = v => ({ name: this.client.i18n.__({ locale, undefinedNotFound: true },
    `commands.${command.category}.${command.name}.options.`
    + (this.options?._group ? this.options._group + '.' : '')
    + (this.options?._subcommand ? this.options._subcommand + '.' : '')
    + this.focused.name
    + `.choices.${v}`) ?? v,
  value: v });

  /** @type {CommandOption[]} */
  let [...options] = command.options;
  if (this.options?._group) ({ options } = options.find(e => e.name == this.options._group));
  if (this.options?._subcommand) ({ options } = options.find(e => e.name == this.options._subcommand));

  /** @type {{autocompleteOptions: Exclude<CommandOption['autocompleteOptions'], Function>}} Excludes<> because we call autocompleteOptions below if it is a function */
  let { autocompleteOptions } = options.find(e => e.name == this.focused.name) ?? {};
  if (typeof autocompleteOptions == 'function') autocompleteOptions = autocompleteOptions.call(this);

  if (typeof autocompleteOptions == 'string') return [response(autocompleteOptions)];
  if (Array.isArray(autocompleteOptions)) {
    return autocompleteOptions
      .filter(e => !this.focused.value || (typeof e == 'object' ? e.value.toLowerCase() : e.toLowerCase()).includes(this.focused.value.toLowerCase()))
      .slice(0, autocompleteOptionsMaxAmt).map(e => typeof e == 'object' ? e : response(e));
  }

  return [autocompleteOptions];
};