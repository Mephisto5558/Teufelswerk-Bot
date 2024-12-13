const
  { Constants, PermissionFlagsBits, ButtonBuilder, ButtonStyle, ActionRowBuilder, roleMention, userMention } = require('discord.js'),
  { getMilliseconds } = require('better-ms'),
  { timeValidator, timeFormatter: { msInSecond } } = require('#Utils'),

  /**
   * @typedef {{ bonusEntries?: Record<string, string>[], requiredRoles?: string[], disallowedMembers?: string[], duration?: number, giveawayId?: string }}options
   * @type {Record<string, (this: GuildInteraction, lang: lang, components: ActionRowBuilder<ButtonBuilder>[], options: options) => Promise<Message>>} */
  giveawayMainFunctions = {
    async create(lang, components, { bonusEntries, requiredRoles, disallowedMembers, duration }) {
      const
        defaultSettings = this.client.defaultSettings.giveaway,
        reaction = this.options.getString('reaction') ?? this.guild.db.giveaway?.reaction ?? defaultSettings.reaction,
        startOptions = {
          reaction, duration,
          winnerCount: this.options.getInteger('winner_count', true),
          prize: this.options.getString('prize', true),
          hostedBy: this.user,
          botsCanWin: false,
          bonusEntries: { bonus: member => bonusEntries[member.id] },
          embedColor: Number.parseInt(this.options.getString('embed_color')?.slice(1) ?? 0, 16) || (this.guild.db.giveaway?.embedColor ?? defaultSettings.embedColor),
          embedColorEnd: Number.parseInt(this.options.getString('embed_color_end')?.slice(1) ?? 0, 16) || (this.guild.db.giveaway?.embedColorEnd ?? defaultSettings.embedColorEnd),
          messages: {
            giveaway: lang('newGiveaway'),
            giveawayEnded: lang('giveawayEnded'),
            inviteToParticipate:
              `${this.options.getString('description', true)}\n\n`
              + (requiredRoles?.length > 0 ? lang('requiredRoles', `${requiredRoles.map(roleMention).join(', ')}\n`) : '')
              + (disallowedMembers?.length > 0 ? lang('disallowedMembers', `${disallowedMembers.map(userMention).join(', ')}\n`) : '')
              + lang('inviteToParticipate', reaction),
            winMessage: { content: lang('winMessage'), components },
            drawing: lang('drawing'),
            dropMessage: lang('dropMessage', reaction),
            embedFooter: lang('embedFooterText'),
            noWinner: lang('noWinner'),
            winners: lang('winners'),
            endedAt: lang('endedAt'),
            hostedBy: lang('hostedBy')
          },
          thumbnail: this.options.getString('thumbnail'),
          image: this.options.getString('image'),
          lastChance: this.guild.db.giveaway?.useLastChance,
          isDrop: this.options.getBoolean('is_drop')
        };

      if (requiredRoles?.length > 0 || disallowedMembers.length > 0)

        /** @param {import('discord.js').GuildMember}member */
        startOptions.exemptMembers = member => !(member.roles.cache.some(e => requiredRoles?.includes(e.id)) && !disallowedMembers.includes(member.id));

      await this.client.giveawaysManager.start(this.options.getChannel('channel') ?? this.channel, startOptions).then(data => {
        components[0].components[0].data.url = data.messageURL; // Using .then() here to prevent eslint/require-atomic-updates
      });

      return this.editReply({ content: lang('started'), components });
    },

    async end(lang, components, { giveawayId }) {
      const data = await this.client.giveawaysManager.end(giveawayId);
      components[0].components[0].data.url = data.messageURL;

      return this.editReply({ content: lang('ended'), components });
    },

    async edit(lang, components, { bonusEntries, requiredRoles, disallowedMembers, duration, giveawayId }) {
      const editOptions = {
        addTime: duration,
        newBonusEntries: {},
        newWinnerCount: this.options.getInteger('winner_count'),
        newPrize: this.options.getString('prize'),
        newThumbnail: this.options.getString('thumbnail'),
        newImage: this.options.getString('image')
      };

      if (requiredRoles?.length > 0 || disallowedMembers.length > 0) {
      /** @param {import('discord.js').GuildMember}member */
        editOptions.newExemptMembers = member => !(member.roles.cache.some(e => requiredRoles?.includes(e.id)) && !disallowedMembers.includes(member.id));
      }
      if (bonusEntries?.length > 0) editOptions.newBonusEntries.bonus = member => bonusEntries[member.id];

      const data = await this.client.giveawaysManager.edit(giveawayId, editOptions);
      components[0].components[0].data.url = data.messageURL;

      return this.editReply({ content: lang('edited'), components });
    },

    async reroll(lang, components, { giveawayId }) {
      const rerollOptions = {
        messages: {
          congrat: { content: lang('rerollWinners'), components },
          error: { content: lang('rerollNoWinner'), components }
        }
      };

      await this.client.giveawaysManager.reroll(giveawayId, rerollOptions).then(() => {
        components[0].components[0].data.url = giveawayId; // Using .then() here to prevent eslint/require-atomic-updates
      });

      return this.editReply({ content: lang('rerolled'), components });
    }
  };

