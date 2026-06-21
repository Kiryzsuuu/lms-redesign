let getApp;
let loadError;

try {
  getApp = require('../server/src/createApp').getApp;
} catch (err) {
  loadError = err;
}

let appCache = null;

module.exports = async (req, res) => {
  if (loadError) {
    return res.status(500).json({
      error: 'Module load failed',
      message: loadError.message,
      code: loadError.code,
    });
  }
  try {
    if (!appCache) appCache = await getApp();
    appCache(req, res);
  } catch (err) {
    res.status(500).json({ error: 'Runtime error', message: err.message });
  }
};
