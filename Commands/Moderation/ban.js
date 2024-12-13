const { maxBanMessageDeleteDays } = require('#Utils').constants;

module.exports = new SlashCommand({
  permissions: { client: ['BanMembers'], user: ['BanMembers'] },
  options: [
    new CommandOption({
      name: 'reason',
      type: 'String',
      required: true
    }),
    new CommandOption({
      name: 'delete_days_of_messages',
      type: 'Number',
      minValue: 1,
      maxValue: maxBanMessageDeleteDays
    }),
    new CommandOption({ name: 'target', type: 'User' })
  ],

  run: require('#Utils/combinedCommands').ban_kick_mute
});