const { Constants, PermissionFlagsBits, EmbedBuilder, Colors } = require('discord.js');

module.exports = {
  name: 'economyconfig',
  prefixCommand: false,
  slashCommand: true,
  options: [
    {
      name: 'user',
      type: 'SubcommandGroup',
      options: [
        { name: 'start', type: 'Subcommand' },
        {
          name: 'delete',
          type: 'Subcommand',
          options: [{
            name: 'confirmation',
            type: 'String',
            required: true
          }]
        }
      ]
    },
    {
      name: 'admin',
      type: 'SubcommandGroup',
      options: [
        { name: 'toggle', type: 'Subcommand' },
        {
          name: 'clear',
          type: 'Subcommand',
          options: [{
            name: 'confirmation',
            type: 'String',
            required: true
          }]
        },
        {
          name: 'blacklist',
          type: 'Subcommand',
          options: [
            {
              name: 'channel', type: 'Channel',
              channelTypes: Constants.TextBasedChannelTypes
            },
            { name: 'role', type: 'Role' },
            { name: 'user', type: 'User' }
          ]
        },
        {
          name: 'gaining_rules',
          type: 'Subcommand',
          options: [
            { name: 'get', type: 'Boolean' },
            {
              name: 'min_message_length',
              type: 'Integer',
              minValue: 0,
              maxValue: 5000,
              required: false
            },
            {
              name: 'max_message_length',
              type: 'Integer',
              minValue: 0,
              maxValue: 5000,
              required: false
            }
          ]
        }
      ]
    }
  ], beta: true,

  run: function (lang) {
    if (this.options.getSubcommandGroup() == 'user') {
      switch (this.options.getSubcommand()) {
        case 'start': {
          const defaultSettings = this.client.defaultSettings.economy;

          if (this.guild.db.economy?.[this.user.id]?.gaining?.chat)
            return this.editReply(lang('start.alreadyInitiated'));

          this.client.db.update('guildSettings', `${this.guild.id}.economy${this.user.id}`, {
            currency: defaultSettings.currency ?? 0,
            currencyCapacity: defaultSettings.currencyCapacity,
            power: defaultSettings.power ?? 0,
            defense: defaultSettings.defense ?? 0,
            dailyStreak: 0,
            slaves: 0,
            maxSlaves: defaultSettings.maxSlaves,
            maxConcurrentResearches: defaultSettings.maxConcurrentResearches,
            gaining: defaultSettings.gaining,
            skills: Object.fromEntries(Object.entries(defaultSettings.skills).map(([skill, { ...e }]) => {
              delete e.firstPrice;

              e.lastPrice = 0;
              e.onCooldownUntil ??= 0;
              e.lvl ??= 0;
              e.maxLvl ??= 0;
              e.percentage ??= 18;

              return [skill, e];
            }))
          });

          return this.editReply(lang('start.success'));
        }

        case 'delete': {
          if (!this.options.getString('confirmation')?.toLowerCase() == lang('confirmation'))
            return this.editReply(lang('user.delete.needConfirm'));

          this.client.db.update('guildSettings', `${this.guild.id}.economy.${this.user.id}`, null);

          return this.editReply(lang('user.delete.success'));
        }
      }
    }
    else if (this.options.getSubcommandGroup() == 'admin') {
      if (!this.member.permissions.has(PermissionFlagsBits.ManageGuild))
        return this.customReply(lang('admin.noPerm'), 3e4);

      switch (this.options.getSubcommand()) {
        case 'toggle': {
          this.client.db.update('guildSettings', `${this.guild.id}.economy.enable`, !this.guild.db.economy?.enable);
          return this.editReply(lang('admin.toggle.success', this.guild.db.economy?.enable ? lang('global.enabled'): lang('global.disabled')));
        }

        case 'clear': {
          if (!this.options.getString('confirmation')?.toLowerCase() == lang('confirmation'))
            return this.editReply(lang('admin.clear.needConfirm'));

          this.client.db.update('guildSettings', `${this.guild.id}.economy.enable`, false);
          return this.editReply(lang('admin.clear.success'));
        }

        case 'blacklist': {
          const
            channel = this.options.getChannel('channel'),
            role = this.options.getRole('role'),
            user = this.options.getUser('user'),
            blacklist = this.guild.db.economy?.config?.blacklist || {};

          if (!channel && !role && !user) {
            const
              max = msg => !msg || msg.length < 1024 ? msg : msg.substring(0, 1021) + '...',
              channelList = max(blacklist.channels?.map(e => `<#${e}>`).join(', ')),
              roleList = max(blacklist.roles?.map(e => `<@&${e}>`).join(', ')),
              userList = max(blacklist.user?.map(e => `<@${e}>`).join(', ')),
              embed = new EmbedBuilder({
                title: lang('admin.blacklist.embedTitle'),
                description: lang('admin.blacklist.listEmbedDescription'),
                fields: [
                  { name: lang('admin.blacklist.channels'), value: channelList || lang('global.none'), inline: false },
                  { name: lang('admin.blacklist.roles'), value: roleList || lang('global.none'), inline: false },
                  { name: lang('admin.blacklist.user'), value: userList || lang('global.none'), inline: false }
                ],
                color: Colors.White
              });

            return this.editReply({ embeds: [embed] });
          }
          const
            status = { channel: channel ? `+ ${channel.name}` : lang('global.none'), role: role ? `+ ${role.name}` : lang('global.none'), user: user ? `+ ${user.customTag}` : lang('global.none') },
            work = (id, type, list = []) => {
              if (list.includes(id)) {
                list = list.filter(e => e != id);
                status[type][0] = '-';
              }
              else if (id) list.push(id);

              return list;
            };

          blacklist.channels = work(channel?.id, 'channel', blacklist.channels);
          blacklist.roles = work(role?.id, 'role', blacklist.roles);
          blacklist.user = work(user?.id, 'user', blacklist.user);

          this.client.db.update('guildSettings', `${this.guild.id}.economy.config`, { blacklist });

          const embed = new EmbedBuilder({
            title: lang('admin.blacklist.embedTitle'),
            description: lang('admin.blacklist.setEmbedDescription', { channel: status.channel, role: status.role, user: status.user }),
            footer: { text: lang('admin.blacklist.setFooterText') },
            color: Colors.White
          });

          return this.editReply({ embeds: [embed] });
        }

        case 'gaining_rules': {
          const
            get = this.options.getBoolean('get'),
            oldConfig = this.guild.db.economy?.config || this.client.defaultSettings.economy.config;

          const config = Object.fromEntries(Object.entries({
            minMessageLength: this.options.getInteger('min_message_length'),
            maxMessageLength: this.options.getInteger('max_message_length')
          }).filter(([k, v]) => v !== null && v != oldConfig[k]));

          if (get || !config) {
            const embed = new EmbedBuilder({
              title: lang('admin.gainingRules.getEmbedTitle'),
              //description: lang('admin.gainingRules.getEmbedDescription'),
              color: Colors.White,
              description: `Good-Looking text coming soon.\n\n\`\`\`json\n${JSON.stringify(this.client.defaultSettings.economy.config.fMerge(oldConfig), null, 2)}\n\`\`\``
              //fields: Object.entries(this.client.defaultSettings.economy.config.fMerge(oldConfig)).slice(0, 25).map(([k, v]) => ({ name: lang(`admin.gainingRules.getConfigList.${k}`), value: v, inline: true }))
            });

            return this.editReply({ embeds: [embed] });
          }

          if (!Object.keys(config).length) return this.customReply(lang('admin.gainingRules.nothingChanged'));
          return this.editReply('WIP');
          this.client.db.update('guildSettings', `${this.guild.id}.economy`, { config });

          return this.editReply(lang('admin.gainingRules.setSuccess', Object.entries(config).length));
        }
      }
    }
  }
};