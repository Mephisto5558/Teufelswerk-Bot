import type {
  DMChannel, GuildChannel, GuildMember, Role, User, Collection, Guild, Snowflake,
  APIAllowedMentions, Message, BaseInteraction, MessageComponentInteraction,
  AutocompleteInteraction, CategoryChannel, GuildTextBasedChannel, GuildChannelManager,
  Webhook, VoiceState
} from 'discord.js';
import type { ExecOptions, PromiseWithChild } from 'node:child_process';
import type { GiveawaysManager, GiveawayData } from 'discord-giveaways';
import type { DB } from '@mephisto5558/mongoose-db';
import type I18nProvider from '@mephisto5558/i18n';
import type { Database, backupChannel, backupId } from '../types/database';

export {
  afk,
  autocompleteGenerator,
  BackupSystem,
  checkForErrors,
  checkTargetManageable,
  commandExecutionWrapper,
  componentHandler,
  configValidator,
  constants,
  cooldown as cooldowns,
  errorHandler,
  filename,
  findAllEntires,
  getAge,
  getCommands,
  getDirectories,
  getTargetChannel,
  getTargetMember,
  getTargetRole,
  gitpull,
  GiveawaysManagerWithOwnDatabase as GiveawaysManager,
  logSayCommandUse,
  permissionTranslator,
  shellExec,
  TTormatter as timeFormatter,
  timeValidator
};

export { default as DiscordAPIErrorCodes } from './DiscordAPIErrorCodes.json';
export { default as prototypeRegisterer } from './prototypeRegisterer';

declare namespace afk {
  const nicknamePrefix: string;
  const nicknameRegex: RegExp;

  function getAfkStatus(this: Interaction | Message, target: GuildMember | User, lang: lang): Promise<Message>;
  function listAfkStatuses(this: GuildInteraction | Message<true>, lang: lang): Promise<Message>;
  function setAfkStatus<T extends Interaction | Message | VoiceState>(
    this: T, lang: T extends VoiceState ? undefined : lang, global?: boolean, message?: string
  ): Promise<T extends VoiceState ? undefined : Message>;

  function removeAfkStatus(this: Message | VoiceState): Promise<Message | undefined>;
  function sendAfkMessages(this: Message): Promise<Message | undefined>;

  /**
   * @returns `undefined` if the bot cannot change the member's nickname or it already has the prefix. Otherwise `true` indicating success.
   * @default prefix='[AFK] '*/// eslint-disable-line jsdoc/informative-docs
  function setAfkPrefix(member: GuildMember, prefix?: string): Promise<true | undefined>;

  /**
   * @returns `undefined` if the bot cannot change the member's nickname or it doesn't have the prefix. Otherwise `true` indicating success.
   * @default prefix='[AFK] '*/// eslint-disable-line jsdoc/informative-docs
  function unsetAfkPrefix(member: GuildMember, prefix?: string): Promise<true | undefined>;
}

declare function autocompleteGenerator(
  this: AutocompleteInteraction | Message,
  command: SlashCommand<true> | PrefixCommand<true> | MixedCommand<true>, locale: string
): { name: string | number; value: string | number }[] | undefined;

type MaybeWithUndefined<X, T extends boolean> = T extends true ? X : X | undefined;
declare namespace BackupSystem {
  interface Options {
    dbName?: string;
    maxGuildBackups?: number;
    maxMessagesPerChannel?: number;
    saveImages?: boolean;
    clearGuildBeforeRestore?: boolean;
  }

  interface StatusObject {
    status?: string;
  }

  type Backup = Database['backups'][backupId];

