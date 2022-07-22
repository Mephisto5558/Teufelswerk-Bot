const { Command } = require('reconlx');
const responseList = [
  'Naiiiiiin D:',
  'Ich würde niemals gehen!',
  'Bananensaft schmeckt lecker',
  'Ich kann garnicht weg sein, der Meph hält mich in seinem Keller gefangen und zwingt mich hier zu arbeiten! Hilf mir!!!!',
];

let response;

module.exports = new Command({
  name: 'bistduweg',
  aliases: { prefix: [], slash: [] },
  description: 'sagt nix wenn er weg is',
  usage: '',
  permissions: { client: [], user: [] },
  cooldowns: { guild: 0, user: 0 },
  category: 'Fun',
  slashCommand: false,
  prefixCommand: true,

  run: async ({ functions}, message) => {
    const random = Math.random() * 10;

    if(random > 5) response = responseList[0]; //50%
    else if(random > 1) response = responseList[1]; //40%
    else if(random > 0.01) response = responseList[2]; //9.99%
    else response = responseList[3]; //0.01%

    functions.reply(response, message);
  }
})