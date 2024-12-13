/**
 * @typedef {NonNullable<NonNullable<Database['guildSettings'][Snowflake]>['triggers']>}triggers
 * @typedef {[keyof triggers, NonNullable<triggers[keyof triggers]>]}triggersArray *//* eslint-disable-line jsdoc/valid-types -- false positive */

/**
 * @param {string}query
 * @param {triggers}data
 * @returns {keyof triggers | undefined}*/
const findTriggerId = (query, data) => query in data
  ? query
  : Object.entries(data).find((/** @type {triggersArray} */[, { trigger }]) => trigger.toLowerCase() == query.toLowerCase())?.[0];

const
  { EmbedBuilder, Colors, codeBlock, inlineCode } = require('discord.js'),
  { embedMaxFieldAmt, suffix } = require('#Utils').constants,

  /** @type {Record<string, (this: GuildInteraction, lang: lang, oldData: triggers, query: string) => Promise<Message>>} */
  triggerMainFunctions = {
    async add(lang, oldData) {
      const
        id = Math.max(...Object.keys(oldData).map(Number), 0) || 0 + 1,
        data = {
          trigger: this.options.getString('trigger', true),
          response: this.options.getString('response', true).replaceAll('/n', '\n'),
          wildcard: !!this.options.getBoolean('wildcard')
        };

      await this.guild.updateDB(`triggers.${id}`, data);
      return this.editReply(lang('saved', inlineCode(data.trigger)));
    },

    async edit(lang, oldData, query) {
      if (!oldData.__count__) return this.editReply(lang('noneFound'));

      const
        id = findTriggerId(query, oldData),
        /** @type {triggersArray[1]} */ { trigger, response, wildcard } = query ? oldData[id] : undefined;

      if (!trigger) return this.editReply(lang('notFound'));

      const data = {
        trigger: this.options.getString('trigger') ?? trigger,
        response: this.options.getString('response')?.replaceAll('/n', '\n') ?? response,
        wildcard: this.options.getBoolean('wildcard') ?? wildcard
      };

      await this.guild.updateDB(`triggers.${id}`, data);
      return this.editReply(lang('edited', inlineCode(data.trigger)));
    },

    async delete(lang, oldData, query) {
      const id = query ? Number(findTriggerId(query, oldData) ?? -1) : Math.max(...Object.keys(oldData).map(Number));
      if (id < 0) return this.editReply(lang('noneFound'));

      await this.client.db.delete('guildSettings', `${this.guild.id}.triggers.${id}`);
      return this.editReply(lang('deletedOne', inlineCode(id)));
    },

    async clear(lang, oldData) {
      if (this.options.getString('confirmation', true).toLowerCase() != lang('confirmation')) return this.editReply(lang('needConfirm'));
      if (!oldData.__count__) return this.editReply(lang('noneFound'));

      await this.client.db.delete('guildSettings', `${this.guild.id}.triggers`);
      return this.editReply(lang('deletedAll', inlineCode(oldData.__count__)));
    },

    async get(lang, oldData, query) {
      if (!oldData.__count__) return this.editReply(lang('noneFound'));

      const embed = new EmbedBuilder({ title: lang('embedTitle'), color: Colors.Blue });

      if (query) {
        /** @type {triggersArray} */
        const [id, { trigger, response, wildcard }] = oldData[findTriggerId(query, oldData)] ?? {};
        if (!trigger) return this.editReply(lang('notFound'));

        const maxLength = 1900;
        embed.data.title = lang('embedTitleOne', id);
        embed.data.description = lang('embedDescriptionOne', {
          trigger: codeBlock(trigger.length < maxLength ? trigger : trigger.slice(0, maxLength - suffix.length) + suffix),
          response: codeBlock(response.length < maxLength ? response : response.slice(0, maxLength - suffix.length) + suffix),
          wildcard: inlineCode(wildcard)
        });
      }
      else if (this.options.getBoolean('short')) {
        const maxLength = 200;

        embed.data.description = oldData.__count__ > embedMaxFieldAmt ? lang('first25') : ' ';
        embed.data.fields = Object.entries(oldData).slice(0, embedMaxFieldAmt + 1).map((/** @type {triggersArray} */[id, { trigger, response, wildcard }]) => ({
          name: lang('shortFieldName', id), inline: true,
          value: lang('shortFieldValue', {
            trigger: codeBlock(trigger.length < maxLength ? trigger : trigger.slice(0, maxLength - suffix.length) + suffix),
            response: codeBlock(response.length < maxLength ? response : response.slice(0, maxLength - suffix.length) + suffix),
            wildcard: inlineCode(wildcard)
          })
        }));
      }
      else {
        const
          maxDescriptionLength = 3800,
          maxLength = 20;

        embed.data.description = Object.entries(oldData).reduce((acc, /** @type {triggersArray} */[id, { trigger, response, wildcard }]) => acc.length >= maxDescriptionLength
          ? acc
          : acc + lang('longEmbedDescription', {
            id, wildcard: inlineCode(wildcard),
            trigger: inlineCode(trigger.length < maxLength ? trigger : trigger.slice(0, maxLength - suffix.length) + suffix),
            response: inlineCode(response.length < maxLength ? response : response.slice(0, maxLength - suffix.length) + suffix)
          }), '');
      }

      return this.editReply({ embeds: [embed] });
    }
  };

/**
 * @this {import('discord.js').AutocompleteInteraction}
 * @returns {string[]} */
function triggerQuery() {
  return Object.entries(this.guild.db.triggers ?? {}).reduce((acc, [k, v]) => {
    acc[0].push(v.trigger);
    acc[1].push(k);

    return acc;
  }, [[], []]).flat();
}

module.exports = new SlashCommand({
  permissions: { user: ['ManageMessages'] },
  options: [
    new CommandOption({
      name: 'add',
      type: 'Subcommand',
      options: [
        new CommandOption({
          name: 'trigger',
          type: 'String',
          required: true
        }),
        new CommandOption({
          name: 'response',
          type: 'String',
          required: true
        }),
        new CommandOption({ name: 'wildcard', type: 'Boolean' })
      ]
    }),
    new CommandOption({
      name: 'edit',
      type: 'Subcommand',
      options: [
        new CommandOption({
          name: 'query_or_id',
          type: 'String',
          autocompleteOptions: triggerQuery
        }),
        new CommandOption({ name: 'trigger', type: 'String' }),
        new CommandOption({ name: 'response', type: 'String' }),
        new CommandOption({ name: 'wildcard', type: 'Boolean' })
      ]
    }),
    new CommandOption({
      name: 'delete',
      type: 'Subcommand',
      options: [new CommandOption({
        name: 'query_or_id',
        type: 'String',
        autocompleteOptions: triggerQuery
      })]
    }),
    new CommandOption({
      name: 'clear',
      type: 'Subcommand',
      options: [new CommandOption({
        name: 'confirmation',
        type: 'String',
        required: true
      })]
    }),
    new CommandOption({
      name: 'get',
      type: 'Subcommand',
      options: [
        new CommandOption({
          name: 'query_or_id',
          type: 'String',
          autocompleteOptions: triggerQuery
        }),
        new CommandOption({ name: 'short', type: 'Boolean' })
      ]
    })
  ],

  run(lang) {
    const
      oldData = this.guild.db.triggers ?? [],
      query = this.options.getString('query_or_id')?.toLowerCase();

    return triggerMainFunctions[this.options.getSubcommand()].call(this, lang, oldData, query);
  }
});