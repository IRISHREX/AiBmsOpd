const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 60000,
};

const ATLAS_URI = 'mongodb+srv://Irishrex:Samima2006@irishrex.p1e0kow.mongodb.net/MERN_STACK_HOSPITAL_MANAGEMENT';
const LOCAL_URI = 'mongodb://127.0.0.1:27017/MERN_STACK_HOSPITAL_MANAGEMENT';

async function migrateData() {
  const ssh = new NodeSSH();
  console.log('🚀 Connecting to VPS...');
  await ssh.connect(SSH_CONFIG);
  console.log('✅ Connected!');

  async function run(cmd) {
    console.log(`> ${cmd}`);
    const res = await ssh.execCommand(cmd);
    if (res.stdout) console.log(res.stdout);
    if (res.stderr) console.error(res.stderr);
    return res;
  }

  console.log('📥 1. Dumping data from MongoDB Atlas...');
  await run('rm -rf /root/atlas_backup');
  const dumpRes = await run(`mongodump --uri="${ATLAS_URI}" --out=/root/atlas_backup`);
  
  console.log('📤 2. Restoring data into local MongoDB (127.0.0.1:27017)...');
  const restoreRes = await run(`mongorestore --uri="${LOCAL_URI}" /root/atlas_backup/MERN_STACK_HOSPITAL_MANAGEMENT`);

  console.log('🔍 3. Verifying local collections and document counts...');
  const verifyScript = `
    const conn = new Mongo('mongodb://127.0.0.1:27017');
    const db = conn.getDB('MERN_STACK_HOSPITAL_MANAGEMENT');
    const cols = db.getCollectionNames();
    print('Collections in local MongoDB:');
    cols.forEach(c => {
      print(' - ' + c + ': ' + db.getCollection(c).countDocuments() + ' documents');
    });
  `;
  await run(`mongosh --quiet --eval "${verifyScript.replace(/\n/g, ' ')}"`);

  ssh.dispose();
  console.log('🎉 Migration finished!');
}

migrateData().catch(err => {
  console.error('❌ Migration failed:', err);
  process.exit(1);
});
