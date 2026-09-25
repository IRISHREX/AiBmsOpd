const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 30000,
};

async function diagnose() {
  const ssh = new NodeSSH();
  await ssh.connect(SSH_CONFIG);

  async function run(cmd) {
    console.log(`\n> ${cmd}`);
    const r = await ssh.execCommand(cmd);
    if (r.stdout) console.log(r.stdout);
    if (r.stderr) console.error(r.stderr);
    return r;
  }

  // Find ALL network interfaces and their IPs
  await run('ip addr show');

  // Find the default route / gateway
  await run('ip route');

  // Check all open ports
  await run('ss -tulpn');

  // Check what Nginx is actually serving
  await run('curl -v http://localhost 2>&1 | head -20');

  ssh.dispose();
}

diagnose().catch(console.error);
