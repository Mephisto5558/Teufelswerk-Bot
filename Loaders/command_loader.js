const
  { readdir } = require('node:fs/promises'),
  { join } = require('node:path'),
  { getDirectories } = require('#Utils'),
  COMMANDS_FOLDER = './Commands',
  commandCount = {
    prefix: { enabled: 0, disabled: 0 },
    slash: { enabled: 0, disabled: 0 }
  };

/**
 * @this {Client<false>}
 * @param {string}alias
 * @param {SlashCommand | PrefixCommand | MixedCommand}command
 * @param {string}type
 */
function loadAlias(alias, command, type) {
  this.commands[type].set(alias, { ...command, name: alias, aliasOf: command.name });
  if (command.disabled) {
    commandCount[type].disabled++;
    if (!this.config.hideDisabledCommandLog)
      log(`Loaded Alias ${alias} of ${type[0].toUpperCase()}${type.slice(1)} Command ${command.name} (disabled)`);
  }
  else log(`Loaded Alias ${alias} of ${type[0].toUpperCase()}${type.slice(1)} Command ${command.name}`);

  if (this.botType == 'dev' && !command.beta) commandCount[type].disabled++;
  else commandCount[type].enabled++;
}

/** @this {Client<false>}*/
module.exports = async function commandLoader() {
  for (const categoryFolder of await getDirectories(COMMANDS_FOLDER)) {
    for (const fileName of await readdir(join(COMMANDS_FOLDER, categoryFolder))) {
      if (!fileName.endsWith('.js')) continue;

      /** @type {SlashCommand | PrefixCommand | MixedCommand | undefined}*/
      const command = require(join(process.cwd(), COMMANDS_FOLDER, categoryFolder, fileName));
      if (!command) continue;

      if (command.slashCommand) this.commands.slash.set(command.name, command);
      if (command.prefixCommand) this.commands.prefix.set(command.name, command);

      let commandType;
      if (command.slashCommand) commandType = command.prefixCommand ? 'Slash & Prefix Command' : 'Slash Command';
      else commandType = 'Prefix Command';

      if (command.disabled) {
        if (!this.config.hideDisabledCommandLog) log(`Loaded Disabled ${commandType} ${command.name}`);
      }
      else if (!command.beta && this.botType == 'dev') {
        if (!this.config.hideNonBetaCommandLog) log(`Loaded Non-Beta ${commandType} ${command.name}`);
      }
      else log(`Loaded ${commandType} ${command.name}`);

      if (command.disabled || this.botType == 'dev' && !command.beta) {
        if (command.prefixCommand) commandCount.prefix.disabled++;
        if (command.slashCommand) commandCount.slash.disabled++;
      }
      else {
        if (command.prefixCommand) commandCount.prefix.enabled++;
        if (command.slashCommand) commandCount.slash.enabled++;
      }

      for (const type of ['prefix', 'slash']) {
        for (const alias of command.aliases[type] ?? [])
          loadAlias.call(this, alias, command, type);
      }
    }
  }

  for (const type of ['prefix', 'slash']) {
    log(`Loaded ${commandCount[type].enabled} Enabled ${type[0].toUpperCase()}${type.slice(1)} Commands`);
    if (!this.config.hideDisabledCommandLog) log(`Loaded ${commandCount[type].disabled} Disabled/Non-Beta ${type[0].toUpperCase()}${type.slice(1)} Commands`);
  }
  console.log(); // Empty line

  return this.commands.updateApplicationCommands();
};