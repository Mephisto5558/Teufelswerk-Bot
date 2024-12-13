/* eslint camelcase: [error, { allow: [_] }] -- This casing is used to better display the commandName. */
const
  { commandQuery, categoryQuery, allQuery, getCommands, getCommandCategories } = require('./help_utils'),
  { startRecording, recordControls } = require('./record_manage.js'),
  { hasPerm, createProxy } = require('./serverbackup_utils.js');


module.exports = {
  advice: require('./advice.js'),
  fact: require('./fact.js'),
  help_commandQuery: commandQuery,
  help_categoryQuery: categoryQuery,
  help_getCommands: getCommands,
  help_getCommandCategories: getCommandCategories,
  help_allQuery: allQuery,
  help: require('./help.js'),
  infoCMDs: require('./infoCMDs.js'),
  joke: require('./joke.js'),
  mgStats_formatTop: require('./mgStats_formatTop.js'),
  mgstats: require('./mgStats.js'),
  record_startRecording: startRecording,
  record_recordControls: recordControls,
  record: require('./record.js'),
  reddit: require('./reddit.js'),
  rps_sendChallenge: require('./rps_sendChallenge.js'),
  rps: require('./rps.js'),
  serverbackup_hasPerm: hasPerm,
  serverbackup_createProxy: createProxy,
  serverbackup: require('./serverbackup.js'),
  topic: require('./topic.js')
};

try { module.exports.marin = require('./marin.js'); }
catch (err) { if (err.code != 'MODULE_NOT_FOUND') throw err; }