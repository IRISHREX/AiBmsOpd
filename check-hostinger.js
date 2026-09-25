const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const SSH_CONFIG = {
  host: '147.93.17.56',
  port: 65002,
  username: 'u832627210',
  password: 'Sohel@34892',
  readyTimeout: 30000,
};

async function check() {
  const ssh = new NodeSSH();
  await ssh.connect(SSH_CONFIG);
  
  console.log('--- Domains in Hostinger ---');
  const domains = await ssh.execCommand('ls -la /home/u832627210/domains/');
  console.log(domains.stdout);
  
  console.log('--- biomechasoft.in ---');
  const biomecha = await ssh.execCommand('ls -la /home/u832627210/domains/biomechasoft.in/public_html || echo "Not found"');
  console.log(biomecha.stdout);

  ssh.dispose();
}

check().catch(console.error);
