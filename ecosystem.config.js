/**
 * PM2 — аналог оригинального запуска:
 *   pm2 start server.js -i 0 --node-args='--expose-gc --max-old-space-size=4096'
 *
 *   npm start        → nest build + pm2 start ecosystem.config.js
 *   npm stop         → pm2 stop
 *   npm run restart  → pm2 restart
 *   npm run reload   → pm2 reload (zero-downtime)
 */
module.exports = {
  apps: [
    {
      name: 'grci-web-api',
      script: 'dist/main.js',
      cwd: __dirname,
      instances: 'max', // -i 0: по числу ядер
      exec_mode: 'cluster',
      node_args: '--expose-gc --max-old-space-size=4096',
      autorestart: true,
      // NODE_ENV намеренно не задаётся (как в оригинале): при NODE_ENV=production
      // cookie refresh_token/csrf получают флаг Secure и не работают по HTTP.
    },
  ],
};
