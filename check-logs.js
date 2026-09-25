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
  
  console.log('--- PM2 Logs ---');
  const pm2 = await ssh.execCommand('pm2 logs --nostream --lines 50');
  console.log(pm2.stdout);
  console.error(pm2.stderr);

  console.log('--- Nginx Status ---');
  const nginx = await ssh.execCommand('systemctl status nginx');
  console.log(nginx.stdout);

  ssh.dispose();
}

check().catch(console.error);