module.exports = new SlashCommand({
  permissions: { user: ['ManageMessages'] },
  cooldowns: { user: msInSecond },
  ephemeralDefer: true,
  options: [
    new CommandOption({
      name: 'create',
      type: 'Subcommand',
      options: [
        new CommandOption({
          name: 'prize',
          type: 'String',
          required: true
        }),
        new CommandOption({
          name: 'description',
          type: 'String',
          required: true
        }),
        new CommandOption({
          name: 'duration',
          type: 'String',
          required: true,
          autocompleteOptions() { return timeValidator(this.focused.value); }
        }),
        new CommandOption({
          name: 'winner_count',
          type: 'Integer',
          required: true,
          minValue: 1
        }),
        new CommandOption({
          name: 'channel',
          type: 'Channel',
          channelTypes: Constants.GuildTextBasedChannelTypes
        }),
        new CommandOption({ name: 'reaction', type: 'String' }),
        new CommandOption({ name: 'thumbnail', type: 'String' }),
        new CommandOption({ name: 'image', type: 'String' }),
        new CommandOption({ name: 'exempt_members', type: 'String' }),
        new CommandOption({ name: 'required_roles', type: 'String' }),
        new CommandOption({ name: 'bonus_entries', type: 'String' }),
        new CommandOption({ name: 'embed_color', type: 'String' }),
        new CommandOption({ name: 'embed_color_end', type: 'String' })
      ]
    }),
    new CommandOption({
      name: 'end',
      type: 'Subcommand',
      options: [new CommandOption({
        name: 'id',
        type: 'String',
        required: true
      })]
    }),
    new CommandOption({
      name: 'edit',
      type: 'Subcommand',
      options: [
        new CommandOption({
          name: 'id',
          type: 'String',
          required: true
        }),
        new CommandOption({
          name: 'add_time',
          type: 'String',
          autocompleteOptions() { return timeValidator(this.focused.value); },
          strictAutocomplete: true
        }),
        new CommandOption({
          name: 'winner_count',
          type: 'Integer',
          minValue: 1
        }),
        new CommandOption({ name: 'prize', type: 'String' }),
        new CommandOption({ name: 'thumbnail', type: 'String' }),
        new CommandOption({ name: 'image', type: 'String' }),
        new CommandOption({ name: 'exempt_members', type: 'String' }),
        new CommandOption({ name: 'required_roles', type: 'String' }),
        new CommandOption({ name: 'bonus_entries', type: 'String' })
      ]
    }),
    new CommandOption({
      name: 'reroll',
      type: 'Subcommand',
      options: [new CommandOption({
        name: 'id',
        type: 'String',
        required: true
      })]
    })
  ],

  async run(lang) {
    if (!this.client.giveawaysManager) return this.editReply(lang('managerNotFound'));

    const giveawayId = this.options.getString('id');
    let giveaway;

    if (giveawayId) {
      giveaway = this.client.giveawaysManager.giveaways.find(e => e.guildId == this.guild.id && e.messageId == giveawayId);

      if (!giveaway || giveaway.ended && ['edit', 'end'].includes(this.options.getSubcommand())) return this.editReply(lang('notFound'));
      if (giveaway.hostedBy.id != this.user.id && !this.member.permissions.has(PermissionFlagsBits.Administrator))
        return this.editReply(lang('notHost'));
    }

    const
      bonusEntries = this.options.getString('bonus_entries')?.split(' ').map(e => ({ [e.split(':')[0].replaceAll(/\D/g, '')]: e.split(':')[1] })),
      requiredRoles = this.options.getString('required_roles')?.replace(/\D/g, '').split(' '),
      disallowedMembers = this.options.getString('exempt_member')?.replace(/\D/g, '').split(' '),
      components = [new ActionRowBuilder({
        components: [new ButtonBuilder({
          label: lang('buttonLabel'),
          url: '{this.messageURL}', // intentional
          style: ButtonStyle.Link
        })]
      })],
      durationUnformatted = this.options.getString('duration') ?? this.options.getString('add_time');

    if (!durationUnformatted) return this.editReply(lang('invalidTime'));

    const duration = getMilliseconds(durationUnformatted);
    if (duration == undefined) return this.editReply(lang('invalidTime'));

    return giveawayMainFunctions[this.options.getSubcommand()].call(this, lang, components, { bonusEntries, requiredRoles, disallowedMembers, duration, giveawayId });
  }
});