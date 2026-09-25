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

async function deployBackend() {
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

  if (!connected) throw new Error('Could not connect to VPS after 4 attempts');
  console.log('✅ Connected!');

  console.log('📦 Uploading backend files...');
  await ssh.putDirectory(LOCAL_BE, REMOTE_BE, {
    recursive: true,
    concurrency: 8,
    validate: (itemPath) => {
      const b = path.basename(itemPath);
      return b !== 'node_modules' && b !== '.git';
    },
  });
  console.log('✅ Backend files uploaded!');

  console.log('📦 Uploading backend .env...');
  await ssh.putFile(path.join(LOCAL_BE, '.env'), `${REMOTE_BE}/.env`);
  console.log('✅ .env uploaded!');

  console.log('📦 Installing npm dependencies on VPS...');
  await ssh.execCommand('npm install --production', { cwd: REMOTE_BE });

  console.log('🔄 Restarting backend process with PM2...');
  const restartRes = await ssh.execCommand('pm2 restart all || pm2 start server.js --name "bms-backend"', { cwd: REMOTE_BE });
  console.log(restartRes.stdout || restartRes.stderr);

  await new Promise(r => setTimeout(r, 3000));
  const logs = await ssh.execCommand('pm2 logs --nostream --lines 15');
  console.log('--- PM2 Logs ---');
  console.log(logs.stdout);

  ssh.dispose();
  console.log('🎉 Backend deployment complete!');
}

deployBackend().catch(err => {
  console.error('❌ Error deploying backend:', err.message);
  process.exit(1);
});
