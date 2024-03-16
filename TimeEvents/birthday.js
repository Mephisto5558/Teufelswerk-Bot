const
  { EmbedBuilder } = require('discord.js'),
  { DiscordAPIErrorCodes } = require('../Utils');

/**
 * @this {StringConstructor}
 * @param {import('discord.js').User}user
 * @param {number}year*/
function formatBirthday(user, year) {
  return this?.toString()?.replaceAll('<user.nickname>', user.displayName)
    .replaceAll('<user.username>', user.username)
    .replaceAll('<user.id>', user.id)
    .replaceAll('<user.tag>', user.tag)
    .replaceAll('<user.joinedAt>', user.joinedAt.toLocaleDateString('en'))
    .replaceAll('<guild.id>', user.guild.id)
    .replaceAll('<guild.memberCount>', user.guild?.memberCount)
    .replaceAll('<guild.name>', user.guild?.name)
    .replaceAll('<bornyear>', year)
    .replaceAll('<date>', new Date().toLocaleDateString('en'))
    .replaceAll('<age>', Number.parseInt(year) ? new Date().getFullYear() - year : '<age>')
    .replaceAll(/<age>\.?/g, ''); // <guilds> gets replaced below
}

module.exports = {
  time: '00 00 00 * * *',
  startNow: true,

  /** @this {Client}*/
  onTick: async function () {
    const
      now = new Date(),
      nowMonth = now.getMonth(),
      nowDate = now.getDate();

    if (this.settings.lastBirthdayCheck.toDateString() == now.toDateString()) return void log('Already ran birthday check today');
    log('Started birthday check');

    const defaultSettings = this.defaultSettings.birthday;

    await this.guilds.fetch();
    for await (const [,guild] of this.guilds.cache) {
      const settings = guild.db.birthday;
      if (!settings?.enable) continue;

      /** @type {Record<import('discord.js').Snowflake, number>} */
      const birthdayUserList = Object.entries(this.db.get('userSettings')).reduce((acc, [id, { birthday }]) => {
        if (birthday.getMonth() == nowMonth && birthday.getDate() == nowDate) acc[id] = birthday.getFullYear();
        return acc;
      }, {});

      for (const [,member] of await guild.members.fetch({ user: [...birthdayUserList.keys()] })) {
        const year = birthdayUserList.get(member.id);

        let channel;
        if (settings.ch?.channel) {
          try { channel = await guild.channels.fetch(settings.ch.channel); }
          catch (err) {
            if (err.code != DiscordAPIErrorCodes.UnknownChannel) throw err;
            return (await guild.fetchOwner()).send(this.i18n.__({ locale: guild?.db.config?.lang ?? guild?.localeCode }, 'others.timeEvents.birthday.unknownChannel', guild.name));
          }

          const embed = new EmbedBuilder({
            title: formatBirthday.call(settings.ch.msg?.embed?.title ?? defaultSettings.ch.msg.embed.title, member, year),
            description: formatBirthday.call(settings.ch.msg?.embed?.description ?? defaultSettings.ch.msg.embed.description, member, year),
            color: settings.ch.msg?.embed?.color ?? defaultSettings.ch.msg.embed.color
          });

          await channel.send({ content: formatBirthday.call(settings.ch.msg?.content, member, year), embeds: [embed] });
        }

        if (settings.dm?.enable) {
          const embed = new EmbedBuilder({
            title: formatBirthday.call(settings.dm.msg?.embed?.title ?? defaultSettings.dm.msg.embed.title, member, year),
            description: formatBirthday.call(settings.dm.msg?.embed?.description ?? defaultSettings.dm.msg.embed.description, member, year),
            color: settings.dm.msg?.embed?.color ?? defaultSettings.dm.msg.embed.color
          });

          try { await member.send({ content: formatBirthday.call(settings.dm.msg?.content, member, year), embeds: [embed] }); }
          catch (err) {
            if (err.code != DiscordAPIErrorCodes.CannotSendMessagesToThisUser) throw err;
          }
        }
      }
    }

    await this.db.update('botSettings', 'lastBirthdayCheck', now);
    log('Finished birthday check');
  }
};