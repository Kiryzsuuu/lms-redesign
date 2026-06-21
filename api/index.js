const { getApp } = require('../server/src/createApp');

module.exports = async (req, res) => {
  const app = await getApp();
  app(req, res);
};
