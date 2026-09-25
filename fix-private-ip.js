const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 30000,
};

async function fixPrivateIP() {
  const ssh = new NodeSSH();
  await ssh.connect(SSH_CONFIG);

  async function run(cmd) {
    console.log(`\n> ${cmd}`);
    const r = await ssh.execCommand(cmd);
    if (r.stdout) console.log(r.stdout);
    if (r.stderr) console.error(r.stderr);
    return r;
  }

  // Test if port 80 responds on the private IP
  await run('curl -v http://10.10.10.98 2>&1 | head -25');

  // Make absolutely sure Nginx listens on the private IP too
  // The private IP is on eth1 (10.10.10.98)
  const nginxConfig = `server {
    listen 0.0.0.0:80;
    listen [::]:80;
    listen 10.10.10.98:80;
    server_name biomechasoft.in www.biomechasoft.in _;

    root /root/BMS-opd-fe;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;

  await ssh.execCommand(`cat << 'NGINXEOF' > /etc/nginx/sites-available/default\n${nginxConfig}\nNGINXEOF`);
  await run('nginx -t');
  await run('systemctl restart nginx');

  // Test again
  await run('curl -I http://10.10.10.98');

  ssh.dispose();
}

fixPrivateIP().catch(console.error);
