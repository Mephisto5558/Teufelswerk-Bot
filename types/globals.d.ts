/* eslint-disable sonarjs/no-built-in-override */

import type Discord from 'discord.js';
import type DiscordTicTacToe from 'discord-tictactoe';
import type { I18nProvider } from '@mephisto5558/i18n';

import type Command from '@mephisto5558/command';
import type DBStructure from './database';

type ISODate = `${number}${number}${number}${number}-${number}${number}-${number}${number}`;
type ISOTime = `${number}${number}:${number}${number}:${number}${number}.${number}${number}${number}`;
type ISODateTime = `${ISODate}T${ISOTime}Z`;

// #region global
declare global {
  // #region Buildins
  namespace NodeJS {
    interface Process {

      /** The real process uptime. This property only exists if process args include uptime=... */
      childUptime?(): number;

      /**
       * If `process.childUptime` exists (process args includes uptime=...), this is
       *
       * `process.childUptime() + parentUptime`
       *
       * Otherwise it is the default `process.uptime()` */
      uptime(): number;
    }
  }

  interface Array<T> {

    /**
     * Gets a random array element by generating a cryptographically secure random number using {@link https://nodejs.org/api/crypto.html node:crypto}.
     * May return undefined if the array is empty. */
    random(this: T[]): T | undefined;

    /** Returns an array with no duplicates by converting it to a `Set` and back to an array. */
    unique(this: T[]): T[];
  }

  interface Number {
    limit(options?: { min?: number; max?: number }): number;

    /** @returns If the number is more than `min` and less than `max`. */
    inRange(options: { min?: number; max?: number }): boolean;
    inRange(min?: number, max?: number): boolean;
  }

  interface BigInt {

    toString(radix?: 10): `${bigint}`;
  }

  interface Object {
    /** Removes `null`, `undefined`, empty arrays and empty objects recursively. */
    filterEmpty(this: object): object;

    /** The amount of items in the object. */
    __count__: number;
  }

  interface Function {
    // Only typing | Fixes return types | https://github.com/microsoft/TypeScript/blob/c790dc1dc7ff67e619a5a60fc109b7548f171322/src/lib/es5.d.ts#L313

    /**
     * Calls the function with the specified object as the this value and the elements of specified array as the arguments.
     * @param thisArg The object to be used as the this object.
     */
    apply<T, R>(this: (this: T) => R, thisArg: T): R;

    /**
     * Calls the function with the specified object as the this value and the elements of specified array as the arguments.
     * @param thisArg The object to be used as the this object.
     * @param args An array of argument values to be passed to the function.
     */
    apply<T, AX, R>(this: (this: T, ...args: AX[]) => R, thisArg: T, args: AX[]): R;

    /**
     * Calls the function with the specified object as the this value and the specified rest arguments as the arguments.
     * @param thisArg The object to be used as the this object.
     * @param args Argument values to be passed to the function.
     */
    call<T, AX, R>(this: (this: T, ...args: AX[]) => R, thisArg: T, ...args: AX[]): R;

    /**
     * Calls the function with the specified object as the this value and the specified rest arguments as the arguments.
     * @param thisArg The object to be used as the this object.
     * @param args Argument values to be passed to the function.
     */
    call<T, AX>(this: new (...args: AX[]) => T, thisArg: T, ...args: AX[]): void;

    /**
     * For a given function, creates a bound function that has the same body as the original function.
     * The this object of the bound function is associated with the specified object, and has the specified initial parameters.
     * @param thisArg The object to be used as the this object. */
    bind<T>(this: T, thisArg: ThisParameterType<T>): OmitThisParameter<T>;
    bind<T, AX, R>(this: (this: T, ...args: AX[]) => R, thisArg: T, ...args: AX[]): (...args: AX[]) => R;

    /** A wrapper for {@link Function.prototype.bind}. @see {@link bBoundFunction} */
    bBind<T extends GenericFunction>(this: T, thisArg: ThisParameterType<T>): bBoundFunction<T>;
    bBind<T, AX, R>(this: (this: T, ...args: AX[]) => R, thisArg: T, ...args: AX[]): bBoundFunction<(this: T, ...args: AX[]) => R>;
  }

  interface Date {
    /**
     * Give a more precise return type to the method `toISOString()`:
     * https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/toISOString     */
    toISOString(): ISODateTime;
  }

  // #endregion

  // #region custom
  const sleep: (ms: number) => Promise<void>;

  /** Custom logging, including logfiles. */
  const log: {
    (...args: Parameters<Console['log']>): typeof log;
    log(...args: Parameters<Console['log']>): typeof log;
    warn(...args: Parameters<Console['warn']>): typeof log;
    error(...args: Parameters<Console['error']>): typeof log;
    debug(...args: Parameters<Console['debug']>): typeof log;
    _log({ file, type }?: { file?: string; type?: string }, ...args: Parameters<Console['log']>): typeof log;
  };

  /** Get an application Emoji's mention by it's name. */
  const getEmoji: (emoji: string) => `<a:${string}:${Snowflake}>` | `<${string}:${Snowflake}>` | undefined;

  type Snowflake = `${bigint}`;

  type Database = DBStructure.Database;

  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  type GenericFunction = (...args: any) => any;


  type SlashCommand<canBeDM extends boolean = false> = Command.SlashCommand<canBeDM>;
  const SlashCommand: typeof Command.SlashCommand;

  type PrefixCommand<canBeDM extends boolean = false> = Command.PrefixCommand<canBeDM>;
  const PrefixCommand: typeof Command.PrefixCommand;

  type MixedCommand<canBeDM extends boolean = false> = Command.MixedCommand<canBeDM>;
  const MixedCommand: typeof Command.MixedCommand;

  type CommandOption<T_name extends Lowercase<string>> = Command.CommandOption<T_name>;
  const CommandOption: typeof Command.CommandOption;


  type langBoundArgs = [ { locale?: string; errorNotFound?: boolean; undefinedNotFound?: boolean; backupPath?: string } ];

  /** {@link Function.prototype.bBind bBind}ed {@link I18nProvider.__} function */
  type lang = bBoundFunction<I18nProvider['__'], (this: I18nProvider, key: string, replacements?: string | object) => string> & { __boundArgs__: langBoundArgs };

  /** same as {@link lang}, but may return `undefined` due to undefinedNotFound being true on the {@link I18nProvider.__ original function}. */
  type langUNF = bBoundFunction<I18nProvider['__'], (this: I18nProvider, key: string, replacements?: string | object) => string | undefined> & { __boundArgs__: langBoundArgs };

  // #endregion

  type bBoundFunction<OF extends GenericFunction, T extends GenericFunction = OF> = T & {
    /** The original, unbound function */
    __targetFunction__: OF;

    /** The context to which the function is bound */
    __boundThis__: ThisParameterType<T>;

    /** The arguments to which the function is bound */
    __boundArgs__: Parameters<T> ;
  };

  // #region discord.js globals
  type Client<Ready extends boolean = true> = Discord.Client<Ready>;
  type Message<inGuild extends boolean = boolean> = Discord.Message<inGuild>;
  type Interaction<inGuild extends boolean = boolean> = inGuild extends true
    ? GuildInteraction : GuildInteraction | DMInteraction;

  // @ts-expect-error // inGuild needs to be overwritten otherwise typeguarding doesn't work.
  interface PartialGuildMessage extends Discord.Partialize<Message<true>, 'type' | 'system' | 'pinned' | 'tts', 'content' | 'cleanContent' | 'author' | 'user'> {
    inGuild(): this is PartialMessage<true>;
  }

  type PartialMessage<inGuild extends boolean = boolean> = inGuild extends true ? PartialGuildMessage : Discord.PartialMessage;

  // used to not get `any` on Message property when the object is Message | Interaction
  type OptionalInteractionProperties<inGuild extends boolean = boolean> = Partial<Interaction<inGuild>>;
  type OptionalMessageProperties<inGuild extends boolean = boolean> = Partial<Message<inGuild>>;

  /** interface for an interaction in a guild. */
  // @ts-expect-error not important due to this being like a type
  interface GuildInteraction extends Discord.ChatInputCommandInteraction<'cached'>, OptionalMessageProperties<true> {
  }

  /** interface for an interaction in a direct message. */
  // @ts-expect-error not important due to this being like a type
  interface DMInteraction extends Discord.ChatInputCommandInteraction<undefined>, OptionalMessageProperties<false> {
    inGuild(): false;
    inRawGuild(): false;
    inCachedGuild(): false;
    guild: null;
    guildId: null;
    guildLocale: null;
    commandGuildId: null;
    member: null;
    memberPermissions: null;
  }

  // #endregion
}

