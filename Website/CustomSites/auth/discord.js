/** @type {import('@mephisto5558/bot-website').customPage} */
module.exports = {
  run(res, req, next) {
    if ([undefined, ''].includes(req.query.redirectURL)) req.session.redirectURL = req.query.redirectURL;
    return this.passport.authenticate('discord')(req, res, next);
  }
};