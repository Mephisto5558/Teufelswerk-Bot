const
  { afk: { nicknamePrefix, getAfkStatus, listAfkStatuses, setAfkStatus }, timeFormatter: { msInSecond } } = require('#Utils'),
  maxAllowedAFKMsgLength = 1000;

module.exports = new MixedCommand({
  cooldowns: { user: msInSecond * 5 }, /* eslint-disable-line @typescript-eslint/no-magic-numbers -- 5s */
  dmPermission: true,
  options: [
    new CommandOption({
      name: 'set',
      type: 'Subcommand',
      options: [
        new CommandOption({
          name: 'message',
          type: 'String',
          maxLength: maxAllowedAFKMsgLength
        }),
        new CommandOption({ name: 'global', type: 'Boolean' })
      ]
    }),
    new CommandOption({
      name: 'get',
      type: 'Subcommand',
      options: [new CommandOption({ name: 'target', type: 'User' })]
    })
  ],

  run(lang) {
    if (this.options?.getSubcommand() == 'get') {
      const target = this.inGuild() ? this.options.getMember('target') : this.options.getUser('target') ?? this.user;
      if (target) return getAfkStatus.call(this, target, lang);

      return listAfkStatuses.call(this, lang);
    }

    const global = this.options?.getBoolean('global') ?? this.args?.[0] == 'global';
    return setAfkStatus.call(this, lang, global, this.options?.getString('message') ?? this.content?.slice(global ? nicknamePrefix.length + 1 : 0, maxAllowedAFKMsgLength));
  }
});