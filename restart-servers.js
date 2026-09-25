const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 30000,
};

async function restartAndCheck() {
  const ssh = new NodeSSH();
  await ssh.connect(SSH_CONFIG);
  
  console.log('--- Restarting Backend ---');
  await ssh.execCommand('pm2 restart all');
  
  console.log('--- Restarting Nginx ---');
  await ssh.execCommand('systemctl restart nginx');

  // Wait 2 seconds for logs to populate
  await new Promise(r => setTimeout(r, 2000));

  console.log('--- PM2 Backend Logs ---');
  const pm2Logs = await ssh.execCommand('pm2 logs --nostream --lines 10');
  console.log(pm2Logs.stdout);
  
  console.log('--- Testing Frontend Internally ---');
  const curlFe = await ssh.execCommand('curl -I http://localhost');
  console.log(curlFe.stdout);

  console.log('--- Testing Backend API Internally ---');
  // We'll hit a non-existent API endpoint or the root, just to see if it responds via Nginx
  const curlBe = await ssh.execCommand('curl -I http://localhost/api/test');
  console.log(curlBe.stdout);

  ssh.dispose();
}

restartAndCheck().catch(console.error);