  type Utils = {
    fetchToBase64<T extends string | undefined>(url?: T): Promise<T>;
    loadFromBase64<T extends string | undefined>(base64Str?: T): T extends undefined ? undefined : Buffer;

    fetchCategoryChildren(
      category: CategoryChannel, saveImages: boolean, maxMessagesPerChannel: number
    ): Promise<backupChannel[]>;

    fetchChannelMessages(
      channel: GuildTextBasedChannel, saveImages: boolean, maxMessagesPerChannel: number
    ): Promise<backupChannel['messages']>;

    fetchChannelPermissions(channel: GuildChannel): backupChannel['permissions'];

    fetchChannelThreads(
      channel: GuildChannel, saveImages: boolean, maxMessagesPerChannel: number
    ): Promise<backupChannel['threads']>;

    fetchMessageAttachments(message: Message, saveImages: boolean): Promise<backupChannel['messages'][number]['attachments']>;

    fetchTextChannelData(
      channel: GuildChannel, saveImages: boolean, maxMessagesPerChannel: number
    ): Promise<backupChannel>;

    loadChannel(
      channel: backupChannel, guild: Guild, category: string, maxMessagesPerChannel: number,
      allowedMentions: APIAllowedMentions
    ): ReturnType<GuildChannelManager['create']>;

    loadChannelMessages<T extends Webhook | undefined>(
      channel: GuildTextBasedChannel, messages: backupChannel['messages'], webhook: T,
      maxMessagesPerChannel: number, allowedMentions: APIAllowedMentions
    ): Promise<T extends Webhook ? T : undefined>;
  };

  /* eslint-disable-next-line @typescript-eslint/no-shadow -- false positive */
  class BackupSystem {
    constructor(db: DB, options?: Options);

    db: DB;
    dbName: Options['dbName'];
    defaultSettings: {
      maxGuildBackups: Required<Options['maxGuildBackups']>;
      maxMessagesPerChannel: number;
      saveImages: boolean;
      clearGuildBeforeRestore: boolean;
    };

    get(backupId: Snowflake, guildId?: Snowflake): Backup | undefined;

    list(guildId?: Snowflake): Collection<string, Backup>;

    remove(backupId: string): Promise<boolean>;

    create(guild: Guild, options?: {
      statusObj?: StatusObject;
      id?: backupId;
      save?: boolean;
      maxGuildBackups?: number;
      backupMembers?: boolean;
      maxMessagesPerChannel?: number;
      doNotBackup?: string[];
      saveImages?: boolean;
      metadata?: unknown;
    }): Promise<Backup>;

    /** @param id If falsely, will use latest.*/
    load(id: string | object | null, guild: Guild, options?: {
      statusObj?: StatusObject;
      clearGuildBeforeRestore?: boolean;
      maxMessagesPerChannel: number;
      allowedMentions?: APIAllowedMentions;
      reason?: string;
    }): Promise<void>;

    static readonly utils: Utils;
  }
}

/** @returns The error key and replacement values for `lang()` or `false` if no error. Returns `true` if error happend but has been handled internally.*/
declare function checkForErrors(
  this: BaseInteraction | Message,
  command: SlashCommand<boolean> | PrefixCommand<boolean> | MixedCommand<boolean> | undefined, lang: lang
): [string, Record<string, string> | string | undefined] | boolean;

/** @returns the error message id to use with i18n.*/
declare function checkTargetManageable(
  this: Interaction | Message,
  member: GuildMember
): string | undefined;

declare function commandExecutionWrapper(
  this: BaseInteraction | Message,
  command: SlashCommand<boolean> | PrefixCommand<boolean> | MixedCommand<boolean> | undefined, commandType: string, lang: lang
): Promise<Message | undefined>;

declare function componentHandler(
  this: MessageComponentInteraction,
  lang: lang
): Promise<unknown>;

declare function cooldown(
  this: BaseInteraction | Message,
  name: string, cooldowns?: Record<string, number>
): number;

declare function errorHandler(
  this: Client,
  err: Error, context?: unknown, lang?: lang
): Promise<void>;

declare function filename(path: string): string;

declare function findAllEntires(
  obj: Record<string, unknown>, key: string, entryList?: Record<string, unknown>
): Record<string, unknown>;

declare function getAge(date: Date): number;

declare function getCommands(
  this: Client,
  lang: langUNF
): {
  category: string;
  subTitle: '';
  aliasesDisabled: boolean;
  list: {
    commandName: string;
    commandUsage: string;
    commandDescription: string;
    commandAlias: string;
  }[];
}[];

declare function getDirectories(
  path: string
): Promise<string>;

/** @default targetOptionName = 'channel'*/
declare function getTargetChannel<I extends Interaction | Message, T extends boolean>(
  interaction: I,
  { targetOptionName, returnSelf }: { targetOptionName?: string; returnSelf?: T }
): I extends GuildInteraction | Message<true> ? MaybeWithUndefined<GuildChannel, T> : MaybeWithUndefined<DMChannel, T>;

