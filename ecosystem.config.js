// PM2 process manager config untuk Biznet NEO VPS
// Jalankan dari root project:  pm2 start ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'lms-api',
      cwd: './server',          // dotenv akan load ./server/.env
      script: 'src/index.js',
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