// #endregion

// @ts-expect-error // keeping this here for documentation reasons, even tho it doesn't do anything sadly
declare module 'discord-tictactoe' {
  class TicTacToe {
    playAgain(interaction: Discord.ChatInputCommandInteraction): Promise<void>;
  }

  interface GameBoardButtonBuilder {

    /** Overwrite to make empty spaces look empty by using a zero width space. */
    createButton(row: number, col: number): Discord.ButtonBuilder;
  }
}

export declare class TicTacToe extends DiscordTicTacToe {
  playAgain(interaction: Discord.ChatInputCommandInteraction): Promise<void>;
}

// #region mongoose-db
declare module '@mephisto5558/mongoose-db' {
  interface NoCacheDB {
    /**
     * generates required database entries from {@link ./Templates/db_collections.json}.
     * @param overwrite overwrite existing collection, default: `false` */
    generate(overwrite?: boolean): Promise<void>;

    get<DBK extends keyof Database>(db: DBK): Promise<Database[DBK]>;
    get<DBK extends keyof Database, K extends keyof DBStructure.FlattenedDatabase[DBK]>(db: DBK, key: K): Promise<DBStructure.FlattenedDatabase[DBK][K]>;

    update<DBK extends keyof Database, FDB extends DBStructure.FlattenedDatabase[DBK], K extends keyof FDB>(db: DBK, key: K, value: FDB[K]): Promise<Database[DBK]>;
    set<DBK extends keyof Database, FDB extends DBStructure.FlattenedDatabase[DBK]>(db: DBK, value: FDB[keyof FDB], overwrite?: boolean): Promise<Database[DBK]>;
    delete<DBK extends keyof Database>(db: DBK, key?: keyof DBStructure.FlattenedDatabase[DBK]): Promise<boolean>;
    push<DBK extends keyof Database, FDB extends DBStructure.FlattenedDatabase[DBK], K extends keyof FDB>(db: DBK, key: K, ...value: FDB[K][]): Promise<Database[DBK]>;
    pushToSet<DBK extends keyof Database, FDB extends DBStructure.FlattenedDatabase[DBK], K extends keyof FDB>(db: DBK, key: K, ...value: FDB[K][]): Promise<Database[DBK]>;
  }

