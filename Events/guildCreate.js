module.exports = async function guildCreate() {
  if (this.client.botType == 'dev') return;
  await this.client.db.update('guildSettings', `${this.id}.position`, (Object.values(this.client.db.get('guildSettings')).sort((a, b) => b?.position - a?.position)[0].position || 0) + 1);
};