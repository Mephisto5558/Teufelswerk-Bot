const
  { randomInt } = require('node:crypto'),
  SIDE_CHANCE = 3000; // 1 in 3000

module.exports = new MixedCommand({
  dmPermission: true,

  async run(lang) { return this.customReply(lang(randomInt(SIDE_CHANCE) == 0 ? 'side' : 'response')); }
});