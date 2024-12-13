const
  { inlineCode } = require('discord.js'),
  { msInSecond } = require('#Utils').timeFormatter;

module.exports = new MixedCommand({
  cooldowns: { user: msInSecond },
  beta: true,

  async run(lang) {
    const
      prefixesKey = this.client.botType == 'dev' ? 'betaBotPrefixes' : 'prefixes',
      currentPrefixes = (this.guild.db.config[prefixesKey] ?? this.client.defaultSettings.config[prefixesKey]).map(e => `${inlineCode(e.prefix)} ${e.caseinsensitive ? lang('caseInsensitive') : ''}`);

    return this.customReply(lang('currentPrefixes', currentPrefixes.join('\n')));
  }
});