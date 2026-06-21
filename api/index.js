const path = require('path');

// Ensure server dependencies resolve from root node_modules
process.chdir(path.resolve(__dirname, '..'));

const { getApp } = require('../server/src/createApp');

let appCache = null;

module.exports = async (req, res) => {
  try {
    if (!appCache) {
      appCache = await getApp();
    }
    appCache(req, res);
  } catch (err) {
    console.error('[serverless] startup error:', err);
    res.status(500).json({ error: 'Server initialization failed', detail: err.message });
  }
};
