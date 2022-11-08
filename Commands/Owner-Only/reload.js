const { Collection } = require('discord.js');

async function reloadCommand(commandName, path, reloadedArray) {
  delete require.cache[path];
  const file = require(path);

  if ((this.botType == 'dev' && !file.beta) || file.disabled) return;
  file.filePath = path;

  if (file.prefixCommand) {
    this.prefixCommands.set(commandName, file);
    reloadedArray.push(commandName);

    for (const alias of file.aliases?.prefix || []) {
      this.prefixCommands.set(alias, { ...file, aliasOf: file.name });
      reloadedArray.push(alias);
    }
  }

  if (file.slashCommand) {
    this.slashCommands.set(commandName, file);
    reloadedArray.push(`/${commandName}`);

    for (const alias of file.aliases?.slash || []) {
      this.slashCommands.set(alias, { ...file, aliasOf: file.name });
      reloadedArray.push(`/${alias}`);
    }
  }
}

module.exports = {
  name: 'reload',
  category: 'Owner-Only',
  slashCommand: false,
  prefixCommand: true,
  dmPermission: true,
  beta: true,

  run: async function (lang) {
    if (!this.args[0]) return this.reply(lang('invalidCommand'));

    const commandArray = new Collection([...this.client.prefixCommands, ...this.client.slashCommands]);
    let reloadedArray = [];

    if (this.args[0] == '*') {
      for (const [name, command] of commandArray)
        await reloadCommand.call(this.client, name, command.filePath, reloadedArray);
    }
    else {
      const command = commandArray.get(this.args[0]);
      if (!command) return this.reply(lang('invalidCommand'));

      await reloadCommand.call(this.client, command.name, command.filePath, reloadedArray);
    }

    const commands = reloadedArray.join('`, `');
    return this.customReply(lang(!reloadedArray.length ? 'noneReloaded' : 'reloaded', { count: reloadedArray.length, commands: commands.length < 800 ? commands : commands.substring(0, commands.substring(0, 800).lastIndexOf('`,')) + '...' }));
  }
};