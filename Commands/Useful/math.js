const
  { EmbedBuilder, Colors, codeBlock } = require('discord.js'),
  mathjs = require('mathjs'),
  math = mathjs.create(mathjs.all, { number: 'BigNumber' }),
  SPLIT_POS = 3, // "1 234 567"
  superscripts = {
    '²': '^2', '³': '^3',
    '⁴': '^4', '⁵': '^5',
    '⁶': '^6', '⁷': '^7',
    '⁸': '^8', '⁹': '^9'
  },
  parseSpecialChars = /** @param {string}str */ str => str
    .replaceAll('\n', ';')
    .replaceAll('÷', '/')
    .replaceAll('π', '(pi)')
    .replaceAll(/[\u00B2\u00B3\u2074-\u2079]/g, e => superscripts[e])
    .replaceAll(/√(?<val>\(|\d+)/g, (_, val) => val === '(' ? 'sqrt(' : `sqrt(${val})`),
  addSpaces = /** @param {number}fullNum */ fullNum => {
    if (typeof fullNum != 'number' || !Number.isFinite(fullNum)) return String(fullNum);
    const [num, ext] = String(fullNum).split('.');
    return [...num].reduceRight((acc, e, i) => ((num.length - i) % SPLIT_POS == 0 ? ` ${e}` : e) + acc, '') + (ext ? `.${ext}` : '');
  };

module.exports = new MixedCommand({
  usage: { examples: '1+1' },
  dmPermission: true,
  options: [new CommandOption({
    name: 'expression',
    type: 'String',
    required: true
  })],

  async run(lang) {
    const
      expression = parseSpecialChars(this.options?.getString('expression', true) ?? this.content),
      embed = new EmbedBuilder({ title: lang('embedTitle'), color: Colors.White });

    let result;
    try { result = math.evaluate(expression); }
    catch (err) { return this.customReply({ embeds: [embed.setColor(Colors.Red).setDescription(lang('error', codeBlock(err.message)))] }); }

    return this.customReply({ embeds: [embed.setDescription(lang('success', { expression: codeBlock(expression), result: codeBlock(addSpaces(result)) }))] });
  }
});