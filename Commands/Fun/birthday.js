const
  { EmbedBuilder, Colors, userMention, bold } = require('discord.js'),
  { getTargetMember, getAge, timeFormatter: { msInSecond, secsInDay, daysInMonthMax, monthsInYear } } = require('#Utils'),
  currentYear = new Date().getFullYear();

/**
 * @param {Date | number} a
 * @param {Date | number | undefined} b @default Date.now()
 * @param {Date | number | undefined} currentTime @default Date.now()
 * @returns {number} negative if `a > b`, positive if `a < b`, `0` otherwise */
function sortDates(a, b = Date.now(), currentTime = Date.now()) {
  const
    diffA = new Date(a).setFullYear(currentYear) - currentTime,
    diffB = new Date(b).setFullYear(currentYear) - currentTime;

  if (diffA * diffB > 0) return diffA - diffB; // both are positive or both are negative
  return diffA <= 0 && diffB >= 0 ? 1 : -1;
}

/** @type {Record<string, (this: GuildInteraction, lang: lang) => Promise<Message>>} */
const birthdayMainFunctions = {
  set: async function set(lang) {
    const
      month = this.options.getInteger('month', true),
      day = this.options.getInteger('day', true),
      today = new Date(),
      nextBirthday = new Date(today.getFullYear(), month - 1, day);

    if (today > nextBirthday) nextBirthday.setFullYear(today.getFullYear() + 1);
    const diffDays = Math.ceil(Math.abs(nextBirthday - today) / secsInDay * msInSecond);

    await this.user.updateDB('birthday', new Date(this.options.getInteger('year', true), month - 1, day));
    return this.editReply(lang('saved', diffDays));
  },

  remove: async function remove(lang) {
    await this.client.db.delete('userSettings', `${this.user.id}.birthday`);
    return this.editReply(lang('removed'));
  },

  get: async function get(lang) {
    const
      target = getTargetMember(this),
      doNotHide = this.options.getBoolean('do_not_hide'),
      embed = new EmbedBuilder({
        color: Colors.Blurple,
        footer: {
          text: this.user.tag,
          iconURL: this.member.displayAvatarURL()
        }
      });

    if (target) {
      embed.data.title = lang('getUser.embedTitle', target.user.customName);

      const birthday = target.user.db.birthday;
      if (birthday) {
        const age = getAge(birthday) + 1;

        embed.data.description = lang('getUser.date', {
          user: target.customName,
          month: lang(`months.${birthday.getMonth() + 1}`), day: birthday.getDate(),
          daysUntil: bold(Math.round(Math.abs(Date.now() - new Date(birthday).setFullYear(sortDates(birthday) < 0 ? currentYear : currentYear + 1)) / (secsInDay * msInSecond)))
        });

        if (age < currentYear) embed.data.description += lang('getUser.newAge', bold(age));
      }
      else embed.data.description = lang('getUser.notFound', target.customName);
    }
    else {
      embed.data.title = lang('getAll.embedTitle');

      const
        guildMembers = new Set((await this.guild.members.fetch()).map(e => e.id)),
        currentTime = Date.now(),

        /** @type {[Snowflake, Date][]} */
        data = Object.entries(this.client.db.get('userSettings'))
          .reduce((acc, [k, { birthday }]) => {
            if (birthday && guildMembers.has(k)) acc.push([k, birthday]);
            return acc;
          }, [])
          .sort(([, a], [, b]) => sortDates(a, b, currentTime))
          .slice(0, 10);

      embed.data.description = data.length ? '' : lang('getAll.notFound');
      for (const [id, date] of data) {
        const
          dateStr = lang('getAll.date', { month: lang(`months.${date.getMonth() + 1}`), day: date.getDate() }),
          age = getAge(date) + 1,
          msg = '> ' + userMention(id) + (age < currentYear ? ` (${age})` : '') + '\n';

        embed.data.description += embed.data.description.includes(dateStr) ? msg : `\n${dateStr}${msg}`;
      }
    }

    if (!doNotHide) return this.editReply({ embeds: [embed] });

    await this.channel.send({ embeds: [embed] });
    return this.editReply(lang('global.messageSent'));
  }
};

module.exports = new SlashCommand({
  cooldowns: { user: msInSecond },
  ephemeralDefer: true,
  options: [
    new CommandOption({
      name: 'set',
      type: 'Subcommand',
      options: [
        new CommandOption({
          name: 'day',
          type: 'Integer',
          required: true,
          minValue: 1,
          maxValue: daysInMonthMax
        }),
        new CommandOption({
          name: 'month',
          type: 'Integer',
          required: true,
          minValue: 1,
          maxValue: monthsInYear
        }),
        new CommandOption({
          name: 'year',
          type: 'Integer',
          required: true,
          /* eslint-disable-next-line @typescript-eslint/no-magic-numbers -- min. year */
          minValue: 1900,
          maxValue: currentYear
        })
      ]
    }),
    new CommandOption({
      name: 'get',
      type: 'Subcommand',
      options: [
        new CommandOption({ name: 'target', type: 'User' }),
        new CommandOption({ name: 'do_not_hide', type: 'Boolean' })
      ]
    }),
    new CommandOption({ name: 'remove', type: 'Subcommand' })
  ],

  run(lang) {
    return birthdayMainFunctions[this.options.getSubcommand()].call(this, lang);
  }
});