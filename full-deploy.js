/**
 * full-deploy.js - Complete deployment + server setup for aiccloud VPS
 */

const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const path = require('path');
const fs = require('fs');

const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 60000,
};

const LOCAL_FE = path.join(__dirname, 'BMS-opd-fe', 'dist');
const LOCAL_BE = path.join(__dirname, 'BMS-opd-be');
const REMOTE_FE = '/root/BMS-opd-fe';
const REMOTE_BE = '/root/BMS-opd-be';

async function deploy() {
  const ssh = new NodeSSH();
  
  console.log('🚀 Connecting to aiccloud...');
  await ssh.connect(SSH_CONFIG);
  console.log('✅ Connected!\n');

  async function run(cmd, cwd = '/root') {
    console.log(`> ${cmd}`);
    const result = await ssh.execCommand(cmd, { cwd });
    if (result.stdout) console.log(result.stdout);
    if (result.stderr && !result.stderr.includes('warning') && !result.stderr.includes('npm warn')) console.error(result.stderr);
    return result;
  }

  // ── STEP 1: Upload frontend dist ──────────────────────────────────────
  console.log('\n📦 [1/5] Uploading frontend dist...');
  await run(`rm -rf ${REMOTE_FE} && mkdir -p ${REMOTE_FE}`);
  await ssh.putDirectory(LOCAL_FE, REMOTE_FE, { recursive: true, concurrency: 10 });
  console.log('✅ Frontend uploaded!');

  // ── STEP 2: Upload backend ─────────────────────────────────────────────
  console.log('\n📦 [2/5] Uploading backend...');
  await run(`rm -rf ${REMOTE_BE} && mkdir -p ${REMOTE_BE}`);
  await ssh.putDirectory(LOCAL_BE, REMOTE_BE, {
    recursive: true,
    concurrency: 5,
    validate: (itemPath) => {
      const b = path.basename(itemPath);
      return b !== 'node_modules' && b !== '.git';
    },
  });
  console.log('✅ Backend uploaded!');

  // ── STEP 3: Install dependencies ──────────────────────────────────────
  console.log('\n📦 [3/5] Installing backend dependencies...');
  await run('apt-get install -y npm > /dev/null 2>&1 || true');
  await run('npm install --production', REMOTE_BE);
  console.log('✅ Dependencies installed!');

  // ── STEP 4: Start backend with PM2 ────────────────────────────────────
  console.log('\n🟢 [4/5] Starting backend with PM2...');
  await run('npm install -g pm2');
  await run('pm2 kill || true');
  await run(`pm2 start server.js --name "bms-backend"`, REMOTE_BE);
  await run('pm2 save');
  await run('pm2 startup || true');

  // Wait a moment for the app to boot
  await new Promise(r => setTimeout(r, 3000));

  // Verify backend is running
  const backendLogs = await ssh.execCommand('pm2 logs --nostream --lines 5');
  console.log(backendLogs.stdout);

  // ── STEP 5: Configure Nginx ────────────────────────────────────────────
  console.log('\n🌐 [5/5] Configuring Nginx...');
  await run('apt-get install -y nginx > /dev/null 2>&1 || true');
  await run('chmod 755 /root');

  const nginxConfig = `server {
    listen 80;
    listen [::]:80;
    server_name biomechasoft.in www.biomechasoft.in _;

    root /root/BMS-opd-fe;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\$host;
        proxy_cache_bypass \\$http_upgrade;
    }
}`;

  await run(`printf '%s\\n' '${nginxConfig}' > /etc/nginx/sites-available/default`);
  await run('nginx -t');
  await run('systemctl restart nginx');
  await run('systemctl enable nginx');

  // ── FINAL CHECK ────────────────────────────────────────────────────────
  console.log('\n🔍 Final checks...');
  const ports = await run('ss -tulpn | grep -E "(:80|:5000)"');
  const pm2Status = await run('pm2 status');

  console.log('\n🎉 Full deployment complete!');
  console.log('   Frontend: http://biomechasoft.in');
  console.log('   Backend:  running on localhost:5000');

  ssh.dispose();
}

deploy().catch(err => {
  console.error('❌ Deployment failed:', err.message);
  process.exit(1);
});
