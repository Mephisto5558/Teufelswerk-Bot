const
  { codeBlock } = require('discord.js'),
  { shellExec } = require('#Utils');

module.exports = new PrefixCommand({
  dmPermission: true,
  options: [new CommandOption({
    name: 'command',
    type: 'String',
    required: true
  })],
  beta: true,

  async run(lang) {
    const msg = await this.reply(lang('global.loading', getEmoji('loading')));

    try {
      const { stdout = lang('global.none'), stderr } = await shellExec(this.content);
      let response = lang('stdout', { msg: lang('finished', codeBlock('sh', this.content)), stdout: codeBlock(stdout) });
      if (stderr) response += lang('stderr', codeBlock(stderr));

      await msg.customReply(response);
    }
    catch (err) { return msg.customReply(lang('error', { msg: lang('finished', codeBlock('sh', this.content)), name: err.name, err: err.message })); }

    return log.debug(`executed bash command '${this.content}'`);
  }
});