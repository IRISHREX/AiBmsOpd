/**
 * deploy-hostinger.js
 * 
 * Direct SSH deployment to Hostinger for BMS-OPD Frontend
 * Target: novel.mkinfotrack.com (/home/u832627210/domains/mkinfotrack.com/public_html/novel)
 */

const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const path = require('path');
const fs = require('fs');

const SSH_CONFIG = {
  host: '147.93.17.56',
  port: 65002,
  username: 'u832627210',
  password: 'Sohel@34892',
  readyTimeout: 30000,
};

const LOCAL_DIST = path.join(__dirname, 'BMS-opd-fe', 'dist');
const REMOTE_DEST = '/home/u832627210/domains/mkinfotrack.com/public_html/novel';

async function deploy() {
  const ssh = new NodeSSH();
  
  if (!fs.existsSync(LOCAL_DIST)) {
    console.error('❌ dist directory not found! Run npm run build first.');
    process.exit(1);
  }

  console.log('🚀 Connecting to Hostinger via SSH...');
  await ssh.connect(SSH_CONFIG);
  console.log('✅ Connected to Hostinger server!');

  console.log(`📁 Target directory: ${REMOTE_DEST}`);
  
  // Verify remote target directory exists
  const checkDir = await ssh.execCommand(`ls -d ${REMOTE_DEST}`);
  if (checkDir.code !== 0) {
    console.error(`❌ Remote directory ${REMOTE_DEST} does not exist.`);
    ssh.dispose();
    process.exit(1);
  }

  console.log('📦 Uploading dist directory to novel.mkinfotrack.com...');
  const failed = [];
  const successful = [];

  const status = await ssh.putDirectory(LOCAL_DIST, REMOTE_DEST, {
    recursive: true,
    concurrency: 10,
    validate: (itemPath) => true,
    tick: (localPath, remotePath, error) => {
      if (error) {
        failed.push(localPath);
      } else {
        successful.push(localPath);
      }
    }
  });

  if (status) {
    console.log(`✅ Upload complete! Successfully transferred ${successful.length} files.`);
  } else {
    console.error(`⚠️ Upload finished with errors. Failed files:`, failed);
  }

  // Ensure correct file permissions
  console.log('🔒 Setting permissions...');
  await ssh.execCommand(`find ${REMOTE_DEST} -type f -exec chmod 644 {} \\;`);
  await ssh.execCommand(`find ${REMOTE_DEST} -type d -exec chmod 755 {} \\;`);

  console.log('🎉 Deployment to novel.mkinfotrack.com finished successfully!');
  ssh.dispose();
}

deploy().catch((err) => {
  console.error('❌ Deployment error:', err);
  process.exit(1);
});
