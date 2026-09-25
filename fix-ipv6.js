const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 30000,
};

async function fixIPv6() {
  const ssh = new NodeSSH();
  await ssh.connect(SSH_CONFIG);

  console.log('--- Fixing Nginx to listen on both IPv4 and IPv6 ---');

  const nginxConfig = `
server {
    listen 80;
    listen [::]:80;
    server_name biomechasoft.in www.biomechasoft.in _;

    root /root/BMS-opd-fe;
    index index.html;

    location /test {
        try_files /test.html =404;
    }

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

  await ssh.execCommand(`cat << 'EOF' > /etc/nginx/sites-available/default\n${nginxConfig}\nEOF`);

  console.log('--- Testing Nginx config ---');
  const test = await ssh.execCommand('nginx -t');
  console.log(test.stdout || test.stderr);

  console.log('--- Restarting Nginx ---');
  await ssh.execCommand('systemctl restart nginx');

  console.log('--- Ports Nginx is listening on ---');
  const ports = await ssh.execCommand('ss -tulpn | grep nginx');
  console.log(ports.stdout);

  console.log('✅ Done!');
  ssh.dispose();
}

fixIPv6().catch(console.error);
