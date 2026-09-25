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
  
  console.log('--- Nginx Access Logs ---');
  const logs = await ssh.execCommand('tail -n 10 /var/log/nginx/access.log');
  console.log(logs.stdout);

  ssh.dispose();
}

check().catch(console.error);
