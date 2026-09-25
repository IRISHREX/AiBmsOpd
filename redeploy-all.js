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

async function redeploy() {
  const ssh = new NodeSSH();
  console.log('🚀 Connecting to VPS...');
  await ssh.connect(SSH_CONFIG);
  console.log('✅ Connected!');

  // 1. Backend update
  console.log('📦 Uploading latest backend files...');
  await ssh.putDirectory(LOCAL_BE, REMOTE_BE, {
    recursive: true,
    concurrency: 8,
    validate: (itemPath) => {
      const b = path.basename(itemPath);
      return b !== 'node_modules' && b !== '.git';
    },
  });
  await ssh.putFile(path.join(LOCAL_BE, '.env'), `${REMOTE_BE}/.env`);
  console.log('✅ Backend files & .env uploaded!');

  console.log('🔄 Restarting backend with PM2...');
  await ssh.execCommand('pm2 restart all || pm2 start server.js --name "bms-backend"', { cwd: REMOTE_BE });
  console.log('✅ Backend restarted!');

  // 2. Frontend update
  console.log('📦 Uploading latest frontend dist...');
  await ssh.execCommand(`rm -rf ${REMOTE_FE}/*`);
  await ssh.putDirectory(LOCAL_FE, REMOTE_FE, {
    recursive: true,
    concurrency: 10,
  });
  console.log('✅ Frontend files uploaded!');

  console.log('🔄 Reloading Nginx...');
  await ssh.execCommand('systemctl reload nginx || systemctl restart nginx');
  console.log('✅ Nginx reloaded!');

  // 3. Status checks
  console.log('🔍 Checking services...');
  const pm2Status = await ssh.execCommand('pm2 status');
  console.log(pm2Status.stdout);

  const curlFe = await ssh.execCommand('curl -s -I http://localhost');
  console.log('Frontend check:\n' + curlFe.stdout);

  const curlBe = await ssh.execCommand('curl -s -I http://localhost/api/v1/user/doctors');
  console.log('Backend API check:\n' + curlBe.stdout);

  ssh.dispose();
  console.log('🎉 Full redeployment complete!');
}

redeploy().catch(err => {
  console.error('❌ Error during redeployment:', err);
  process.exit(1);
});
