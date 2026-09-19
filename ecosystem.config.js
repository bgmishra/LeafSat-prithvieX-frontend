module.exports = {
  apps: [
    {
      name: "leafsat-prithviex-frontend",
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