const { Command } = require("reconlx");

module.exports = new Command({
  name: 'vinjagostinkt',
  aliases: [],
  description: `just a little easter egg`,
  permissions: {client: [], user: []},
  category : "Fun",
  hideInHelp: true,
  slashCommand: false,
  run: async (client, message, interaction) => {
    
    client.functions.reply(':eyes:', message)
    
  }
})