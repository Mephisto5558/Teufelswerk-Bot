const { timeValidator, timeFormatter: { msInSecond } } = require('#Utils');

module.exports = new SlashCommand({
  aliases: { prefix: ['timeout'], slash: ['timeout'] },
  permissions: { client: ['MuteMembers'], user: ['MuteMembers'] },
  cooldowns: { user: msInSecond / 10 },
  options: [
    new CommandOption({
      name: 'target',
      type: 'User',
      required: true
    }),
    new CommandOption({
      name: 'reason',
      type: 'String',
      required: true
    }),
    new CommandOption({
      name: 'duration',
      type: 'String',
      required: true,
      autocompleteOptions() { return timeValidator(this.focused.value); },
      strictAutocomplete: true
    })
  ],

  run: require('#Utils/combinedCommands').ban_kick_mute
});