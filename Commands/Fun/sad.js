const responseList = ['D:', ':c', 'qwq', ':C', 'q_q', ':/'];

module.exports = new MixedCommand({
  dmPermission: true,

  async run() { return this.customReply(responseList.random()); }
});