const
  { Command } = require("reconlx"),
  { MessageEmbed } = require("discord.js"),
  fs = require("fs");

let description;

module.exports = new Command({
  name: 'info',
  alias: [],
  description: 'shows some stats of the bot',
  usage: '',
  permissions: { client: [], user: [] },
  cooldowns: { global: 0, user: 0 },
  category: 'Information',
  slashCommand: false,
  prefixCommand: true,
  disabled: false,

  run: (client, message) => {

    fs.readFile('./Logs/startCount.log', 'utf8', (err, data) => {
      if(err) {
        var data = 0;
        console.error(err);
      }
      description = `Developer: .̔̏𝗠𝗲𝗽𝗵𝗶𝘀𝘁𝗼#5558\nStarts: ${data}`;

      let date = new Date(client.startTime).toLocaleString('de-DE', {
        day: '2-digit',
        year: 'numeric',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      description += '\nOnline since: ' + date;

      let embed = new MessageEmbed()
        .setTitle('Stats')
        .setDescription(description)
        .setFooter({ text: 'More stats are coming soon!' });

      client.functions.reply({ embeds: [embed] }, message);
    });
  }
})