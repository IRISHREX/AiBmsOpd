const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 30000,
};

async function testAndFirewall() {
  const ssh = new NodeSSH();
  await ssh.connect(SSH_CONFIG);
  
  console.log('--- Checking Firewall (UFW) ---');
  const ufw = await ssh.execCommand('ufw status');
  console.log(ufw.stdout || ufw.stderr);

  console.log('--- Checking iptables ---');
  const iptables = await ssh.execCommand('iptables -L -n | head -n 20');
  console.log(iptables.stdout || iptables.stderr);

  console.log('--- Creating /test endpoint ---');
  await ssh.execCommand(`echo "<h1>TEST SUCCESSFUL</h1><p>If you see this, traffic is reaching the VPS successfully!</p>" > /root/BMS-opd-fe/test.html`);
  
  // Update Nginx to explicitly serve /test.html at /test
  const nginxConfig = `
server {
    listen 80;
    server_name biomechasoft.in www.biomechasoft.in;

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
  await ssh.execCommand('systemctl restart nginx');
  
  console.log('--- Test file created and Nginx restarted ---');
  
  ssh.dispose();
}

testAndFirewall().catch(console.error);
