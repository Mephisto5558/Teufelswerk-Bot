const
  { readdir } = require('node:fs/promises'),
  { resolve } = require('node:path'),
  { getDirectories, formatSlashCommand, slashCommandsEqual } = require('../Utils');

/** @this {Client}*/
module.exports = async function slashCommandHandler() {
  await this.awaitReady();

  const applicationCommands = this.application.commands.fetch({ withLocalizations: true });
  let
    deletedCommandCount = 0,
    registeredCommandCount = 0;

  this.slashCommands.clear();

  for (const subFolder of await getDirectories('./Commands')) {
    for (const file of await readdir(`./Commands/${subFolder}`)) {
      if (!file.endsWith('.js')) continue;

      /** @type {command<'slash', boolean, true>}*/
      let command = require(`../Commands/${subFolder}/${file}`);

      if (!command.slashCommand) continue;
      try {
        command.name ??= file.split('.')[0];
        command = formatSlashCommand(command, `commands.${subFolder.toLowerCase()}.${file.slice(0, -3)}`, this.i18n);
        command.filePath = resolve(`Commands/${subFolder}/${file}`);
        command.category ??= subFolder.toLowerCase();
      }
      catch (err) {
        if (this.botType == 'dev') throw err;
        log.error(`Error on formatting command ${command.name}:\n`, err);

        command.skip = true;
        this.slashCommands.set(command.name, command);
        continue;
      }

      if (!command.disabled && !command.skip) {
        for (const [, applicationCommand] of await applicationCommands) {
          if (slashCommandsEqual(command, applicationCommand)) {
            log(`Skipped Slash Command ${command.name}`);

            command.skip = true;
            command.id = applicationCommand.id;
            break;
          }
        }
      }

      this.slashCommands.set(command.name, command);
      for (const alias of command.aliases?.slash ?? []) this.slashCommands.set(alias, { ...command, name: alias, aliasOf: command.name });
    }
  }

  for (const [, command] of this.slashCommands) {
    if (command.skip) continue;
    if (command.disabled) { if (!this.config.hideDisabledCommandLog) log(`Skipped Disabled Slash Command ${command.name}`); }
    else if (this.botType == 'dev' && !command.beta) { if (!this.config.hideNonBetaCommandLog) log(`Skipped Non-Beta Slash Command ${command.name}`); }
    else {
      try {
        command.id = (await this.application.commands.create(command)).id;

        log(`Registered Slash Command ${command.name}` + (command.aliasOf ? ` (Alias of ${command.aliasOf})` : ''));
        registeredCommandCount++;
      }
      catch (err) {
        if (this.botType == 'dev') throw err;
        log.error(`Error on registering command ${command.name}:\n`, err);
      }
    }
  }

  for (const [, command] of await applicationCommands) {
    const cmd = this.slashCommands.get(command.aliasOf ?? command.name);
    if (cmd && !cmd.disabled && (this.botType != 'dev' || cmd.beta)) continue;

    try {
      await this.application.commands.delete(command);

      log(`Deleted Slash Command ${command.name}`);
      deletedCommandCount++;
    }
    catch (err) {
      if (this.botType == 'dev') throw err;
      log.error(`Error on deleting command ${command.name}:\n`, err);
    }
  }

  this.on('interactionCreate', interaction => require('../Events/interactionCreate.js').call(interaction));

  /* eslint-disable no-unexpected-multiline, @stylistic/indent, @stylistic/function-call-spacing */
  log
    (`Registered ${registeredCommandCount} Slash Commands`) // NOSONAR
    (`Skipped ${this.slashCommands.filter(e => e.skip && delete e.skip).size} Slash Commands`)
    (`Deleted ${deletedCommandCount} Slash Commands`)
    ('Loaded Event interactionCreate')
    ('Ready to receive slash commands');
};