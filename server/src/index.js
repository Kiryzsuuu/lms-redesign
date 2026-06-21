const dotenv = require('dotenv');
dotenv.config();

const { getApp } = require('./createApp');
const { getEnv } = require('./utils/env');

getApp()
  .then((app) => {
    const env = getEnv();
    app.listen(env.PORT, () => {
      // eslint-disable-next-line no-console
      console.log(`API listening on http://localhost:${env.PORT}`);
    });
  })
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
  });
