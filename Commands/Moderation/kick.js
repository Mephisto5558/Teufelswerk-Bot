module.exports = new SlashCommand({
  permissions: { client: ['KickMembers'], user: ['KickMembers'] },
  options: [
    new CommandOption({
      name: 'reason',
      type: 'String',
      required: true
    }),
    new CommandOption({ name: 'target', type: 'User' })
  ],

  run: require('#Utils/combinedCommands').ban_kick_mute
});