/** @default targetOptionName = 'target'*/
declare function getTargetMember<I extends Interaction | Message, T extends boolean>(
  interaction: I,
  { targetOptionName, returnSelf }: { targetOptionName?: string; returnSelf?: T }
): I extends GuildInteraction | Message<true> ? MaybeWithUndefined<GuildMember, T> : MaybeWithUndefined<User, T>;

/** @default targetOptionName = 'target'*/
declare function getTargetRole<T extends boolean>(
  interaction: GuildInteraction | Message<true>,
  { targetOptionName, returnSelf }: { targetOptionName?: string; returnSelf?: T }
): MaybeWithUndefined<Role, T>;

declare function gitpull(): Promise<Error | 'OK'>;

declare type saveGiveawayMethod = (messageId: Snowflake, giveawayData: GiveawayData) => Promise<true>;
declare class GiveawaysManagerWithOwnDatabase extends GiveawaysManager {
  // @ts-expect-error discord-giveaways is not typed correctly in that case.
  protected getAllGiveaways(): GiveawayData[];

  protected saveGiveaway: saveGiveawayMethod;
  protected editGiveaway: saveGiveawayMethod;

  protected deleteGiveaway(
    messageId: Snowflake
  ): Promise<boolean>;
}

declare function logSayCommandUse(
  this: Message<true>,
  member: GuildMember, lang: lang
): Promise<Message<true> | undefined>;

declare function permissionTranslator<T extends string | string[]>(
  perms: T, locale: string | undefined, i18n: I18nProvider
): T;

declare function shellExec(
  command: string, options?: ExecOptions
): PromiseWithChild<{ stdout: string; stderr: string }>;

/** @param timeStr a time string, @example '3w2d', '5h' */
declare function timeValidator<T extends string | undefined>(
  timeStr?: T
): T extends undefined | '' | '-' | '+' ? [] : string[];

declare namespace configValidator {
  /** @throws {Error} on invalid key or subkey.*/
  function validateConfig(): void;
  function setDefaultConfig(): Partial<Client['config']>;

  /** @throws {Error} on invalid key or subkey type.*/
  function configValidationLoop(
    obj: Record<string, unknown>, checkObj: Record<string, unknown>, allowNull?: boolean
  ): void;

  type validConfigEntry = 'object' | 'string' | 'boolean' | 'number' | { [key: string]: validConfigEntry };
  const validConfig: Record<string, validConfigEntry>;
  const validEnv: Record<string, validConfigEntry>;
}

/** @returns `formatted` has the format `year-day, hour:minute:second` if `lang` is not provided.*/
declare namespace TTormatter {
  function timeFormatter<T extends lang | undefined>(
    options: { sec?: number; lang?: T }
  ): {
    total: number; negative: boolean;
    formatted: T extends undefined
      ? `${number}${number}${number}${number}-${number}${number}, ${number}${number}:${number}${number}:${number}${number}`
      : string;
  };

  const
    msInSecond: number, secsInMinute: number, minutesInHour: number, hoursInDay: number,
    daysInWeek: number, daysInMonthAvg: number, daysInMonthMax: number, daysInYear: number, monthsInYear: number,
    secsInHour: number, secsInDay: number, secsInWeek: number, secsInMonth: number, secsInYear: number;
}

declare namespace constants {
  /* eslint-disable custom/sonar-no-magic-numbers */
  const
    autocompleteOptionsMaxAmt = 25,
    embedTitleMaxLength = 256,
    embedDescriptionMaxLength = 4096,
    embedFieldMaxAmt = 25,
    embedFieldValueMaxLength = 1024,
    messageMaxLength = 2000,
    memberNameMinLength = 1,
    memberNameMaxLength = 32,
    choicesMaxAmt = 25,
    choiceNameMinLength = 1,
    choiceNameMaxLength = 100,
    choiceValueMaxLength = 100,
    buttonLabelMaxLength: 80,
    auditLogReasonMaxLength: 400,
    maxBanMessageDeleteDays: 7,
    snowflakeMinLength: 17,
    snowflakeMaxLength: 19,
    HTTP_STATUS_BLOCKED: 522,
    suffix = '...';
  /* eslint-enable custom/sonar-no-magic-numbers */
}