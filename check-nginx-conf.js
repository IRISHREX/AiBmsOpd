const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 30000,
};

async function checkNginx() {
  const ssh = new NodeSSH();
  await ssh.connect(SSH_CONFIG);
  
  console.log('--- Nginx Config ---');
  const conf = await ssh.execCommand('cat /etc/nginx/sites-available/default');
  console.log(conf.stdout);

  console.log('--- Restart Nginx ---');
  await ssh.execCommand('systemctl restart nginx');
  
  ssh.dispose();
}

checkNginx().catch(console.error);
