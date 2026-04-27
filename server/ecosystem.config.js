module.exports = {
  apps: [
    {
      name: "movietalk-backend",
      script: "dist/index.js",
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
