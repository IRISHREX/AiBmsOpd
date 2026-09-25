const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 30000,
};

async function check() {
  const ssh = new NodeSSH();
  await ssh.connect(SSH_CONFIG);
  
  console.log('--- Nginx Error Logs ---');
  const errorLogs = await ssh.execCommand('tail -n 20 /var/log/nginx/error.log');
  console.log(errorLogs.stdout);
  
  console.log('--- PM2 Logs ---');
  const pm2Logs = await ssh.execCommand('pm2 logs --nostream --lines 20');
  console.log(pm2Logs.stdout);

  ssh.dispose();
}

check().catch(console.error);
