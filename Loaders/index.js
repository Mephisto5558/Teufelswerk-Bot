const loaders = {
  commandLoader: require('./command_loader'),
  commandLoaderSlash: require('./command_loader_slash'),
  eventLoader: require('./event_loader'),
  timeEventsLoader: require('./timeEvents_loader')
};

module.exports = loaders;