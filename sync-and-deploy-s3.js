const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const path = require('path');

const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 60000,
};

const LOCAL_BE = path.join(__dirname, 'BMS-opd-be');
const REMOTE_BE = '/root/BMS-opd-be';

async function syncAndDeploy() {
  const ssh = new NodeSSH();
  let connected = false;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      console.log(`🚀 Connecting to VPS (Attempt ${attempt}/4)...`);
      await ssh.connect(SSH_CONFIG);
      connected = true;
      break;
    } catch (e) {
      console.warn(`⚠️ Attempt ${attempt} failed: ${e.message}`);
      if (attempt < 4) await new Promise(r => setTimeout(r, 4000));
    }
  }

  if (!connected) throw new Error('Could not connect to VPS');
  console.log('✅ Connected to VPS!');

  // 1. Update Nginx configuration
  console.log('🌐 Configuring Nginx to route /uploads to backend...');
  const nginxConf = `server {
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

    location /uploads {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}`;

  await ssh.execCommand(`printf '%s\\n' '${nginxConf}' > /etc/nginx/sites-available/default`);
  const nginxTest = await ssh.execCommand('nginx -t');
  console.log('Nginx test:', nginxTest.stdout || nginxTest.stderr);
  await ssh.execCommand('systemctl restart nginx');
  console.log('✅ Nginx restarted!');

  // 2. Upload updated backend files
  console.log('📦 Uploading updated backend files to VPS...');
  await ssh.putDirectory(LOCAL_BE, REMOTE_BE, {
    recursive: true,
    concurrency: 8,
    validate: (itemPath) => {
      const b = path.basename(itemPath);
      return b !== 'node_modules' && b !== '.git';
    },
  });
  console.log('✅ Backend files uploaded!');

  // 3. Sync existing local uploads on VPS to S3
  console.log('☁️ Syncing existing doctor uploads to S3 bucket...');
  const syncScript = `
    import { syncUploadsToS3, listS3Backups } from './utils/s3Storage.js';
    import path from 'path';

    const dir = path.join(process.cwd(), 'uploads', 'doctors');
    console.log('Syncing directory to S3:', dir);
    const result = await syncUploadsToS3(dir);
    console.log('Uploaded to S3 count:', result.uploaded);

    const s3Files = await listS3Backups('doctors/');
    console.log('Doctors assets in S3:');
    s3Files.forEach(f => console.log(' - ' + f.key + ' (' + f.size + ' bytes)'));
  `;
  const syncRes = await ssh.execCommand(`node --input-type=module -e "${syncScript.replace(/\n/g, ' ')}"`, { cwd: REMOTE_BE });
  console.log(syncRes.stdout || syncRes.stderr);

  // 4. Restart PM2 process
  console.log('🔄 Restarting backend process with PM2...');
  await ssh.execCommand('pm2 restart all || pm2 start server.js --name "bms-backend"', { cwd: REMOTE_BE });

  await new Promise(r => setTimeout(r, 3000));
  const pm2Logs = await ssh.execCommand('pm2 logs --nostream --lines 10');
  console.log('--- PM2 Logs ---');
  console.log(pm2Logs.stdout);

  // 5. Test fetching doctor avatar via Nginx
  console.log('🔍 Testing doctor avatar fetch via local Nginx...');
  const testAvatar = await ssh.execCommand('curl -s -I http://localhost/uploads/doctors/1790299377214_1000164755.jpg');
  console.log(testAvatar.stdout);

  console.log('🔍 Testing doctor stamp fetch via local Nginx...');
  const testStamp = await ssh.execCommand('curl -s -I http://localhost/uploads/doctors/1790299897584_WhatsApp_Image_2026-09-21_at_22.43.30.jpeg');
  console.log(testStamp.stdout);

  ssh.dispose();
  console.log('🎉 S3 Storage setup and deployment complete!');
}

syncAndDeploy().catch(err => {
  console.error('❌ Sync and deploy error:', err);
  process.exit(1);
});
