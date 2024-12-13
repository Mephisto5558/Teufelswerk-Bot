const
  { codeBlock } = require('discord.js'),
  { msInSecond } = require('#Utils').timeFormatter,
  DEFAULT_CHARSET = [...String.raw`abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!?§$%&/\=*'"#*(){}[]`],
  DEFAULT_PASSWORD_LENGTH = 12,
  MAX_PASSWORD_LENGTH = 1750,
  MAX_PASSWORDS = 500,
  MAX_MESSAGE_LENGTH = 1740,
  MAX_DISPLAYED_CHARSET_LEN = 100,
  suffix = '...';

/**
 * Helper function to prevent `eslint/no-loop-func`
 *
 * Filters the last selected entry out and selects a list entry based on a secure random number generator (RNG). RNG defined in Utils/prototypeRegisterer.js.
 * @param {string[]}charset
 * @param {string?}lastRandomChar */
const getRandomChar = (charset, lastRandomChar) => charset.filter(e => e !== lastRandomChar).random();

module.exports = new SlashCommand({
  cooldowns: { user: msInSecond },
  dmPermission: true,
  ephemeralDefer: true,
  options: [
    new CommandOption({
      name: 'length',
      type: 'Integer',
      maxValue: MAX_PASSWORD_LENGTH
    }),
    new CommandOption({
      name: 'count',
      type: 'Integer',
      maxValue: MAX_PASSWORDS
    }),
    new CommandOption({ name: 'exclude_chars', type: 'String' }),
    new CommandOption({ name: 'include_chars', type: 'String' })
  ],

  async run(lang) {
    const
      count = this.options.getInteger('count') ?? 1,
      exclude = this.options.getString('exclude_chars') ?? '',
      include = this.options.getString('include_chars') ?? '',
      length = this.options.getInteger('length') ?? DEFAULT_PASSWORD_LENGTH,
      /** @type {`\`\`\`${string}\`\`\``[]}*/passwordList = []; /* eslint-disable-line jsdoc/valid-types -- false positive */

    let charset = [...DEFAULT_CHARSET.filter(char => !exclude.includes(char)), ...include] // Remove exclude chars and add include chars to the charset
      .unique().join(''); // Remove duplicates and join to a string.

    if (!charset.length) return this.editReply(lang('charsetEmpty')); // Return if charset is empty

    // Loop over the amount of passswords to be generated, break early if the length of all passwords combined is greater than `MAX_MESSAGE_LENGTH`
    for (let i = 0; i < count && passwordList.join('\n').length < MAX_MESSAGE_LENGTH; i++) {
      let
        lastRandomChar,
        password = '';

      for (let i = 0; i < length; i++) {
        // Get the random char and escape it so they it doesn't break formatting
        const randomChar = String.raw({ raw: getRandomChar(charset, lastRandomChar) });

        // Adds one of the chars in the charset to the password
        password += lastRandomChar + randomChar;
        lastRandomChar = randomChar; // Sets lastRandomChar to the last generated char
      }

      // Add the password to the password list after wrapping it in a code block
      passwordList.push(codeBlock(password).replaceAll('\n', ''));
    }

    // Limits the *displayed* charset length
    if (charset.length > MAX_DISPLAYED_CHARSET_LEN) charset = charset.slice(0, MAX_DISPLAYED_CHARSET_LEN - suffix.length) + suffix;

    return this.editReply(lang('success', { passwords: passwordList.join('\n'), charset: codeBlock(charset) }));
  }
});