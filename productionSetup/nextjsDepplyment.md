```bash

sudo apt update && sudo apt upgrade -y
sudo apt install -y nodejs npm nginx
sudo npm install -g pm2

```

```bash
sudo apt update
sudo apt install curl -y
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.1/install.sh | bash
source ~/.bashrc
nvm install 24
nvm use 24
mkdir -p /home/prithiviexadmin/prithivieXCode/prithivieX-frontend
touch /home/prithiviexadmin/prithivieXCode/prithivieX-frontend/.env.local

### ecosystem.config.js
```bash
module.exports = {
  apps: [
    {
      name: "nextjs-app",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      cwd: "./",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
    },
  ],
};
```



```bash
pm2 start ecosystem.config.js


#  Useful PM2 commands
pm2 list              # see running processes
pm2 logs nextjs-app    # view logs
pm2 restart nextjs-app # restart after a new build
pm2 stop nextjs-app
pm2 delete nextjs-app



# Make it survive server reboots
pm2 startup
# sudo env PATH=$PATH:/home/prithiviexadmin/.nvm/versions/node/v24.18.0/bin /usr/local/lib/node_modules/pm2/bin/pm2 startup systemd -u prithiviexadmin --hp /home/prithiviexadmin

pm2 save
```

inside .env.local put this
```bash
NEXT_PUBLIC_API_BASE_URL=https://api.prithviex.com
```
