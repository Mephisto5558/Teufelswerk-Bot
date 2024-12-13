import type DBStructure from './database';

type autocompleteOptions = string | number | { name: string; value: string };

interface Config {
  /** Will always include the bot's user id and the application owner id */
  devIds: Set<Snowflake>;
  website: {
    baseDomain?: string;
    domain?: string;
    port?: string;
    dashboard?: string;
    privacyPolicy?: string;
    invite?: string;
  };
  github: {
    repo?: string;
    userName?: string;
    repoName?: string;
  };

  /** @default ['owner-only'] */
  ownerOnlyFolders: string[];
  discordInvite?: string;
  mailAddress?: string;
  hideOverwriteWarning?: boolean;
  hideNonBetaCommandLog?: boolean;
  hideDisabledCommandLog?: boolean;

  /** @default true */
  replyOnDisabledCommand: boolean;

  /** @default true */
  replyOnNonBetaCommand: boolean;
  disableWebserver?: boolean;
  enableConsoleFix?: boolean;
}

interface Env {
  environment: EnvJSON['global']['environment'];
  keys: {
    humorAPIKey: string;
    rapidAPIKey: string;
    githubKey: string;
    chatGPTApiKey: string;
    dbdLicense: string;
    votingWebhookURL?: string;
  };
}

type EnvJSON = Record<'main' | 'dev', {
  dbConnectionStr: string;
  token: string;
  secret: string;
}> & {
  global: {
    environment: 'main' | 'dev';
    keys: {
      humorAPIKey: string;
      rapidAPIKey: string;
      githubKey: string;
      chatGPTApiKey: string;
      dbdLicense: string;
      votingWebhookURL?: string;
    };
  };
};

// @ts-expect-error 2681
type BoundFunction = new (this: Message, __dirname: string, __filename: string, module: NodeJS.Module, exports: NodeJS.Module['exports'], require: NodeJS.Require, lang: lang) => FunctionConstructor;

type FlattenedGuildSettings = DBStructure.FlattenObject<NonNullable<Database['guildSettings'][Snowflake]>>;
type FlattenedUserSettings = DBStructure.FlattenObject<NonNullable<Database['userSettings'][Snowflake]>>;