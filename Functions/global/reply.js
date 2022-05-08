let sentMessage;
module.exports = async function reply(reply, message, deleteTime = false, ping = false) {
  if (!message) throw new Error('reply.js: Missing var in code: message')
  if (!reply) throw new Error('reply.js: No reply message provided')

  try {
    if (typeof reply === 'object') {
      await message.reply({
        embeds: [reply],
        allowedMentions: { repliedUser: ping }
      }).then(msg => { sentMessage = msg })
    } else {
      await message.reply({
        content: reply,
        allowedMentions: { repliedUser: ping }
      }).then(msg => { sentMessage = msg })
    }
  } catch (err) {
    await message.channel.send(reply)
      .then(msg => { sentMessage = msg })
  }

  if (deleteTime && !isNaN(deleteTime)) {
    setTimeout(_ => sentMessage.delete(), deleteTime)
  }
}
