const
  { Message, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType } = require('discord.js'),
  fetch = import('node-fetch').then(e => e.default),
  { constants: { messageMaxLength }, timeFormatter: { msInSecond } } = require('#Utils');

/**
 * @this {Interaction | Message}
 * @param {lang}lang
 * @param {boolean?}deep
 * @returns {Promise<string>} */
async function fetchAPI(lang, deep) {
  /** @type {{choices: {message: {content: string}}[]} | {error: {message: string, type: string}}} */
  const res = await (await fetch)('https://api.pawan.krd/v1/chat/completions', { // https://github.com/PawanOsman/ChatGPT
    method: 'POST',
    headers: {
      Authorization: `Bearer ${this.client.keys.chatGPTApiKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'pai-001',
      messages: [
        { role: 'system', content: 'Your name is "Teufelsbot", you are a helpful discord bot. Reply consize and in the same language as the user.' },
        { role: 'user', content: this.options?.getString('message', true) ?? this.content }
      ]
    })
  }).then(e => e.json());
  await this.reply(JSON.stringify(res));

  if ('error' in res) {
    if (['Rate limit reached', 'Too many requests'].some(e => res.error.message.startsWith(e))) return deep ? lang('rateLimit') : fetchAPI.call(this, lang, true);
    if (res.error.type == 'insufficient_quota' || res.error.message.startsWith('That model is currently overloaded') || res.error.type == 'api_not_ready_or_request_error') return lang('notAvailable');
  }

  if ('choices' in res && res.choices[0].message.content) return res.choices[0].message.content;

  log.error('chatgpt command API error:', JSON.stringify(res, undefined, 2));
  return lang('error');
}

module.exports = new MixedCommand({
  aliases: { prefix: ['gpt'] },
  cooldowns: { user: msInSecond * 2 },
  dmPermission: true,
  premium: true,
  options: [new CommandOption({
    name: 'message',
    type: 'String',
    maxLength: messageMaxLength,
    required: true
  })],

  async run(lang) {
    if (this instanceof Message) void this.channel.sendTyping();

    const
      content = await fetchAPI.call(this, lang),
      component = new ActionRowBuilder({
        components: [new ButtonBuilder({
          label: lang('regenerate'),
          customId: 'chatgpt.regenerate.pai-001',
          style: ButtonStyle.Secondary
        })]
      });

    return (await this.customReply({ content, components: [component] }, undefined, { repliedUser: true }))
      .createMessageComponentCollector({ componentType: ComponentType.Button, filter: e => e.user.id == this.user.id })
      .on('collect', async e => {
        const reply = await e.deferReply();

        const newContent = await fetchAPI.call(this, lang);
        void e.message.edit(newContent);
        return reply.delete();
      });
  }
});