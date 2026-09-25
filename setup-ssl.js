const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 30000,
};

async function setupSSL() {
  const ssh = new NodeSSH();
  
  console.log('🚀 Connecting to aiccloud via SSH for SSL Setup...');
  await ssh.connect(SSH_CONFIG);
  console.log('✅ Connected!');

  async function runCmd(cmd) {
    console.log(`\n> ${cmd}`);
    const result = await ssh.execCommand(cmd);
    if (result.stdout) console.log(result.stdout);
    if (result.stderr) console.error(result.stderr);
    return result;
  }

  // Update nginx config so it has the correct server_name before certbot runs
  const nginxConfig = `
server {
    listen 80;
    server_name biomechasoft.in www.biomechasoft.in;

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
  
  await ssh.execCommand(`cat << 'EOF' > /etc/nginx/sites-available/default\n${nginxConfig}\nEOF`);
  await runCmd('systemctl reload nginx');

  // Install Certbot
  await runCmd('apt-get update -y');
  await runCmd('apt-get install -y certbot python3-certbot-nginx');

  // Run Certbot
  console.log('Generating SSL certificate...');
  await runCmd('certbot --nginx -d biomechasoft.in -d www.biomechasoft.in --non-interactive --agree-tos -m admin@biomechasoft.in');

  console.log('🎉 SSL Setup complete!');
  ssh.dispose();
}

setupSSL().catch((err) => {
  console.error('❌ Setup error:', err);
  process.exit(1);
});
