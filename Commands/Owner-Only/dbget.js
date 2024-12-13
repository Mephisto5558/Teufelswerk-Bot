const { codeBlock } = require('discord.js');

module.exports = new PrefixCommand({
  dmPermission: true,
  options: [
    new CommandOption({
      name: 'database',
      type: 'String',
      required: true
    }),
    new CommandOption({ name: 'key', type: 'String' })
  ],
  beta: true,

  async run(lang) {
    const result = this.client.db.get(this.args[0], this.args[1]);
    return this.customReply(result ? codeBlock('json', JSON.stringify(result, undefined, 2)) : lang('notFound'));
  }
});