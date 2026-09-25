/**
 * deploy-aiccloud.js
 * 
 * Direct SSH deployment to aiccloud
 */

const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const path = require('path');
const fs = require('fs');

const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 30000,
};

const LOCAL_FE = path.join(__dirname, 'BMS-opd-fe', 'dist');
const LOCAL_BE = path.join(__dirname, 'BMS-opd-be');

const REMOTE_FE = '/root/BMS-opd-fe';
const REMOTE_BE = '/root/BMS-opd-be';

async function deploy() {
  const ssh = new NodeSSH();
  
  if (!fs.existsSync(LOCAL_FE)) {
    console.error('❌ dist directory not found! Run npm run build first.');
    process.exit(1);
  }

  console.log('🚀 Connecting to aiccloud via SSH...');
  await ssh.connect(SSH_CONFIG);
  console.log('✅ Connected to aiccloud server!');

  console.log(`📁 Target directory FE: ${REMOTE_FE}`);
  console.log(`📁 Target directory BE: ${REMOTE_BE}`);
  
  // Create remote target directories if they don't exist
  await ssh.execCommand(`mkdir -p ${REMOTE_FE}`);
  await ssh.execCommand(`mkdir -p ${REMOTE_BE}`);

  console.log('📦 Uploading FE dist directory...');
  const feStatus = await ssh.putDirectory(LOCAL_FE, REMOTE_FE, {
    recursive: true,
    concurrency: 10,
    validate: (itemPath) => true,
  });

  if (feStatus) {
    console.log(`✅ FE Upload complete!`);
  } else {
    console.error(`⚠️ FE Upload finished with errors.`);
  }

  console.log('📦 Uploading BE directory...');
  const beStatus = await ssh.putDirectory(LOCAL_BE, REMOTE_BE, {
    recursive: true,
    concurrency: 10,
    validate: (itemPath) => {
        const basename = path.basename(itemPath);
        return basename !== 'node_modules' && basename !== '.git' && basename !== '.env';
    },
  });

  if (beStatus) {
    console.log(`✅ BE Upload complete!`);
  } else {
    console.error(`⚠️ BE Upload finished with errors.`);
  }

  console.log('🎉 Deployment to aiccloud finished successfully!');
  ssh.dispose();
}

deploy().catch((err) => {
  console.error('❌ Deployment error:', err);
  process.exit(1);
});
