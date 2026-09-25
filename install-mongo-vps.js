const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 60000,
};

async function installMongoDB() {
  const ssh = new NodeSSH();
  console.log('🚀 Connecting to VPS...');
  await ssh.connect(SSH_CONFIG);
  console.log('✅ Connected!');

  async function run(cmd) {
    console.log(`> ${cmd}`);
    const res = await ssh.execCommand(cmd);
    if (res.stdout) console.log(res.stdout);
    if (res.stderr && !res.stderr.includes('Warning') && !res.stderr.includes('notice')) console.error(res.stderr);
    return res;
  }

  // 1. Install prerequisites & MongoDB 8.0 (official for Ubuntu 24.04 noble)
  console.log('📦 Setting up MongoDB 8.0 repository for Ubuntu 24.04...');
  await run('apt-get update -y > /dev/null 2>&1');
  await run('apt-get install -y gnupg curl');

  await run('curl -fsSL https://www.mongodb.org/static/pgp/server-8.0.asc | gpg -o /usr/share/keyrings/mongodb-server-8.0.gpg --dearmor --yes');
  await run('echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-8.0.gpg ] https://repo.mongodb.org/apt/ubuntu noble/mongodb-org/8.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-8.0.list');
  await run('apt-get update -y');

  console.log('📦 Installing mongodb-org & tools...');
  const installRes = await run('apt-get install -y mongodb-org mongodb-org-tools');
  
  if (installRes.code !== 0) {
    console.log('⚠️ Noble 8.0 repo failed, trying 7.0 fallback...');
    await run('curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor --yes');
    await run('echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | tee /etc/apt/sources.list.d/mongodb-org-7.0.list');
    await run('apt-get update -y');
    await run('apt-get install -y mongodb-org mongodb-org-tools');
  }

  // 2. Configure WiredTiger Cache to 256MB to avoid consuming 1GB RAM
  console.log('⚙️ Configuring mongod.conf memory limits...');
  const mongodConf = `
storage:
  dbPath: /var/lib/mongodb
  wiredTiger:
    engineConfig:
      cacheSizeGB: 0.25

systemLog:
  destination: file
  logAppend: true
  path: /var/log/mongodb/mongod.log

net:
  port: 27017
  bindIp: 127.0.0.1

processManagement:
  timeZoneInfo: /usr/share/zoneinfo
`;
  await run(`printf '%s\\n' '${mongodConf.trim()}' > /etc/mongod.conf`);

  // 3. Start & enable MongoDB
  console.log('🟢 Starting mongod service...');
  await run('systemctl daemon-reload');
  await run('systemctl enable mongod');
  await run('systemctl restart mongod');

  await new Promise(r => setTimeout(r, 3000));
  const status = await run('systemctl status mongod --no-pager');
  console.log(status.stdout);

  const checkPort = await run('ss -tulpn | grep 27017');
  console.log(checkPort.stdout);

  ssh.dispose();
  console.log('🎉 MongoDB installation complete!');
}

installMongoDB().catch(err => {
  console.error('❌ Failed:', err);
  process.exit(1);
});
