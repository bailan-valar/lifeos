require('dotenv').config();

const PORT = process.env.PORT || 9999;
const NODE_ENV = process.env.NODE_ENV || 'production';
const INTERPRETER_PATH = process.env.INTERPRETER_PATH || '/home/ubuntu/.nvm/versions/node/v24.15.0/bin/node';

module.exports = {
  apps: [
    {
      name: `lifeos-${PORT}`,
      cwd: '.',
      script: '.output/server/index.mjs',
      interpreter: INTERPRETER_PATH,
      args: `dev --port ${PORT}`,
      env: { NODE_ENV: NODE_ENV, 'PORT': PORT },
      watch: false,
    },
  ],
};
