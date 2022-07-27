const
  { Command } = require('reconlx'),
  { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, Collection, ComponentType, Message } = require('discord.js'),
  hand = new Collection([['Rock', { id: 0, emoji: '✊' }], ['Paper', { id: 1, emoji: '🤚' }], ['Scissors', { id: 2, emoji: '✌️' }]]);

module.exports = new Command({
  name: 'rps',
  aliases: { prefix: ['rockpaperscissors'], slash: [] },
  description: 'Play rock paper scissors against the bot or (coming soon) your friends!',
  usage: '',
  permissions: { client: ['EmbedLinks'], user: [] },
  cooldowns: { guild: 0, user: 0 },
  category: 'Minigames',
  slashCommand: true,
  prefixCommand: true,

  run: async (_, message) => {
    let filter = i => msg.member.id == i.user.id;

    const msg = message;
    const
      botMove = hand.random(),
      data = {
        embeds: [new EmbedBuilder({ title: 'Rock Paper Scissors', description: 'Choose a handsign!' }).setColor('Random')],
        components: [
          new ActionRowBuilder({
            components: [
              new ButtonBuilder({
                customId: '0',
                label: '✊ Rock',
                style: ButtonStyle.Primary
              }),
              new ButtonBuilder({
                customId: '1',
                label: '🤚 Paper',
                style: ButtonStyle.Primary
              }),
              new ButtonBuilder({
                customId: '2',
                label: '✌️ Scissors',
                style: ButtonStyle.Primary
              })
            ]
          }),
          new ActionRowBuilder({
            components: [
              new ButtonBuilder({
                customId: 'cancel',
                label: 'Cancel',
                style: ButtonStyle.Danger
              })
            ]
          })
        ]
      };

    if (message instanceof Message) message.editable ? message.edit(data) : message = await message.reply(data);
    else message.editReply(data);

    const moveCollector = message.createMessageComponentCollector({ filter, max: 1, componentType: ComponentType.Button, time: 10000 });

    moveCollector.on('collect', async button => {
      await button.deferUpdate();
      const buttonId = button.customId;

      if (buttonId == 'cancel') {
        moveCollector.stop();
        return;
      }

      let win;
      if (botMove.id == buttonId) win = ['We tied!', '='];
      else if (botMove.id < buttonId || botMove.id == 2 && !buttonId) win = ['You win!', '>'];
      else win = ['You lost!', '<'];

      data.embeds[0].data.description = `I chose ${[...hand.entries()].find(([, e]) => e.id == botMove.id)[0]}! ${win[0]} (${hand.find(e => e.id == buttonId).emoji} ${win[1]} ${botMove.emoji})`;

      for (const button of data.components[0].components) {
        if (button.data.custom_id == buttonId) button.setStyle(ButtonStyle.Secondary);
        button.setDisabled(true);
      }

      data.components[1] = new ActionRowBuilder({
        components: [
          new ButtonBuilder({
            customId: 'playAgain',
            label: 'Play Again',
            style: ButtonStyle.Success
          })
        ]
      });

      message instanceof Message ? message.edit(data) : message.editReply(data);

      filter = i => msg.member.id == i.user.id && i.customId == 'playAgain';
      const playAgainCollector = message.createMessageComponentCollector({ filter, max: 1, componentType: ComponentType.Button, time: 15000 });

      playAgainCollector.on('collect', async button => {
        await button.deferUpdate();

        require('./rps.js').run(null, msg);
      });

      playAgainCollector.on('end', collected => {
        if (collected.size) return;

        for (const button of data.components[1].components) button.setDisabled(true);

        message instanceof Message ? message.edit(data) : message.editReply(data);
      });
    });

    moveCollector.on('end', collected => {
      if (collected.size && collected.first().customId != 'cancel') return;

      for (const row of data.components) {
        for (const button of row.components) button.setDisabled(true);
      }

      data.embeds[0].data.description = 'You lost because you chose to choose nothing!'

      message instanceof Message ? message.edit(data) : message.editReply(data);
    })

  }
})