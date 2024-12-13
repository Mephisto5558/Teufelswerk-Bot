const { inlineCode } = require('discord.js');

module.exports = new PrefixCommand({
  usage: { examples: '12345678901234568' },
  aliases: { prefix: ['blacklist'] },
  dmPermission: true,
  options: [new CommandOption({
    name: 'target',
    type: 'String',
    required: true
  })],
  beta: true,

  async run(lang) {
    const target = this.args[1];
    if (!target) return this.reply('global.unknownUser');

    if (this.args[0] == 'off') {
      if (!this.client.settings.blacklist?.includes(target)) return this.customReply(lang('notFound'));

      await this.client.db.update('botSettings', 'blacklist', this.client.settings.blacklist.filter(e => e != target));
      return this.customReply(lang('removed', inlineCode(target)));
    }

    if (this.client.config.devIds.has(target)) return this.customReply(lang('cantBlacklistDev'));

    await this.client.db.pushToSet('botSettings', 'blacklist', target);

    if (this.client.webServer) {
      const requests = this.client.webServer.voteSystem.fetchAll().reduce((acc, e) => {
        if (!e.pending && e.id.split('_')[0] == target) acc.push({ ...e, pending: true });
        return acc;
      }, []);

      if (requests.length) {
        const result = await this.client.webServer.voteSystem.update(requests, this.client.user.id);
        if (!result.success) throw new Error(JSON.stringify(result, undefined, 2));
      }
    }

    return this.customReply(lang('saved', inlineCode(target)));
  }
});