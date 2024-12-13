/** @type {import('.').getCommands} */
module.exports = function getCommands(lang) {
  /** @type {{category: string, subTitle: '', aliasesDisabled: boolean, list: { commandName: string, commandUsage: string, commandDescription: string, commandAlias: string }[] }[]} */
  const commandList = [...this.slashCommands.values(), ...this.prefixCommands.values()].unique().reduce((
    /** @type {{category: string, subTitle: string, list: Record<string, string>[]}[]} */acc, cmd
  ) => {
    if (this.config.ownerOnlyFolders.includes(cmd.category) || cmd.disabled || cmd.aliasOf) return acc;

    let category = acc.find(e => e.category == cmd.category);
    if (!category) {
      category = {
        category: cmd.category,
        subTitle: '',
        list: []
      };
      acc.push(category);
    }

    category.list.push({
      commandName: cmd.name,
      commandUsage: (
        (cmd.slashCommand ? lang('others.getCommands.lookAtOptionDesc') : '')
        + (lang(`commands.${cmd.category}.${cmd.name}.usage.usage`)?.replaceAll(/slash command:/gi, '') ?? '') || lang('others.getCommands.noInfo')
      ).trim().replaceAll('\n', '<br>&nbsp'),
      commandDescription: lang(`commands.${cmd.category}.${cmd.name}.description`) ?? cmd.description,
      commandAlias: (
        (cmd.aliases.prefix?.length ?? 0 ? `Prefix: ${cmd.aliases.prefix.join(', ')}\n` : '')
        + (cmd.aliases.slash?.length ?? 0 ? `Slash: ${cmd.aliases.slash.join(', ')}` : '') || lang('global.none')
      ).trim().replaceAll('\n', '<br>&nbsp')
    });

    return acc;
  }, []);

  commandList.sort((a, b) => a.category == 'others' ? 1 : b.list.length - a.list.length);
  return commandList.map(e => {
    e.category = lang(`commands.${e.category}.categoryName`);
    e.aliasesDisabled = !e.list.some(e => e.commandAlias != lang('global.none'));
    return e;
  });
};