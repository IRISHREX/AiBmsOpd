const path = require('path');
const fs = require('fs');

function getNodeSSH() {
  try {
    const { NodeSSH } = require('node-ssh');
    return NodeSSH;
  } catch (e1) {
    try {
      const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
      return NodeSSH;
    } catch (e2) {
      throw new Error('node-ssh package could not be resolved. Please run: npm install in aiccloud-deployment directory');
    }
  }
}

async function connectVPS(config, maxAttempts = 3) {
  const NodeSSH = getNodeSSH();
  const ssh = new NodeSSH();

  const sshConfig = {
    host: config.VPS_HOST,
    port: config.VPS_PORT,
    username: config.VPS_USER,
    password: config.VPS_PASSWORD,
    readyTimeout: 60000,
  };

  let connected = false;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      console.log(`🔌 Connecting to VPS [${config.VPS_HOST}:${config.VPS_PORT}] (Attempt ${attempt}/${maxAttempts})...`);
      await ssh.connect(sshConfig);
      connected = true;
      break;
    } catch (e) {
      console.warn(`⚠️ Attempt ${attempt} failed: ${e.message}`);
      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 3000));
      }
    }
  }

  if (!connected) {
    throw new Error(`Failed to establish SSH connection to ${config.VPS_HOST} after ${maxAttempts} attempts.`);
  }

  console.log('✅ Connected to VPS successfully!\n');
  return ssh;
}

module.exports = {
  connectVPS,
};
