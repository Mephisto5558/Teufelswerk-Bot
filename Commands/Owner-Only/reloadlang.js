module.exports = new PrefixCommand({
  dmPermission: true,
  beta: true,

  async run(lang) {
    log.debug(`Reloading language files, initiated by user ${this.user.tag}`);

    await this.client.i18n.loadAllLocales();
    return this.customReply(lang('success'));
  }
});