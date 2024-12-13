const
  { EmbedBuilder, Colors } = require('discord.js'),

  /** @type {import('.').checkForErrors} Getting type info while preventing circular import */
  checkForErrors = require('./checkForErrors.js'),

  /** @type {import('.').errorHandler} */
  errorHandler = require('./errorHandler.js');

/** @type {import('.').commandExecutionWrapper} */
module.exports = async function commandExecutionWrapper(command, commandType, lang) {
  const errorKey = await checkForErrors.call(this, command, lang);
  if (errorKey === true) return;
  else if (errorKey) return this.customReply({ embeds: [new EmbedBuilder({ description: lang(...errorKey), color: Colors.Red })], ephemeral: true });

  const
    commandName = command.aliasOf ?? command.name,

    /** @type {lang} */
    cmdLang = this.client.i18n.__.bBind(this.client.i18n, { locale: lang.__boundArgs__[0].locale, backupPath: command ? `commands.${command.category}.${commandName}` : undefined });

  log.debug(`Executing ${commandType} command ${commandName}`);

  if (!command.noDefer && this.replied === false) await this.deferReply({ ephemeral: command.ephemeralDefer ?? false }); // `=== false` because of Messages

  try {
    await command.run.call(this, cmdLang);

    if (this.client.botType != 'dev') {
      await this.client.db.update('botSettings', `cmdStats.${commandName}.${commandType}`, (this.client.settings.cmdStats[commandName]?.[commandType] ?? 0) + 1);
      await this.user.updateDB(`cmdStats.${commandName}.${commandType}`, (this.user.db.cmdStats?.[commandName][commandType] ?? 0) + 1);
      if (this.inGuild()) await this.guild.updateDB(`cmdStats.${commandName}.${commandType}`, (this.guild.db.cmdStats?.[commandName][commandType] ?? 0) + 1);
    }
  }
  catch (err) { return errorHandler.call(this.client, err, this, lang); }
};