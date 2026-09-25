const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 30000,
};

async function fixNginx() {
  const ssh = new NodeSSH();
  await ssh.connect(SSH_CONFIG);
  
  const nginxConfig = `
server {
    listen 80;
    server_name _;

    root /root/BMS-opd-fe;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
`;
  
  console.log('Fixing Nginx...');
  await ssh.execCommand(`cat << 'EOF' > /etc/nginx/sites-available/default\n${nginxConfig}\nEOF`);
  await ssh.execCommand('systemctl restart nginx');
  console.log('Nginx restarted!');

  ssh.dispose();
}

fixNginx().catch(console.error);
