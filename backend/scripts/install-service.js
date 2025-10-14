const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

// Script pour créer un service systemd (Linux)
const serviceContent = `[Unit]
Description=Denonciation RDC Application
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=${process.cwd()}
Environment=NODE_ENV=production
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=10

[Install]
WantedBy=multi-user.target
`;

// Script pour PM2
const pm2Config = {
  apps: [{
    name: "denonciation-rdc",
    script: "server.js",
    instances: "max",
    exec_mode: "cluster",
    env: {
      NODE_ENV: "production",
      PORT: 3000
    }
  }]
};

console.log('📦 Installation du service Denonciation RDC...');

// Créer le service systemd
fs.writeFileSync('/etc/systemd/system/denonciation-rdc.service', serviceContent);
console.log('✅ Service systemd créé');

// Créer la configuration PM2
fs.writeFileSync('ecosystem.config.js', `module.exports = ${JSON.stringify(pm2Config, null, 2)}`);
console.log('✅ Configuration PM2 créée');

console.log(`
🎯 INSTRUCTIONS D'INSTALLATION:

1. AVEC SYSTEMD:
   sudo systemctl daemon-reload
   sudo systemctl enable denonciation-rdc
   sudo systemctl start denonciation-rdc

2. AVEC PM2:
   npm install -g pm2
   pm2 start ecosystem.config.js
   pm2 startup
   pm2 save

3. CONFIGURATION NGINX (exemple):
   server {
       listen 80;
       server_name votre-domaine.com;
       
       location / {
           proxy_pass http://localhost:3000;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
`);