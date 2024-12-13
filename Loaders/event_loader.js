const
  events = require('../Events'),
  { errorHandler } = require('#Utils');

/** @this {Client} */
module.exports = function eventLoader() {
  for (const [name, event] of Object.entries(events)) {
    if (name == 'interactionCreate') continue; // InteractionCreate gets loaded after all slash commands are registred

    this.on(name, async (...args) => {
      const eventArgs = [...args, this].unique();

      try { await event.call(...eventArgs); }
      catch (err) { await errorHandler.call(this, err, eventArgs); }
    });

    log(`Loaded Event ${name}`);
  }

  log(`Loaded ${events.__count__} Events\n`);
};