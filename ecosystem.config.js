module.exports = {
  apps: [
    {
      name: "prithviex-enterprise---frontend",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "./",
      env: {
        NODE_ENV: "production",
        PORT: 3001,
      },
    },
  ],
};