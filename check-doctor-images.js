const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 30000,
};

async function inspectDoctors() {
  const ssh = new NodeSSH();
  await ssh.connect(SSH_CONFIG);
  
  const checkScript = `
    const conn = new Mongo('mongodb://127.0.0.1:27017');
    const db = conn.getDB('MERN_STACK_HOSPITAL_MANAGEMENT');
    const doctors = db.getCollection('users').find({ role: 'Doctor' }, {
      firstName: 1, lastName: 1, email: 1, docAvatar: 1, signImage: 1, stampImage: 1, headerImage: 1, footerImage: 1
    }).toArray();
    print(JSON.stringify(doctors, null, 2));
  `;

  const res = await ssh.execCommand(`mongosh --quiet --eval "${checkScript.replace(/\n/g, ' ')}"`);
  console.log('Doctors in local DB:');
  console.log(res.stdout);

  console.log('Files in /root/BMS-opd-be/uploads:');
  const lsRes = await ssh.execCommand('ls -la /root/BMS-opd-be/uploads/doctors || true');
  console.log(lsRes.stdout);

  ssh.dispose();
}

inspectDoctors().catch(console.error);
