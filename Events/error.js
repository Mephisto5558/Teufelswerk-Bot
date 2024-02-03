const { errorHandler } = require('../Utils');

/**@this Error @param {client}Client @returns {Promise<void>}*/
module.exports = function error(client) {
  return errorHandler.call(client, this);
};