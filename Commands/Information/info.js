const
  { Command } = require('reconlx'),
  { EmbedBuilder, Colors } = require('discord.js'),
  { readFileSync } = require('fs'),
  { Website } = require('../../config.json');

module.exports = new Command({
  name: 'info',
  aliases: { prefix: [], slash: [] },
  description: 'shows some stats of the bot',
  usage: '',
  permissions: { client: ['EmbedLinks'], user: [] },
  cooldowns: { guild: 0, user: 50 },
  category: 'Information',
  slashCommand: false,
  prefixCommand: true,

  run: async (message, client) => {
    const
      startTime = Math.round(client.startTime / 1000),
      startCount = readFileSync('./Logs/startCount.log', 'utf8') || 0,
      owner = client.application.owner.tag || client.application.owner.owner.tag,
      description =
        `Developer: ${owner}\n` +
        `Shard: ${message.guild.shardId}\n` +
        `Guild: ${client.db.get('guildSettings')[message.guild.id]?.position || '0'}`
        `Starts: ${startCount}\n` +
        `Last start: <t:${startTime}> (<t:${startTime}:R>)\n` +
        `[Dashboard](${Website.Dashboard})\n` +
        `[Privacy Policy](${Website.PrivacyPolicy})`,

      embed = new EmbedBuilder({
        title: 'Stats',
        description: description,
        color: Colors.DarkGold,
        footer: { text: 'More stats are coming soon!' }
      });

    client.functions.reply({ embeds: [embed] }, message);
  }
})