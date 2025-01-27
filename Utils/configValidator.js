const
  { ConnectionString } = require('mongodb-connection-string-url'),
  { writeFileSync } = require('node:fs'),
  configPath = require('node:path').resolve(process.cwd(), 'config.json'),
  validConfig = {
    devIds: 'object', // set<string>
    website: {
      baseDomain: 'string',
      domain: 'string',
      port: 'string',
      dashboard: 'string',
      dashboardRedirectURL: 'string',
      privacyPolicy: 'string',
      invite: 'string'
    },
    github: {
      repo: 'string',
      userName: 'string',
      repoName: 'string'
    },
    ownerOnlyFolders: ['string'],
    discordInvite: 'string',
    mailAddress: 'string',
    hideOverwriteWarning: 'boolean',
    hideNonBetaCommandLog: 'boolean',
    hideDisabledCommandLog: 'boolean',
    replyOnDisabledCommand: 'boolean',
    replyOnNonBetaCommand: 'boolean',
    disableWebServer: 'boolean',
    enableConsoleFix: 'boolean'
  },
  validEnv = {
    global: {
      environment: 'string',
      keys: {
        humorAPIKey: 'string',
        rapidAPIKey: 'string',
        githubKey: 'string',
        chatGPTApiKey: 'string',
        dbdLicense: 'string',
        votingWebhookURL: 'string'
      }
    },
    main: {
      dbConnectionStr: 'string',
      keys: {
        token: 'string',
        secret: 'string'
      }
    }
  };

/** @type {import('.').configValidator.configValidationLoop} */
function configValidationLoop(obj, checkObj, allowNull) {
  for (const [key, value] of Object.entries(obj)) {
    if (!(key in checkObj)) {
      log.warn(`Unknown key or subkey "${key}" in config.json.`);
      continue;
    }

    if (allowNull && value == undefined) continue;

    const expectedType = checkObj[key];
    if (typeof expectedType === 'string' && typeof value !== expectedType)
      throw new Error(`Invalid type for key or subkey ${key} in config.json: Expected ${expectedType}, got ${typeof value}`);
    else if (Array.isArray(expectedType) && !(Array.isArray(value) && value.every(v => typeof v === expectedType[0])))
      throw new Error(`Invalid type for key or subkey ${key} in config.json: Expected Array of ${expectedType[0]}, got ${typeof value}`);

    if (typeof value == 'object') return configValidationLoop(value, checkObj[key]);
  }
}

/** @type {import('.').configValidator.validateConfig} */
function validateConfig() {
  // prototypeRegisterer makes sure the file exists
  configValidationLoop(require(configPath), validConfig, true);

  /** @type {import('../types/locals').EnvJSON} */
  const env = require('../env.json');
  configValidationLoop(env, validEnv);
  if (!(env.global.environment in env)) throw new Error('Error in env.json: Value in "environment" does not match any environment. Set "environment" to "main" if you don\'t know what you are doing.');

  try { void new ConnectionString(env[env.global.environment].dbConnectionStr); }
  catch (err) { throw new Error(`Error in env.json: Invalid mongoDB connection string: ${err.toString()}`); }
}

/** @type {import('.').configValidator.setDefaultConfig} */
function setDefaultConfig() {
  /** @type {Partial<Client['config']>} */
  let config;
  try { config = require(configPath); }
  catch (err) {
    if (err.code != 'MODULE_NOT_FOUND') throw err;
    log.warn('Missing config.json. This file is required to run the bot.');

    writeFileSync(configPath, '{}');
    config = {};

    log.warn('An empty config.json has been created.');
  }

  config.devIds = new Set(config.devIds);
  config.website ??= {};
  config.github ??= {};
  config.replyOnDisabledCommand ??= true;
  config.replyOnNonBetaCommand ??= true;
  config.ownerOnlyFolders = config.ownerOnlyFolders?.map(e => e.toLowerCase()) ?? ['owner-only'];

  return config;
}

module.exports = { configValidationLoop, validateConfig, setDefaultConfig, validConfig, validEnv };