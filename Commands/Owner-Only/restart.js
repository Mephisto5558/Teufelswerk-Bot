const
  { spawn } = require('node:child_process'),
  { shellExec } = require('#Utils'),
  getUpdateFunc = /** @param {Message}msg */msg => msg.editable && msg.channel.lastMessageId == msg.id ? 'edit' : 'reply';

let restarting = false;

module.exports = new PrefixCommand({
  dmPermission: true,
  beta: true,

  async run(lang) {
    if (restarting) return this.reply(lang('alreadyRestarting', restarting));

    restarting = true;
    log(`Restarting bot, initiated by user '${this.user.tag}'...`);

    /** @type {Message<false> | undefined} */
    let msg;
    if (!this.content.toLowerCase().includes('skipnpm')) {
      msg = await this.reply(lang('updatingNPM', getEmoji('loading')));

      try { await shellExec('npm install'); }
      catch {
        /* eslint-disable-next-line require-atomic-updates -- I don't see any issue */
        restarting = false;
        return msg[getUpdateFunc(msg)](lang('updateNPMError'));
      }
    }

    /* eslint-disable-next-line require-atomic-updates */
    msg = await (msg ?? this)[getUpdateFunc(msg ?? this)](lang('restarting', getEmoji('loading')));

    let child;
    try {
      child = spawn(
        process.execPath, ['--inspect', ...process.argv.slice(1), `uptime=${process.uptime()}`],
        { detached: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc'] }
      );
    }
    catch (err) {
      /* eslint-disable-next-line require-atomic-updates -- I don't see any issue */
      restarting = false;

      log.error('Restarting Error: ', err);
      return msg.content == lang('restartingError') ? undefined : msg[getUpdateFunc(msg)](lang('restartingError'));
    }

    child
      .on('error', () => {
        restarting = false;
        if (msg.content != lang('restartingError')) return msg[getUpdateFunc(msg)](lang('restartingError'));
      })
      .on('exit', (code, signal) => {
        restarting = false;

        log.error(`Restarting Error: Exit Code ${code}, signal ${signal}`);
        if (msg.content != lang('restartingError')) return msg[getUpdateFunc(msg)](lang('restartingError'));
      })
      .on('message', async message => {
        if (message != 'Finished starting') return;

        await msg[getUpdateFunc(msg)](lang('success'));

        child.send('Start WebServer');
        child.disconnect();

        process.exit(0);
      });
  }
});