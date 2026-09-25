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
  
  console.log('--- Checking Port 80/443 ---');
  const ports = await ssh.execCommand('ss -tulpn | grep -E "(:80|:443)"');
  console.log(ports.stdout);

  ssh.dispose();
}

check().catch(console.error);
