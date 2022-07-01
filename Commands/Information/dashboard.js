const
  { Command } = require('reconlx'),
  { MessageEmbed } = require('discord.js'),
  { name, author } = require('../../package.json'),
  { colors } = require('../../Settings/embed.json');

module.exports = new Command({
  name: 'dashboard',
  alias: [],
  description: 'get the link to the dashboard',
  usage: '',
  permissions: { client: [], user: [] },
  cooldowns: { global: 0, user: 0 },
  category: 'Information',
  slashCommand: true,
  prefixCommand: true,

  run: async(client, message, interaction) => {
    const embed = new MessageEmbed()
      .setTitle('Dashboard')
      .setDescription(`Click [here](https://${name}.${author}.repl.co/) to open the dashboard.`)
      .setColor(colors.discord.BURPLE)

    if(interaction) interaction.editReply({ embeds: [embed]});
    else client.functions.reply({embeds: [embed]}, message);
  }
})