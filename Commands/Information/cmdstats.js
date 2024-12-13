const
  { EmbedBuilder, Colors, bold, inlineCode } = require('discord.js'),
  { timeFormatter: { msInSecond }, commandMention } = require('#Utils');

module.exports = new MixedCommand({
  usage: { examples: 'user joke' },
  cooldowns: { user: msInSecond },
  dmPermission: true,
  options: [
    new CommandOption({
      name: 'scope',
      type: 'String',
      choices: ['bot', 'guild', 'user']
    }),
    new CommandOption({
      name: 'command',
      type: 'String',
      autocompleteOptions() { return [...this.client.prefixCommands.keys(), ...this.client.slashCommands.keys()].unique(); },
      strictAutocomplete: true
    })
  ],

  async run(lang) {
    const
      scope = this.options?.getString('scope') ?? this.args?.[0]?.toLowerCase() ?? 'bot',
      query = (this.options?.getString('command') ?? this.args?.[this.args.length == 1 ? 0 : 1])?.toLowerCase(),
      cmdStats = (scope == 'guild' || scope == 'user' ? this[scope].db.cmdStats : this.client.settings.cmdStats) ?? {};

    let target;
    if (scope == 'guild') target = this.guild.name;
    else if (scope == 'user') target = this.user.displayName;
    else target = this.client.user.displayName;

    const embed = new EmbedBuilder({ title: lang('embedTitle', target), color: Colors.White });

    if (query) {
      let command = this.client.slashCommands.get(query) ?? this.client.prefixCommands.get(query);
      if (command?.aliasOf) command = this.client.slashCommands.get(command.aliasOf) ?? this.client.prefixCommands.get(command.aliasOf);

      if (!command) return this.customReply({ embeds: [embed.setDescription(lang('notFound')).setColor(Colors.Red)] });

      const total = bold(Object.values(cmdStats[command.name] ?? {}).reduce((acc, e) => acc + e, 0));
      embed.data.description = lang('embedDescriptionOne', {
        total, command: 'id' in command ? commandMention(command.name, command.id) : inlineCode(command.name),
        slash: bold(cmdStats[command.name]?.slash ?? 0), prefix: bold(cmdStats[command.name]?.prefix ?? 0)
      });
    }
    else {
      embed.data.description = lang('embedDescriptionMany');
      embed.data.fields = Object.entries(cmdStats)
        .filter(([k]) => !this.client.config.ownerOnlyFolders.includes((this.client.prefixCommands.get(k) ?? this.client.slashCommands.get(k))?.category))
        .map(([k, v = {}]) => [k, { total: Object.values(v).reduce((acc, e) => acc + e, 0) ?? 0, slash: bold(v.slash ?? 0), prefix: bold(v.prefix ?? 0) }])
        .sort(([, a], [, b]) => b.total - a.total)
        .slice(0, 10)
        .map((/** @type {[string, {total: number, slash: number, prefix: number}]} */[k, v]) => {
          const id = this.client.application.commands.cache.find(e => e.name == k)?.id;
          return { name: id ? commandMention(k, id) : `/${k}`, value: lang('embedFieldValue', { total: bold(v.total), ...v }), inline: true };
        });
    }

    return this.customReply({ embeds: [embed] });
  }
});