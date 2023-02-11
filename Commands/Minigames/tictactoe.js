const TicTacToe = require('discord-tictactoe');

function eventCallback([player1, player2], [type1, type2 = type1], lang, game) {
  updateStats(player1.id, player2.id, type1, this.client.db);
  updateStats(player2.id, player1.id, type2, this.client.db);
  game.playAgain(game, lang);
}

function updateStats(firstID, secondID, type, db) {
  const stats = db.get('leaderboards').TicTacToe[firstID] || {};
  let against;

  switch (type) {
    case 'win': against = 'wonAgainst'; break;
    case 'lose': against = 'lostAgainst'; break;
    case 'draw': against = 'drewAgainst';
  }

  db.update('leaderboards', `TicTacToe.${firstID}`, {
    games: stats.games + 1 || 1,
    [`${type}s`]: stats[`${type}s`] + 1 || 1,
    [against]: { [secondID]: stats[against]?.[secondID] + 1 || 1 }
  });
}

module.exports = {
  name: 'tictactoe',
  aliases: { slash: ['ttt'] },
  permissions: { client: ['ManageMessages'] },
  cooldowns: { user: 5000 },
  slashCommand: true,
  prefixCommand: false,
  options: [{ name: 'opponent', type: 'User' }],

  run: async function (lang) {
    const
      gameTarget = this.options.getUser('opponent')?.id,
      game = new TicTacToe({
        simultaneousGames: true,
        gameExpireTime: 60,
        language: lang.__boundArgs__[0].locale,
        commandOptionName: gameTarget == this.client.user.id ? 'thisOptionWillNotGetUsed' : 'opponent'
      });

    if (gameTarget) this.channel.send(lang('newChallenge', gameTarget)).then(msg => setTimeout(() => msg.delete(), 5000));

    game.handleInteraction(this);

    game.on('win', data => eventCallback.call(this, [data.winner, data.loser], ['win', 'lose'], lang, game));
    game.on('tie', data => eventCallback.call(this, data.players, ['draw'], lang, game));
  }
};