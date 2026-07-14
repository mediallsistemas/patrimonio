/** @type {import('pm2').StartOptions} */
module.exports = {
  apps: [
    {
      name: 'linensistem',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        HOSTNAME: '0.0.0.0',
      },
      // Log rotation — requer pm2-logrotate instalado globalmente
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/err.log',
      out_file: 'logs/out.log',
      merge_logs: true,
      // Reinício automático em caso de crash
      autorestart: true,
      restart_delay: 2000,
      max_restarts: 10,
    },
    {
      // Fecha rondas abertas há mais de 24h, independente de algum
      // usuário ter acessado o sistema (substitui o cron do Vercel)
      name: 'linensistem-expirar-rondas',
      script: 'node_modules/ts-node/dist/bin.js',
      args: ['--compiler-options', '{"module":"CommonJS"}', 'prisma/scripts/expirar-rondas.ts'],
      instances: 1,
      exec_mode: 'fork',
      watch: false,
      autorestart: false,
      cron_restart: '0 * * * *',
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: 'logs/expirar-rondas-err.log',
      out_file: 'logs/expirar-rondas-out.log',
      merge_logs: true,
    },
  ],
}
