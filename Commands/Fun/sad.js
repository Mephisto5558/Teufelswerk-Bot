const responseList = ['D:', ':c', 'qwq', ':C', 'q_q', ':/'];

module.exports = {
  name: 'sad',
  aliases: { prefix: [], slash: [] },
  permissions: { client: [], user: [] },
  cooldowns: { guild: 0, user: 0 },
  category: 'Fun',
  slashCommand: false,
  prefixCommand: true,
  dmPermission: true,

  run: function () { this.customReply(responseList.random()); }
};