const
  { Command } = require('reconlx'),
  { MessageEmbed } = require('discord.js'),
  { colors } = require('../../Settings/embed.json');

function listCommands(list, output, count, category) {
  for (let command of list) {
    command = command[1];
    if (!category) throw new Error(`missing category information for command ${command.name}`)
    if (command.category.toUpperCase() != category.toUpperCase() || command.hideInHelp || command.disabled || output.includes(`\`${command.name}\``)) continue;

    if (count % 5 == 0) output += `\`${command.name}\`\n> `
    else output += `\`${command.name}\`, `
    count++
  }
  return [output, count];
}

module.exports = new Command({
  name: 'help',
  aliases: [],
  description: 'Shows all bot commands',
  permissions: { client: [], user: [] },
  cooldowns: { global: '', user: '' },
  category: 'Information',
  slashCommand: true,
  prefixCommand: true,
  ephemeralDefer: true,
  options: [{
    name: 'command',
    description: 'Type a command here to get more information about it',
    type: 'STRING',
    required: false
  }],

  run: (client, message, interaction) => {
    const embed = new MessageEmbed({ color: colors.discord.BURPLE });
    let query;

    if (message) query = message.args[0]?.toLowerCase();
    else {
      message = interaction;
      query = interaction.options?.getString('command')?.toLowerCase();
    }

    if (query) {
      const cmd = client.commands.get(query) || client.slashCommands.get(query);

      if (!cmd?.name || cmd.hideInHelp || cmd.disabled || cmd.category.toLowerCase() == 'owner-only') {
        embed.description = `No Information found for command \`${query}\``;
        embed.color = colors.RED;
      }
      else {
        embed.title = `Detailed Information about: \`${cmd.name}\``;
        embed.description = cmd.description ?? 'No description found';
        embed.footer = { text: `Syntax: <> = required, [] = optional | Prefix: '${client.db.get('settings')[message.guild.id]?.prefix || client.db.get('settings').default.prefix}'` };

        if (cmd.aliases?.length) embed.addField('Aliases', `\`${listCommands(cmd.aliases, '', 1).replace(/> /g, '')}\``);
        if (cmd.permissions?.client?.length) embed.addField('Required Bot Permissions', '`' + cmd.permissions.client.join('`, `'), true);
        if (cmd.permissions?.user?.length) embed.addField('Required User Permissions', '`' + cmd.permissions.user.join('`, `'), true);
        if (cmd.usage) embed.addField('Usage', `${cmd.slashCommand ? 'SLASH Command: look at the option descriptions.\n' : ''} ${cmd.usage || ''}`);
      }

      return interaction ? interaction.editReply({ embeds: [embed] }) : client.functions.reply({ embeds: [embed] }, message);
    }

    embed.title = `🔰All my commands`;
    embed.thumbnail = client.user.displayAvatarURL({ dynamic: true });

    for (let i = 0; i < client.categories.length; i++) {
      const category = client.categories[i].toLowerCase();
      if (category == 'owner-only') continue;

      let data = listCommands(client.commands, '', 1, category);
      data = listCommands(client.slashCommands, data[0], data[1], category);

      if (data[1] == 1) continue;

      let cmdList = data[0];

      if (cmdList.endsWith('\n> ')) cmdList = cmdList.slice(0, -4);
      if (cmdList.endsWith(', ')) cmdList = cmdList.slice(0, -2);
      if (!cmdList.endsWith('`')) cmdList += '`';

      if (cmdList) embed.addField(`**${category} [${data[1] - 1}]**`, `> ${cmdList}\n`);
    }

    if (!embed.fields) embed.description = 'No commands found...';
    else embed.footer = { text: `Use the 'command' option to get more information about a specific command.` };

    interaction ? interaction.editReply({ embeds: [embed] }) : client.functions.reply({ embeds: [embed] }, message);
  }
})