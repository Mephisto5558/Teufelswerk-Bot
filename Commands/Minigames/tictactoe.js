const
  TicTacToe = require('discord-tictactoe'),
  { getTargetMember } = require('../../Utils');

/**
 * @this {GuildInteraction}
 * @param {import('discord.js').GuildMember[]}players
 * @param {('win'|'lose'|'draw')[]}types
 * @param {lang}lang
 * @param {TicTacToe}game*/
async function eventCallback([player1, player2], [type1, type2 = type1], lang, game) {
  if (player1.id == this.client.user.id || player2.id == this.client.user.id) return;

  await updateStats(player1.id, player2.id, type1, this.client.db);
  await updateStats(player2.id, player1.id, type2, this.client.db);
  return game.playAgain(this, lang);
}

/**
 * @param {string}firstID
 * @param {string}secondID
 * @param {'win'|'lose'|'draw'}type
 * @param {Client['db']}db*/
function updateStats(firstID, secondID, type, db) {
  /** @type {import('../../database').Database['leaderboards']['TicTacToe']['userId']} */
  const stats = db.get('leaderboards', `TicTacToe.${firstID}`) ?? {};
  let against;

  switch (type) {
    case 'win': against = 'wonAgainst'; break;
    case 'lose': against = 'lostAgainst'; break;
    case 'draw': against = 'drewAgainst';
  }

  db.update('leaderboards', `TicTacToe.${firstID}.games`, (stats.games ?? 0) + 1);
  db.update('leaderboards', `TicTacToe.${firstID}.${type}s`, (stats[`${type}s`] ?? 0) + 1);
  return db.update('leaderboards', `TicTacToe.${firstID}.against.${secondID}`, (stats[against]?.[secondID] ?? 0) + 1);
}

/** @type {command<'slash'>}*/
module.exports = {
  aliases: { prefix: ['ttt'], slash: ['ttt'] },
  cooldowns: { user: 5000 },
  slashCommand: true,
  prefixCommand: false,
  options: [{ name: 'opponent', type: 'User' }],

  run: function (lang) {
    const
      gameTarget = getTargetMember(this, { targetOptionName: 'opponent' })?.id,
      game = new TicTacToe({
        simultaneousGames: true,
        gameExpireTime: 60,
        language: lang.__boundArgs__[0].locale,
        commandOptionName: gameTarget == this.client.user.id ? 'thisOptionWillNotGetUsed' : 'opponent'
      });

    if (gameTarget) this.channel.send(lang('newChallenge', gameTarget)).then(msg => setTimeout(() => msg.delete(), 5000));

    game.on('win', data => eventCallback.call(this, [data.winner, data.loser], ['win', 'lose'], lang, game));
    game.on('tie', data => eventCallback.call(this, data.players, ['draw'], lang, game));

    return game.handleInteraction(this);
  }
};