const
  { setDefaultConfig, configValidationLoop, validConfig } = require('#Utils').configValidator,
  filePath = require('node:path').resolve(process.cwd(), 'config.json');

module.exports = new PrefixCommand({
  dmPermission: true,
  beta: true,

  async run(lang) {
    log.debug(`Reloading config, initiated by user ${this.user.tag}`);

    /* eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- require.cache */
    delete require.cache[filePath];

    const config = setDefaultConfig();
    try { configValidationLoop(config, validConfig, true); }
    catch (err) { return this.customReply(lang('error', err.message)); }

    config.devIds.add(this.client.user.id).add('owner' in this.client.application.owner ? this.client.application.owner.owner.id : this.client.application.owner.id);
    this.client.config = config;
    return this.customReply(lang('success'));
  }
});