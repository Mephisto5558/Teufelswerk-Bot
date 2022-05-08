const 
  { Command } = require("reconlx"),
  { MessageEmbed } = require("discord.js"),
  embedConfig = require('../../Settings/embed.json');

let 
  errorMsg,
  noMsg,
  embed;

module.exports = new Command({
  name: 'kick',
  aliases: [],
  description: `kicks a member from the server`,
  permissions: { client: ['KICK_MEMBERS'], user: ['KICK_MEMBERS'] },
  cooldowns: { global: '', user: '' },
  category: "Moderation",
  slashCommand: true,
  prefixCommand: false,
  options: [{
      name: "member",
      description: `Who want you to get kicked`,
      type: "USER",
      required: true
    },
    {
      name: "reason",
      description: `The user will see the reason in a dm`,
      type: "STRING",
      required: true
    }
  ],

  run: async(client, _, interaction) => {

    let user = interaction.options.getUser('member');
    user = await interaction.guild.members.fetch(user.id);
    const moderator = `${interaction.member.user.username}#${interaction.member.user.discriminator}`;
    const reason = interaction.options.getString('reason');

    if (user.id === interaction.member.id)
      errorMsg = `You can't kick yourself!`;
    else if (user.roles.highest.comparePositionTo(interaction.member.roles.highest) > -1)
      errorMsg = `You don't have the permission to do that!`;
    else if (!user.kickable) 
      errorMsg = `I don't have the permission to do that!`;

    if (errorMsg) return interaction.followUp(errorMsg);

    embed = new MessageEmbed()
      .setTitle('Kicked')
      .setDescription(
        `You have been kicked from \`${interaction.guild.name}\`.\n` +
        `Moderator: ${moderator}\n` +
        `Reason: ${reason}`
      )
      .setColor(embedConfig.color_red);

    try {
      await user.send({ embeds: [embed] })
    } catch (err) { noMsg = true }

    try {
      await user.ban({ reason: reason }) }
    catch (err) {
      client.log(err);
      return interaction.followUp("I couldn't kick the user")
    }

    let description = `${user.displayName} has been successfully kicked.\nReason: ${reason}`
    if (noMsg) description = `${description}\nI Couldn't dm the user.`

    embed = new MessageEmbed()
      .setTitle('Kick')
      .setDescription(description)
      .setColor(embedConfig.color_red);

    interaction.followUp({ embeds: [embed] })
  }

})