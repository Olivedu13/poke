module.exports = {
  apps: [
    {
      name: 'poke-api',
      script: './dist/index.js',
      instances: 2,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        SOCKET_PORT: 3001
      },
      error_file: '/opt/poke-edu/logs/api-error.log',
      out_file: '/opt/poke-edu/logs/api-out.log',
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      max_memory_restart: '500M',
      autorestart: true,
      watch: false
    }
  ]
};
