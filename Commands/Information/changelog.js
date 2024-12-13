const
  { EmbedBuilder, Colors } = require('discord.js'),
  fetch = import('node-fetch').then(e => e.default),
  { timeFormatter: { msInSecond, secsInDay } } = require('#Utils'),

  /** @type {Client['config']} */
  { github: ghConfig = {} } = require(require('node:path').resolve(process.cwd(), 'config.json')),

  CACHE_TIMEOUT = msInSecond * secsInDay / 2, // 12h
  MAX_COMMIT_LENGTH = 100,
  suffix = '...';


/** @type {string[] | undefined} */
let commitsCache;

/**
 * @this {Client}
 * @returns {Promise<string[]>} */
async function getCommits() {
  const { github } = this.config;

  const
    res = await (await fetch)(`https://api.github.com/repos/${github.userName}/${github.repoName}/commits?per_page=25`, {
      method: 'GET',
      headers: {
        Authorization: `Token ${this.keys.githubKey}`,
        'User-Agent': `Bot ${github.repo}`
      }
    }),

    /** @type {{ commit: { message: string } }[]} */
    json = await res.json();

  if (!res.ok) throw new Error(JSON.stringify(json));

  return json.map(e => {
    if (e.commit.message.length > MAX_COMMIT_LENGTH) e.commit.message = e.commit.message.slice(0, MAX_COMMIT_LENGTH - suffix.length) + suffix;
    return `- ${e.commit.message.replace(/(?<=\(#\d+\)).*/s, '')}`;
  });
}

module.exports = new MixedCommand({
  aliases: { prefix: ['changelogs'] },
  cooldowns: { channel: msInSecond * 10 },
  dmPermission: true,
  disabled: !ghConfig.repoName || !ghConfig.userName,
  disabledReason: 'Missing github config in config.json',

  async run(lang) {
    const
      changelog = commitsCache ?? await getCommits.call(this.client),
      embed = new EmbedBuilder({
        title: lang('embedTitle'),
        url: `${this.client.config.github.repo}/commits`,
        description: changelog.join('\n'),
        color: Colors.White
      });

    if (!commitsCache) {
      commitsCache = changelog;
      setTimeout(() => { commitsCache = undefined; }, CACHE_TIMEOUT);
    }

    return this.customReply({ embeds: [embed] });
  }
});