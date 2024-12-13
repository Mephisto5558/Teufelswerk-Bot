const
  { EmbedBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, hyperlink, CDNRoutes, ImageFormat, inlineCode } = require('discord.js'),
  { permissionTranslator, getTargetRole, timeFormatter: { msInSecond, timestamp } } = require('#Utils'),
  ROLE_DISPLAY_THRESHOLD = 16;

module.exports = new MixedCommand({
  aliases: { prefix: ['role-info'] },
  cooldowns: { user: msInSecond },
  options: [new CommandOption({ name: 'role', type: 'Role' })],

  async run(lang) {
    const role = getTargetRole(this, { targetOptionName: 'role', returnSelf: true });
    const embed = new EmbedBuilder({
      title: role.name,
      color: role.color,
      fields: [
        { name: lang('mention'), value: role.toString(), inline: true },
        { name: lang('members'), value: role.members.size, inline: true },
        { name: lang('color'), value: hyperlink(role.hexColor, `https://www.color-hex.com/color/${role.hexColor.slice(1)}`), inline: true },
        { name: lang('mentionable'), value: lang(`global.${role.mentionable}`), inline: true },
        { name: lang('hoist'), value: lang(`global.${role.hoist}`), inline: true },
        { name: lang('managed'), value: lang(`global.${role.managed}`), inline: true },
        { name: lang('position'), value: inlineCode(this.guild.roles.highest.position - role.position + 1), inline: true },
        { name: 'ID', value: inlineCode(role.id), inline: true },
        { name: lang('createdAt'), value: timestamp(role.createdTimestamp), inline: true }
      ]
    });

    if (role.members.size.inRange(0, ROLE_DISPLAY_THRESHOLD)) embed.data.fields.push({ name: lang('members'), value: [...role.members.values()].join(', '), inline: false });

    if (role.permissions.has(PermissionFlagsBits.Administrator)) embed.data.fields.at(-1).value = `${inlineCode(lang('admin'))} (${inlineCode(role.permissions.toArray().length)})`;
    else {
      const
        perms = permissionTranslator(role.permissions.toArray(), lang.__boundArgs__[0].locale, this.client.i18n).map(inlineCode).join(', '),
        maxLength = 1017,
        suffix = '...';

      embed.data.fields.at(-1).value = '`'
      + (perms.length < maxLength ? perms : perms.slice(0, perms.slice(0, maxLength - suffix.length).lastIndexOf(',')) + suffix)
      + `(${inlineCode(role.permissions.toArray().length)})`;
    }


    if (role.icon) embed.data.thumbnail = { url: `https://cdn.discordapp.com${CDNRoutes.roleIcon(role.id, role.icon, ImageFormat.WebP)}?size=80&quality=lossless` };
    else if (role.color) embed.data.thumbnail = { url: `https://dummyimage.com/80x80/${role.hexColor.slice(1)}/${role.hexColor.slice(1)}.png` };

    const components = this.member.permissions.has(PermissionFlagsBits.ManageRoles) && role.editable && (this.member.roles.highest.position > role.position || this.user.id == this.guild.ownerId)
      ? [new ActionRowBuilder({
        components: [new ButtonBuilder({
          label: lang('delete'),
          customId: `infoCMDs.${role.id}.delete.roles`,
          style: ButtonStyle.Danger
        })]
      })]
      : [];

    return this.customReply({ embeds: [embed], components });
  }
});