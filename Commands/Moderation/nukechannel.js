const
  { Constants, EmbedBuilder, Colors, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, channelMention } = require('discord.js'),
  { getTargetChannel, timeFormatter: { msInSecond } } = require('#Utils'),
  collectorTimeout = 3e4;

module.exports = new MixedCommand({
  aliases: { prefix: ['clearchannel'], slash: ['clearchannel'] },
  permissions: { client: ['ManageChannels'], user: ['ManageGuild', 'ManageChannels'] },
  cooldowns: { guild: msInSecond * 10, user: msInSecond * 10 },
  options: [new CommandOption({
    name: 'channel',
    type: 'Channel',
    channelTypes: Constants.GuildTextBasedChannelTypes.filter(e => !Constants.ThreadChannelTypes.includes(e))
  })],

  async run(lang) {
    const

      /** @type {Exclude<import('discord.js').GuildTextBasedChannel, import('discord.js').AnyThreadChannel>} */
      channel = getTargetChannel(this, { returnSelf: true }),
      embed = new EmbedBuilder({
        title: lang('confirmEmbedTitle'),
        description: lang('confirmEmbedDescription', channelMention(channel.id)),
        color: Colors.Red
      }),
      component = new ActionRowBuilder({
        components: [
          new ButtonBuilder({
            label: lang('confirmButtonLabel'),
            customId: 'nukechannel.confirm',
            style: ButtonStyle.Danger
          }),
          new ButtonBuilder({
            label: lang('cancelButtonLabel'),
            customId: 'nukechannel.cancel',
            style: ButtonStyle.Success
          })
        ]
      });

    const
      msg = await this.customReply({ embeds: [embed], components: [component] }),
      collector = msg.createMessageComponentCollector({ filter: i => i.user.id == this.user.id, componentType: ComponentType.Button, max: 1, time: collectorTimeout });

    collector
      .on('collect', async button => {
        const reply = await button.deferReply();

        if (button.customId == 'nukechannel.cancel') {
          void reply.delete();
          return collector.stop();
        }

        const
          nukedEmbed = new EmbedBuilder({
            description: lang('successEmbedDescription'),
            color: Colors.Red,
            image: { url: 'https://i.giphy.com/XUFPGrX5Zis6Y.gif' },
            footer: { text: lang('embedFooterText', this.user.username) }
          }),
          reason = lang('global.modReason', { command: this.commandName, user: this.user.username }),
          cloned = await channel.clone({ reason });


        for (const [, webhook] of await channel.fetchWebhooks())
          await webhook.edit({ channel: cloned.id, reason });

        await channel.delete(reason);

        if (channel.id != this.channelId) {
          void reply.delete();
          void button.message.edit({ embeds: [embed.setDescription(lang('successEmbedDescription'))], components: [] });
        }

        return cloned.send({ embeds: [nukedEmbed] });
      })
      .on('end', collected => {
        for (const btn of component.components) btn.data.disabled = true;

        embed.data.description = collected.size ? lang('canceledEmbedDescription') : lang('global.menuTimedOut');
        return msg.customReply({ embeds: [embed], components: [component] });
      });
  }
});