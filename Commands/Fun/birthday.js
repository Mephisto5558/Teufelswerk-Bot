const
  { EmbedBuilder, Colors } = require('discord.js'),
  currentYear = new Date().getFullYear();

function getAge([year, month, day]) {
  const now = new Date();
  if (month < (now.getMonth() + 1) || (month == now.getMonth() + 1 && day < now.getDate()))
    return currentYear - year + 1;
  return currentYear - year;
}

module.exports = {
  name: 'birthday',
  aliases: { prefix: [], slash: [] },
  permissions: { client: [], user: [] },
  cooldowns: { guild: 0, user: 1000 },
  category: 'Fun',
  slashCommand: true,
  prefixCommand: false,
  ephemeralDefer: true,
  options: [
    {
      name: 'set',
      type: 'Subcommand',
      options: [
        {
          name: 'day',
          type: 'Number',
          minValue: 1,
          maxValue: 31,
          required: true
        },
        {
          name: 'month',
          type: 'Number',
          minValue: 1,
          maxValue: 12,
          required: true
        },
        {
          name: 'year',
          type: 'Number',
          minValue: 1900,
          maxValue: currentYear,
          required: true
        }
      ]
    },
    {
      name: 'get',
      type: 'Subcommand',
      options: [
        { name: 'target', type: 'User' },
        { name: 'do_not_hide', type: 'Boolean' }
      ]
    },
    { name: 'remove', type: 'Subcommand' }
  ],

  run: async (interaction, lang, { db }) => {
    const
      cmd = interaction.options.getSubcommand(),
      target = interaction.options.getUser('target'),
      doNotHide = interaction.options.getBoolean('do_not_hide'),
      oldData = db.get('userSettings'),
      birthday = [
        Math.abs(interaction.options.getNumber('year')),
        Math.abs(interaction.options.getNumber('month') || '')?.toString().padStart(2, '0'),
        Math.abs(interaction.options.getNumber('day') || '')?.toString().padStart(2, '0')
      ];

    switch (cmd) {
      case 'set': {
        const newData = oldData.fMerge({ [interaction.user.id]: { birthday: birthday.join('/') } });
        db.set('userSettings', newData);

        interaction.editReply(lang('saved')); //maybe add "your birthday is in <d> days"
        break;
      }

      case 'remove': {
        delete oldData[interaction.user.id].birthday;

        db.set('userSettings', oldData);

        interaction.editReply(lang('removed'));
        break;
      }

      case 'get': {
        let newData = '';
        const embed = new EmbedBuilder({
          color: Colors.Blurple,
          footer: {
            text: interaction.user.tag,
            iconURL: interaction.member.displayAvatarURL()
          }
        });

        if (target) {
          embed.data.title = lang('getUser.embedTitle', target.tag);

          const data = oldData[target.id]?.birthday?.split('/');

          if (!data) newData = lang('getUser.notFound');
          else {
            const age = getAge(data);
            newData = lang('getUser.date', { month: lang(`months.${data[1]}`), day: data[2] });
            if (age < currentYear) newData += lang('getUser.newAge', age);
          }
        }
        else {
          embed.data.title = lang('getAll.embedTitle');

          const guildMembers = (await interaction.guild.members.fetch()).map(e => e.id);
          const currentTime = new Date().getTime();

          const data = Object.entries(oldData)
            .filter(([k, { birthday } = {}]) => guildMembers.includes(k) && birthday)
            .map(([k, { birthday }]) => [k, ...birthday.split('/')])
            .sort(([, , month1, day1], [, , month2, day2]) => {
              const time = [new Date(currentYear, month1 - 1, day1), new Date(currentYear, month2 - 1, day2)];

              if (time[0] < currentTime) time[0].setFullYear(currentYear + 1, month1 - 1, day1);
              if (time[1] < currentTime) time[1].setFullYear(currentYear + 1, month2 - 1, day2);

              return time[0] - time[1];
            })
            .slice(0, 10);

          for (const [id, year, month, day] of data) {
            const date = lang('getAll.date', { month: lang(`months.${month}`), day: parseInt(day) });
            let age = getAge([year, month, day]);
            age = age < currentYear ? ` (${age})` : '';
            const msg = `> <@${id}>${age}\n`;

            if (newData?.includes(date)) newData += msg;
            else newData += `\n${date}${msg}`;
          }
        }

        embed.data.description = newData || lang('getAll.notFound');

        if (doNotHide) {
          interaction.channel.send({ embeds: [embed] });
          interaction.editReply(lang('global.messageSent'));
        }
        else interaction.editReply({ embeds: [embed] });
        break;
      }
    }
  }
}
