const
  { getTargetMember, timeFormatter: { msInSecond } } = require('#Utils'),
  { rps_sendChallenge: sendChallenge } = require('#Utils/componentHandler');

module.exports = new MixedCommand({
  aliases: { prefix: ['rockpaperscissors'] },
  cooldowns: { user: msInSecond },
  options: [new CommandOption({ name: 'opponent', type: 'User' })],

  run(lang) {
    return sendChallenge.call(this, lang, this.member, getTargetMember(this, { targetOptionName: 'opponent' }));
  }
});