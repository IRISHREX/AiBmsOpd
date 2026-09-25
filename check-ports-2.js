const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 30000,
};

async function checkCaddy() {
  const ssh = new NodeSSH();
  await ssh.connect(SSH_CONFIG);
  
  console.log('--- Services listening on 80/443 ---');
  const ports = await ssh.execCommand('ss -tulpn | grep -E "(:80|:443)"');
  console.log(ports.stdout);

  ssh.dispose();
}

checkCaddy().catch(console.error);
