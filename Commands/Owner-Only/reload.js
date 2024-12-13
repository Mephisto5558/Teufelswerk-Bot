const
  { Collection, codeBlock, inlineCode } = require('discord.js'),
  { resolve, basename, dirname } = require('node:path'),
  { access } = require('node:fs/promises'),
  { formatCommand, slashCommandsEqual, filename, commandMention } = require('#Utils'),
  MAX_COMMANDLIST_LENGTH = 800;

/**
 * @this {Client}
 * @param {SlashCommand | PrefixCommand | MixedCommand}command
 * @param {string[]}reloadedArray gets modified and not returned */
async function reloadCommand(command, reloadedArray) {
  /* eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- require.cache */
  delete require.cache[command.filePath];

  /** @type {SlashCommand | PrefixCommand | MixedCommand} */
  let file = {};
  try {
    file = formatCommand(
      require(command.filePath), command.filePath,
      `commands.${basename(dirname(command.filePath)).toLowerCase()}.${filename(command.filePath)}`,
      this.i18n
    );
  }
  catch (err) {
    if (err.code != 'MODULE_NOT_FOUND') throw err;
  }

  this.prefixCommands.delete(command.name);
  if (file.prefixCommand) {
    file.id = command.id;
    this.prefixCommands.set(file.name, file);
    reloadedArray.push(file.name);

    for (const alias of command.aliases.prefix ?? []) this.prefixCommands.delete(alias);
    for (const alias of file.aliases.prefix ?? []) {
      this.prefixCommands.set(alias, { ...file, aliasOf: file.name });
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
        log(`Skipped/Deleted Disabled Slash Command ${file.name}`);
      }
      else {
        file.id = (await this.application.commands.create(file)).id;
        log(`Reloaded Slash Command ${file.name}`);
      }
    }

    this.slashCommands.delete(command.name);
    this.slashCommands.set(file.name, file);
    reloadedArray.push(commandMention(file.name, file.id));

    for (const alias of [...file.aliases.slash ?? [], ...command.aliases.slash ?? []].unique()) {
      const { id } = this.slashCommands.get(alias) ?? {};
      let cmdId;

      if (equal) {
        this.slashCommands.delete(alias);
        this.slashCommands.set(alias, { ...file, id, aliasOf: file.name });
      }
      else {
        this.slashCommands.delete(alias);

        if (file.disabled || this.botType == 'dev' && !file.beta) {
          if (id) await this.application.commands.delete(id);
          log(`Skipped/Deleted Disabled Slash Command ${alias} (Alias of ${file.name})`);
        }
        else {
          cmdId = (await this.application.commands.create({ ...file, name: alias })).id;
          log(`Reloaded Slash Command ${alias} (Alias of ${file.name})`);
        }

        this.slashCommands.set(alias, { ...file, id: cmdId, aliasOf: file.name });
      }

      reloadedArray.push(commandMention(alias, cmdId ?? 0));
    }
  }
  else if (command.slashCommand) {
    this.slashCommands.delete(command.name);
    await this.application.commands.delete(command.id);
  }
}

module.exports = new PrefixCommand({
  dmPermission: true,
  options: [new CommandOption({
    name: 'command_name',
    type: 'String',
    required: true
  })],
  beta: true,

  async run(lang) {
    log.debug('Reloading files', this.args);

    const
      msg = await this.reply(lang('global.loading', getEmoji('loading'))),
      commandList = new Collection([...this.client.prefixCommands, ...this.client.slashCommands]),

      /** @type {(string | undefined)[]} */
      reloadedArray = [];

    let errorOccurred;
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
            /** @type {MixedCommand} */
            const cmd = require(filePath);
            cmd.filePath = filePath;
            cmd.category = this.args[1].split('/')[1].toLowerCase();

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
      errorOccurred = true;

      void msg.edit(lang('error', codeBlock(err.message)));

      if (this.client.botType == 'dev') throw err;
      log.error('Error while trying to reload a command:\n', err);
    }

    const
      commands = reloadedArray.filter(Boolean).map(e => e.startsWith('<') ? e : inlineCode(e)).join(', '),
      replyText = lang(reloadedArray.length ? 'reloaded' : 'noneReloaded', {
        count: inlineCode(reloadedArray.length),
        commands: commands.length < MAX_COMMANDLIST_LENGTH ? commands : commands.slice(0, Math.max(0, commands.slice(0, MAX_COMMANDLIST_LENGTH).lastIndexOf('`,') + 1)) + '...'
      });

    void (errorOccurred ? msg.reply(replyText) : msg.edit(replyText));
    log.debug('Finished reloading commands.');
  }
});