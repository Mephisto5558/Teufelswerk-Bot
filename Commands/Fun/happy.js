const responseList = [
  'c:', 'C:', ':D', 'uwu',
  '<:gucken:725670318164672543>',
  'https://tenor.com/view/yell-shout-excited-happy-so-happy-gif-17583147',
  'https://media.tenor.com/k-tV1c5bCCkAAAPo/cat-smile-happy-cat.mp4'
];

module.exports = {
  name: 'happy',
  aliases: { prefix: [], slash: [] },
  permissions: { client: [], user: [] },
  cooldowns: { guild: 0, user: 0 },
  category: 'Fun',
  slashCommand: false,
  prefixCommand: true,

  run: message => message.customReply(responseList.random())
}