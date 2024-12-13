const
  { userMention } = require('discord.js'),
  { checkTargetManageable, timeFormatter: { msInSecond } } = require('#Utils');

module.exports = new SlashCommand({
  permissions: { client: ['MuteMembers'], user: ['MuteMembers'] },
  cooldowns: { user: msInSecond / 10 },
  options: [
    new CommandOption({
      name: 'target',
      type: 'User',
      required: true
    }),
    new CommandOption({ name: 'reason', type: 'String' })
  ],

  async run(lang) {
    const

      /** @type {import('discord.js').GuildMember?} */
      target = this.options.getMember('target'),
      reason = this.options.getString('reason') ?? lang('noReason');

    if (!target) return this.editReply(lang('notFound'));
    if (!target.isCommunicationDisabled()) return this.editReply(lang('notMuted'));

    const err = checkTargetManageable.call(this, target);
    if (err) return this.editReply(lang(err));

    /* eslint-disable-next-line unicorn/no-null -- `null` must be used here. */
    await target.disableCommunicationUntil(null, `${reason} | ${lang('global.modReason', { command: this.commandName, user: this.user.tag })}`);
    return this.editReply(lang('success', userMention(target.user.id)));
  }
});