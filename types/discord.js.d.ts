import type Discord from 'discord.js';
import type DB from '@mephisto5558/mongoose-db';
import type { I18nProvider, Locale as LangLocaleCode } from '@mephisto5558/i18n';
import type { WebServer } from '@mephisto5558/bot-website';

import type { BackupSystem, GiveawaysManager } from '#Utils';
import type { runMessages as TRunMessages } from '#Utils/prototypeRegisterer';
import type locals from './locals';


declare module 'discord-api-types/v10' {
  // @ts-expect-error 2300 // overwriting Snowflake
  export type Snowflake = globalThis.Snowflake;
}

declare module 'discord.js' {
  interface Client<Ready> {
    commands: {
      slash: Discord.Collection<SlashCommand['name'], SlashCommand | MixedCommand>;
      prefix: Discord.Collection<PrefixCommand['name'], PrefixCommand | MixedCommand>;
    };
    backupSystem?: BackupSystem.BackupSystem;
    giveawaysManager?: GiveawaysManager;

    /** `undefined` if `this.botType == 'dev'` */
    webServer?: WebServer;
    cooldowns: Map<string, Record<string, Map<string, number>>>;
    db: DB;
    i18n: I18nProvider;
    settings: Database['botSettings'];
    defaultSettings: Database['botSettings']['defaultGuild'];
    botType: locals.Env['environment'];
    keys: locals.Env['keys'];

    /** The config from {@link ./config.json}. */
    config: locals.Config;
    loadEnvAndDB(this: Omit<Client<Ready>, 'db'>): Promise<void>;

    /** A promise that resolves to a fetched discord application once {@link https://discord.js.org/docs/packages/discord.js/14.14.1/Client:Class#ready Client#ready} was emitted. */
    awaitReady(this: Client<Ready>): Promise<ClientApplication>;
  }

  interface Message {

    /**
     * The original content of the message. This is a custom property set in 'prototypeRegisterer.js'.
     *
     * This property requires the GatewayIntentBits.MessageContent privileged intent
     * for guild messages that do not mention the client. */
    originalContent: string | null;

    /** The arguments of the message. It slices out the prefix and splits the message content on spaces. This is a custom property set in 'prototypeRegisterer.js'. */
    args: string[] | null;

    /** The first word of the {@link Message.originalContent original content}. `null` if the content is empty. This is a custom property set in 'prototypeRegisterer.js'. */
    commandName: string | null;

    /** Alias for {@link Message.author} */
    user: Message['author'];

    /** This does not exist on Messages and is only for better typing of {@link PrefixCommand} here */
    /* eslint-disable-next-line @typescript-eslint/no-invalid-void-type -- valid use case, as this property does not really exist */
    options: void;


    /**
     * A general reply function for messages and interactions. Will edit the message/interaction if possible, else reply to it,
     * and if that also doesn't work, send the message without repling to a specific message/interaction.
     *
     * Sends the content as a file if it is larger than the maximum allowed message length (2000).
     * If that is the case and the content is just one codeblock, it will strip the codeblock and send a file in the codeblock's language format.
     * @param deleteTime Number in Milliseconds */
    customReply(
      this: Message,
      options: string | MessagePayload | MessageEditOptions,
      deleteTime?: number,
      allowedMentions?: MessageMentionOptions | { repliedUser: false }
    ): Promise<Message>;

    runMessages: typeof TRunMessages;
  }

  interface PartialMessage {
    user: PartialMessage['author'];
  }

  interface BaseInteraction {

    /**
     * A general reply function for messages and interactions. Will edit the message/interaction if possible, else reply to it,
     * and if that also doesn't work, send the message without repling to a specific message/interaction.
     *
     * Sends the content as a file if it is larger than the maximum allowed message length (2000).
     * If that is the case and the content is just one codeblock, it will strip the codeblock and send a file in the codeblock's language format.
     * @param deleteTime Number in Milliseconds */
    customReply(
      this: BaseInteraction,
      options: string | MessagePayload | InteractionReplyOptions,
      deleteTime?: number,
      allowedMentions?: MessageMentionOptions | { repliedUser: false }
    ): Promise<Message>;
  }

  interface AutocompleteInteraction {

    /**
     * ```js
     * this.options.getFocused(true)
     * ``` */
    get focused(): AutocompleteFocusedOption;
  }

  interface User {

    /**
     * ```js
     * this.client.db.get('userSettings', this.id) ?? {}
     * ``` */
    get db(): NonNullable<Database['userSettings'][Snowflake]>;

    /**
     * ```js
     * return this.client.db.update('userSettings', `${this.id}.${key}`, value);
     * ``` */
    updateDB<FDB extends locals.FlattenedUserSettings, K extends keyof FDB & string>(this: User, key: K, value: FDB[K]): Promise<NonNullable<Database['userSettings']>>;

    customName: string;
    customTag: string;
  }

  interface GuildMember {

    /** Searches the guildSettings DB recursively for all data of this member across all guilds. */
    get db(): Record<string, unknown> | undefined;
    customName: string;
    customTag: string;
  }

  interface Guild {

    /**
     * ```js
     * this.client.db.get('guildSettings', this.id) ?? {}
     * ``` */
    get db(): NonNullable<Database['guildSettings'][Snowflake]>;

    /**
     * ```js
     * return this.client.db.update('guildSettings', `${this.id}.${key}`, value);
     * ``` */
    updateDB<FDB extends locals.FlattenedGuildSettings, K extends keyof FDB>(this: Guild, key: K, value: FDB[K]): Promise<Database['guildSettings']>;
    updateDB(this: Guild, key: null, value: NonNullable<Database['guildSettings'][Snowflake]>): Promise<Database['guildSettings']>;

    localeCode: LangLocaleCode;
  }
}