  // @ts-expect-error 2300 // overwriting the class so ofc it is declared twice
  interface DB extends NoCacheDB {
    get(): undefined;
    get<DBK extends keyof Database>(this: DB, db: DBK): Database[DBK];
    get<DBK extends keyof Database, K extends keyof DBStructure.FlattenedDatabase[DBK]>(this: DB, db: DBK, key: K): DBStructure.FlattenedDatabase[DBK][K];

    update<DBK extends keyof Database, FDB extends DBStructure.FlattenedDatabase[DBK], K extends keyof FDB>(this: DB, db: DBK, key: K, value: FDB[K]): Promise<Database[DBK]>;
    set<DBK extends keyof Database, FDB extends DBStructure.FlattenedDatabase[DBK]>(this: DB, db: DBK, value: FDB[keyof FDB], overwrite?: boolean): Promise<Database[DBK]>;
    delete<DBK extends keyof Database>(this: DB, db: DBK, key?: keyof DBStructure.FlattenedDatabase[DBK]): Promise<boolean>;
    push<DBK extends keyof Database, FDB extends DBStructure.FlattenedDatabase[DBK], K extends keyof FDB>(this: DB, db: DBK, key: K, ...value: FDB[K][]): Promise<Database[DBK]>;
    pushToSet<DBK extends keyof Database, FDB extends DBStructure.FlattenedDatabase[DBK], K extends keyof FDB>(this: DB, db: DBK, key: K, ...value: FDB[K][]): Promise<Database[DBK]>;
  }
}

// #endregion

declare module 'wikijs' {
  // intentional. `Page` in wikijs is defined as something that is not correct. All `Page`es are `RawPages` in code
  /* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
  interface Page extends RawPage {}
}