/** @returns {number}milliseconds*/
const getOneMonthAgo = () => new Date().setMonth(new Date().getMonth() - 1);

/**
 * Deletes giveaway records that concluded over a month ago
 * @this {Client}
 * @param {string}guildId
 * @param {Record<string, { ended: boolean, endAt: number }>}db*/
function cleanupGiveawaysDB(guildId, db) {
  if (!db) return;

  for (const [id, { ended, endAt }] of Object.entries(db)) {
    if (!ended || getOneMonthAgo() < endAt) continue;
    this.db.delete('guildSettings', `${guildId}.giveaway.giveaways.${id}`);
  }
}

/**
 * Removes all lastMentions data older than one month
 * @this {Client}
 * @param {string}guildId
 * @param {{ [userId: string]: { createdAt: Date } }}db*/
function cleanupMentionsDB(guildId, db) {
  if (!db) return;

  for (const [userId, { createdAt }] of Object.entries(db)) {
    if (getOneMonthAgo() < createdAt.getTime()) continue;
    this.db.delete('guildSettings', `${guildId}.lastMentions.${userId}`);
  }
}

/**
 * Removes all AFK-Messages older than one month
 * @this {Client}
 * @param {string}guildId
 * @param {{ [userId: string]: { createdAt: string } }}db createdAt is in seconds, not milliseconds*/
function cleanupAfkMessagesDB(guildId, db) {
  if (!db) return;

  for (const [userId, { createdAt }] of Object.entries(db)) {
    if (getOneMonthAgo() < Number(createdAt) * 1000) continue;
    this.db.delete('guildSettings', `${guildId}.afkMessages.${userId}`);
  }
}

/**
 * Removes all AFK-Messages older than one month
 * @this {Client}
 * @param {string}guildId
 * @param {{ [game: string]: { [userId: string]: { createdAt: string } }}}db createdAt is in seconds, not milliseconds*/
function cleanUpMinigamesDB(guildId, db) {
  if (!db) return;

  for (const [gameId, data] of Object.entries(db)) {
    for (const [userId, { createdAt }] of Object.entries(data)) {
      if (getOneMonthAgo() < Number(createdAt)) continue;
      this.db.delete('guildSettings', `${guildId}.${gameId}.${userId}`);
    }
  }
}

module.exports = {
  time: '00 00 00 01 * *', // monthly
  startNow: true,

  /** @this {Client}*/
  onTick: async function () {
    const now = new Date().toLocaleString('en', { month: '2-digit', day: '2-digit' });

    if (this.settings.lastDBCleanup == now) return void log('Already ran DB cleanup today');
    log('Started DB cleanup');

    for (const [guildId, guild] of Object.entries(this.db.get('guildSettings'))) {
      if (guildId == 'default') continue;

      cleanupGiveawaysDB.call(this, guildId, guild.giveaway?.giveaways);
      cleanupMentionsDB.call(this, guildId, guild.lastMentions);
      cleanupAfkMessagesDB.call(this, guildId, guild.afkMessages);
      cleanUpMinigamesDB.call(this, guildId, guild.minigames);
    }

    log('Cleaned giveaways, lastMentions, afkMessages & minigames DB');

    await this.db.update('botSettings', 'lastDBCleanup', now);
    log('Finished DB cleanup');
  }
};