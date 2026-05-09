require('dotenv').config();

const PORT = process.env.PORT || 9999;

module.exports = {
  apps: [
    {
      name: `lifeos-${PORT}`,
      cwd: '.',
      script: '.output/server/index.mjs',
      args: `dev --port ${PORT}`,
      env: { NODE_ENV: 'development','PORT': PORT },
      watch: false,
    },
  ],
};
