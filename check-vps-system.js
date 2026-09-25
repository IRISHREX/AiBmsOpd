const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 30000,
};

async function checkServer() {
  const ssh = new NodeSSH();
  await ssh.connect(SSH_CONFIG);
  
  console.log('--- OS Info ---');
  const osInfo = await ssh.execCommand('lsb_release -a');
  console.log(osInfo.stdout);

  console.log('--- Memory Info ---');
  const memInfo = await ssh.execCommand('free -m');
  console.log(memInfo.stdout);

  console.log('--- Disk Info ---');
  const diskInfo = await ssh.execCommand('df -h /');
  console.log(diskInfo.stdout);

  console.log('--- Check Mongod ---');
  const mongoCheck = await ssh.execCommand('mongod --version || which mongod || which mongosh');
  console.log(mongoCheck.stdout || mongoCheck.stderr);

  ssh.dispose();
}

checkServer().catch(console.error);
