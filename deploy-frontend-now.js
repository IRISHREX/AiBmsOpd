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
const REMOTE_FE = '/root/BMS-opd-fe';

async function deployFrontend() {
  if (!fs.existsSync(LOCAL_FE)) {
    console.error('❌ dist directory not found!');
    process.exit(1);
  }

  const ssh = new NodeSSH();
  
  let connected = false;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      console.log(`🚀 Connecting to VPS (Attempt ${attempt}/3)...`);
      await ssh.connect(SSH_CONFIG);
      connected = true;
      break;
    } catch (e) {
      console.warn(`⚠️ Attempt ${attempt} failed: ${e.message}`);
      if (attempt < 3) await new Promise(r => setTimeout(r, 4000));
    }
  }

  if (!connected) {
    throw new Error('Failed to connect to VPS after 3 attempts');
  }

  console.log('✅ Connected!');

  console.log('📦 Cleaning & uploading frontend dist...');
  await ssh.execCommand(`rm -rf ${REMOTE_FE}/*`);
  await ssh.putDirectory(LOCAL_FE, REMOTE_FE, {
    recursive: true,
    concurrency: 10,
  });
  console.log('✅ Frontend files uploaded!');

  console.log('🔄 Restarting Nginx...');
  await ssh.execCommand('systemctl restart nginx');
  console.log('✅ Nginx restarted!');

  console.log('🔍 Testing localhost...');
  const testRes = await ssh.execCommand('curl -s -I http://localhost');
  console.log(testRes.stdout);

  ssh.dispose();
  console.log('🎉 Frontend deployment complete!');
}

deployFrontend().catch(err => {
  console.error('❌ Error deploying frontend:', err.message);
  process.exit(1);
});
