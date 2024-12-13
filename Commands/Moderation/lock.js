const
  { Constants } = require('discord.js'),
  { msInSecond } = require('#Utils').timeFormatter;

module.exports = new MixedCommand({
  permissions: { client: ['ManageRoles'], user: ['ManageRoles'] },
  cooldowns: { user: msInSecond },
  options: [
    new CommandOption({ name: 'channel', type: 'Channel', channelTypes: Constants.GuildTextBasedChannelTypes }),
    new CommandOption({ name: 'reason', type: 'String' })
  ],

  run: require('#Utils/combinedCommands').lock_unlock
});