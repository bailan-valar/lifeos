require('dotenv').config();

const PORT = process.env.PORT || 3434;

module.exports = {
  apps: [
    {
      name: `lifeos-${PORT}`,
      cwd: '.',
      script: 'node_modules/nuxt/bin/nuxt.mjs',
      args: `dev --port ${PORT}`,
      interpreter: 'D:/Software/nodejs/node.exe',
      env: { NODE_ENV: 'development','PORT': PORT },
      watch: false,
    },
  ],
};
