const
  { Constants } = require('discord.js'),
  { msInSecond } = require('#Utils').timeFormatter,
  { setupMinigameChannel } = require('#Utils/combinedCommands');

module.exports = new MixedCommand({
  permissions: { user: ['ManageChannels'] },
  cooldowns: { channel: msInSecond },
  options: [new CommandOption({
    name: 'channel',
    type: 'Channel',
    channelTypes: Constants.GuildTextBasedChannelTypes
  })],

  run: setupMinigameChannel
});