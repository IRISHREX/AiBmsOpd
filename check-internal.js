const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 30000,
};

async function checkInternally() {
  const ssh = new NodeSSH();
  await ssh.connect(SSH_CONFIG);
  
  console.log('--- PM2 Logs ---');
  const pm2Logs = await ssh.execCommand('pm2 logs --nostream --lines 10');
  console.log(pm2Logs.stdout);
  
  console.log('--- Nginx Error Logs ---');
  const errorLogs = await ssh.execCommand('tail -n 10 /var/log/nginx/error.log');
  console.log(errorLogs.stdout);

  console.log('--- Curl Frontend Locally ---');
  const curlFe = await ssh.execCommand('curl -I http://localhost');
  console.log(curlFe.stdout);

  console.log('--- Curl Backend Locally ---');
  const curlBe = await ssh.execCommand('curl -I http://localhost/api');
  console.log(curlBe.stdout);

  ssh.dispose();
}

checkInternally().catch(console.error);
