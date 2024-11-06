const { getTargetMember, constants: { memberNameMaxLength } } = require('#Utils');

module.exports = new MixedCommand({
  aliases: { prefix: ['custom-name'] },
  cooldowns: { user: 3e4 },
  dmPermission: true,
  premium: true,
  options: [
    new CommandOption({
      name: 'set',
      type: 'Subcommand',
      options: [
        new CommandOption({
          name: 'name',
          type: 'String',
          minLength: 2,
          maxLength: 32,
          required: true
        }),
        new CommandOption({ name: 'global', type: 'Boolean' })
      ]
    }),
    new CommandOption({
      name: 'get',
      type: 'Subcommand',
      options: [
        new CommandOption({ name: 'target', type: 'User' }),
        new CommandOption({ name: 'global', type: 'Boolean' })
      ]
    }),
    new CommandOption({
      name: 'clear',
      type: 'Subcommand',
      options: [new CommandOption({ name: 'global', type: 'Boolean' })]
    })
  ],

  async run(lang) {
    let target = getTargetMember(this, { returnSelf: true });
    if (this.options?.getBoolean('global') && 'user' in target) target = target.user; // target.user check for execution in dms

    switch (this.options?.getSubcommand() ?? this.args[0]) {
      case 'clear':
        if (target.customName) {
          if (this.options?.getBoolean('global')) target.user.customName = undefined;
          else target.customName = undefined;
        }

        return this.customReply(lang('clear.success'));


      case 'set': {
        const newName = this.options?.getString('name', true) ?? (this.args[0] == 'set' ? this.args.slice(1) : this.args).join(' ').slice(0, memberNameMaxLength + 1);
        target.customName = newName;

        return this.customReply(newName ? lang('set.success', newName) : lang('clear.success'));
      }

      default: return this.customReply(lang(target.id == this.user.id ? 'get.successYou' : 'get.successOther', target.customName));
    }
  }
});