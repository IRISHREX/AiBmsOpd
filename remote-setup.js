/**
 * remote-setup.js
 */

const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const path = require('path');

const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 30000,
};

async function setup() {
  const ssh = new NodeSSH();
  
  console.log('🚀 Connecting to aiccloud via SSH...');
  await ssh.connect(SSH_CONFIG);
  console.log('✅ Connected!');

  async function runCmd(cmd, cwd = '/root') {
    console.log(`\n> ${cmd}`);
    const result = await ssh.execCommand(cmd, { cwd });
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    return result;
  }

  // Ensure npm is installed (Ubuntu 24.04 Node 18 apt package doesn't include npm by default)
  await runCmd('apt-get update -y');
  await runCmd('apt-get install -y npm');

  // Install PM2
  await runCmd('npm install -g pm2');

  // Install backend dependencies and start it
  await runCmd('npm install', '/root/BMS-opd-be');
  await runCmd('pm2 stop all || true');
  await runCmd('pm2 start server.js --name "bms-backend"', '/root/BMS-opd-be');

  // Configure Nginx
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
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
`;
  
  await ssh.execCommand(`cat << 'EOF' > /etc/nginx/sites-available/default\n${nginxConfig}\nEOF`);
  await runCmd('chmod 755 /root');
  await runCmd('systemctl restart nginx');

  console.log('🎉 Setup complete!');
  ssh.dispose();
}

setup().catch((err) => {
  console.error('❌ Setup error:', err);
  process.exit(1);
});
