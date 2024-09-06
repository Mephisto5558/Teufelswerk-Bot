const
  { Collection } = require('discord.js'),
  /* eslint-disable-next-line @typescript-eslint/unbound-method -- not an issue with `node:path`*/
  { resolve, basename, dirname } = require('node:path'),
  { access } = require('node:fs/promises'),
  { formatCommand, slashCommandsEqual } = require('#Utils');

/**
 * @this {Client}
 * @param {command<string, boolean>}command
 * @param {string[]}reloadedArray gets modified and not returned*/
async function reloadCommand(command, reloadedArray) {
  /* eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- require.cache */
  delete require.cache[command.filePath];

  /** @type {command<string, boolean>} */
  let file = {};
  try {
    file = formatCommand(require(command.filePath), command.filePath, `commands.${basename(dirname(command.filePath)).toLowerCase()}.${basename(command.filePath).slice(0, -3)}`, this.i18n);
  }
  catch (err) {
    if (err.code != 'MODULE_NOT_FOUND') throw err;
  }

  this.prefixCommands.delete(command.name); // NOSONAR S1874
  if (file.prefixCommand) {
    file.id = command.id;
    this.prefixCommands.set(file.name, file); // NOSONAR S1874
    reloadedArray.push(file.name); // NOSONAR S1874

    for (const alias of command.aliases?.prefix ?? []) this.prefixCommands.delete(alias);
    for (const alias of file.aliases?.prefix ?? []) {
      this.prefixCommands.set(alias, { ...file, aliasOf: file.name }); // NOSONAR S1874
      reloadedArray.push(alias);
    }
  }

  if (file.slashCommand) {
    const equal = slashCommandsEqual(file, command);
    if (equal) file.id = command.id;
    else {
      if (command.id) await this.application.commands.delete(command.id);
      if (file.disabled || this.botType == 'dev' && !file.beta) {
        file.id = command.id;
        log(`Skipped/Deleted Disabled Slash Command ${file.name}`); // NOSONAR S1874
      }
      else {
        file.id = (await this.application.commands.create(file)).id;
        log(`Reloaded Slash Command ${file.name}`); // NOSONAR S1874
      }
    }

    this.slashCommands.delete(command.name); // NOSONAR S1874
    this.slashCommands.set(file.name, file); // NOSONAR S1874
    reloadedArray.push(`</${file.name}:${file.id ?? 0}>`); // NOSONAR S1874

    for (const alias of [...file.aliases?.slash ?? [], ...command.aliases?.slash ?? []].unique()) {
      const { id } = this.slashCommands.get(alias) ?? {};
      let cmdId;

      if (equal) {
        this.slashCommands.delete(alias);
        this.slashCommands.set(alias, { ...file, id, aliasOf: file.name }); // NOSONAR S1874
      }
      else {
        this.slashCommands.delete(alias);

        if (file.disabled || this.botType == 'dev' && !file.beta) {
          if (id) await this.application.commands.delete(id);
          log(`Skipped/Deleted Disabled Slash Command ${alias} (Alias of ${file.name})`); // NOSONAR S1874
        }
        else {
          cmdId = (await this.application.commands.create({ ...file, name: alias })).id;
          log(`Reloaded Slash Command ${alias} (Alias of ${file.name})`); // NOSONAR S1874
        }

        this.slashCommands.set(alias, { ...file, id: cmdId, aliasOf: file.name }); // NOSONAR S1874
      }

      reloadedArray.push(`</${alias}:${cmdId ?? 0}>`);
    }
  }
  else if (!file.slashCommand && command.slashCommand) {
    this.slashCommands.delete(command.name); // NOSONAR S1874
    if (command.id) await this.application.commands.delete(command.id);
  }
}

/** @type {command<'prefix', false>}*/
module.exports = {
  slashCommand: false,
  prefixCommand: true,
  dmPermission: true,
  options: [{
    name: 'command_name',
    type: 'String',
    required: true
  }],
  beta: true,

  run: async function (lang) {
    log.debug('Reloading files', this.args);

    const
      msg = await this.reply(lang('global.loading')),
      commandList = new Collection([...this.client.prefixCommands, ...this.client.slashCommands]),

      /** @type {(string | undefined)[]}*/
      reloadedArray = [];

    try {
      switch (this.args[0].toLowerCase()) {
        case 'file': {
          const filePath = resolve(process.cwd(), this.args[1]);

          try { await access(filePath); }
          catch (err) {
            if (err.code != 'ENOENT') throw err;
            return msg.edit(lang('invalidPath'));
          }

          if (this.args[1]?.startsWith('Commands/')) {
            /** @type {command<'both', boolean>} */
            const cmd = require(filePath);
            cmd.filePath = filePath;
            cmd.category = this.args[1].split('/')[1].toLowerCase(); // NOSONAR S1874

            await reloadCommand.call(this.client, cmd, reloadedArray);
          }

          /* eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- require.cache */
          delete require.cache[filePath];
          break;
        }
        case '*': for (const [, command] of commandList) await reloadCommand.call(this.client, command, reloadedArray); break;
        default: {
          const command = commandList.get(this.args[0].toLowerCase());
          if (!command) return msg.edit(lang('invalidCommand'));

          await reloadCommand.call(this.client, command, reloadedArray);
        }
      }
    }
    catch (err) {
      void msg.reply(lang('error', err.message));

      if (this.client.botType == 'dev') throw err;
      log.error('Error while trying to reload a command:\n', err);
    }

    const commands = reloadedArray.filter(Boolean).map(e => e.startsWith('<') ? e : `\`${e}\``).join(', ');
    void msg.edit(lang(reloadedArray.length ? 'reloaded' : 'noneReloaded', {
      count: reloadedArray.length,
      commands: commands.length < 800 ? commands : commands.slice(0, Math.max(0, commands.slice(0, 800).lastIndexOf('`,') + 1)) + '...'
    }));

    log.debug('Finished reloading commands.');
  }
};