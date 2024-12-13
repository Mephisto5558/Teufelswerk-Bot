/** @typedef {import('../../types/database').backupId}backupId */

const
  { EmbedBuilder, Colors, ActionRowBuilder, PermissionFlagsBits, ButtonBuilder, ButtonStyle, inlineCode } = require('discord.js'),
  { timeFormatter: { msInSecond, secsInMinute, timestamp }, commandMention } = require('#Utils'),
  { serverbackup_hasPerm: hasPerm, serverbackup_createProxy: createProxy } = require('#Utils/componentHandler'),
  BYTES_IN_KILOBITE = 1024;

/** @param {Database['backups'][backupId]}backup */
function getData(backup) {
  if (backup.__count__) {
    return {
      createdAt: timestamp(backup.createdAt),
      size: (() => {
        const size = Buffer.byteLength(JSON.stringify(backup));
        return size > BYTES_IN_KILOBITE ? `${(size / BYTES_IN_KILOBITE).toFixed(2)}KB` : `${size}B`;
      })(),
      members: backup.members?.length ?? 0,
      channels: (backup.channels.categories.length + backup.channels.others.length + backup.channels.categories.reduce((acc, e) => acc + e.children.length, 0)) || 0,
      roles: backup.roles.length,
      emojis: backup.emojis.length,
      stickers: backup.stickers.length
    };
  }
}

/** @type {Record<string, (this: GuildInteraction, lang: lang, embed: EmbedBuilder, id?: backupId) => Promise<Message>>} */
const backupMainFunctions = {
  create: async function createBackup(lang, embed) {
    embed.data.color = Colors.White;

    const
      statusObj = createProxy(this, embed, lang, getEmoji('loading')),
      backup = await this.client.backupSystem.create(this.guild, {
        save: true, saveImages: true, backupMembers: true,
        metadata: [
          this.user.id, this.guild.ownerId, [this.user.id, this.guild.ownerId],
          [...this.guild.members.cache.filter(e => e.permissions.has(PermissionFlagsBits.Administrator)).keys()]
        ], statusObj
      });

    return this.editReply({ embeds: [embed.setDescription(lang('create.success', { id: inlineCode(backup.id), cmd: commandMention(this.commandName, this.commandId) }))] });
  },

  load: async function loadBackup(lang, embed, id) {
    if (!this.client.backupSystem.get(id)) return this.editReply({ embeds: [embed.setDescription(lang('load.noneFound'))] });
    if (!hasPerm.call(this, this.client.backupSystem.get(id))) return this.editReply({ embeds: [embed.setDescription(lang('load.noPerm'))] });

    const component = new ActionRowBuilder({
      components: [
        new ButtonBuilder({
          label: lang('global.true'),
          customId: `serverbackup.load.${id}.start.${!this.options.getBoolean('no_clear')}`,
          style: ButtonStyle.Danger
        }),
        new ButtonBuilder({
          label: lang('global.false'),
          customId: `serverbackup.load.${id}.cancel`,
          style: ButtonStyle.Success
        })
      ]
    });

    return this.editReply({ embeds: [embed.setColor(Colors.DarkRed).setDescription(lang('load.overwriteWarningDescription'))], components: [component] });
  },

  delete: async function deleteBackup(lang, embed, id) {
    if (this.user.id != this.guild.ownerId || !hasPerm.call(this, this.client.backupSystem.get(id)))
      return this.editReply({ embeds: [embed.setColor(Colors.Red).setDescription(lang('delete.noPerm'))] });

    await this.client.backupSystem.remove(id);
    return this.editReply({ embeds: [embed.setDescription(lang('delete.success'))] });
  },

  get: function getBackup(lang, embed, id) {
    embed.setColor(Colors.White).setThumbnail(this.guild.iconURL());

    if (id) {
      const backup = this.client.backupSystem.get(id);
      return void this.editReply({
        embeds: [backup
          ? embed.setDescription(lang('get.oneEmbedDescription', { id: inlineCode(id), ...getData(backup) }))
          : embed.setColor(Colors.Red).setDescription(lang('get.oneNotFound'))]
      });
    }

    embed.data.fields = this.client.backupSystem.list(this.guild.id).sort((a, b) => b.createdAt - a.createdAt)
      .first(10)
      .map(e => ({ name: e.id, value: lang('get.infos', getData(e)) }));

    if (embed.data.fields.length) embed.data.footer = { text: lang('get.found', this.client.backupSystem.list(this.guild.id).size) };
    return void this.editReply({ embeds: [embed.setDescription(lang(embed.data.fields.length ? 'get.embedDescription' : 'get.noneFound'))] });
  }
};

module.exports = new SlashCommand({
  permissions: { client: ['Administrator'], user: ['Administrator'] },
  disabled: true,
  disabledReason: 'This command is still in development',
  options: [
    new CommandOption({
      name: 'create',
      type: 'Subcommand',
      cooldowns: { guild: msInSecond * secsInMinute * 30 } /* eslint-disable-line @typescript-eslint/no-magic-numbers -- 30mins */
    }),
    new CommandOption({
      name: 'load',
      type: 'Subcommand',
      cooldowns: { guild: msInSecond * secsInMinute * 5 }, /* eslint-disable-line @typescript-eslint/no-magic-numbers  -- 5mins */
      options: [
        new CommandOption({
          name: 'id',
          type: 'String',
          autocompleteOptions() {
            return [...this.client.backupSystem.list().filter(hasPerm.bind(this)).keys()];
          }
        }),
        new CommandOption({ name: 'no_clear', type: 'Boolean' })
      ]
    }),
    new CommandOption({
      name: 'get',
      type: 'Subcommand',
      options: [new CommandOption({
        name: 'id',
        type: 'String',
        autocompleteOptions() { return [...this.client.backupSystem.list(this.guild.id).keys()]; }
      })]
    }),
    new CommandOption({
      name: 'delete',
      type: 'Subcommand',
      options: [new CommandOption({
        name: 'id',
        type: 'String',
        required: true,
        autocompleteOptions() { return [...this.client.backupSystem.list(this.guild.id).keys()]; }
      })]
    })
  ],
  beta: true,

  run(lang) {
    const embed = new EmbedBuilder({ title: lang('embedTitle'), color: Colors.Red });

    return backupMainFunctions[this.options.getSubcommand()].call(this, lang, embed, this.options.getString('id'));
  }
});