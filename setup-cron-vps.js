const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const path = require('path');

const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 30000,
};

async function setupCron() {
  const ssh = new NodeSSH();
  await ssh.connect(SSH_CONFIG);

  console.log('📦 Uploading runS3Backup.js...');
  await ssh.execCommand('mkdir -p /root/BMS-opd-be/scripts');
  await ssh.putFile(
    path.join(__dirname, 'BMS-opd-be', 'scripts', 'runS3Backup.js'),
    '/root/BMS-opd-be/scripts/runS3Backup.js'
  );

  console.log('⚙️ Creating /root/backup-to-s3.sh...');
  const shellScript = `#!/bin/bash
set -e
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
BACKUP_DIR="/root/db_backups/$TIMESTAMP"
mkdir -p "$BACKUP_DIR"

# 1. mongodump compressed archive
mongodump --uri="mongodb://127.0.0.1:27017/MERN_STACK_HOSPITAL_MANAGEMENT" --archive="$BACKUP_DIR/mongo_dump.gz" --gzip

# 2. Upload archive & CSVs to aiccloud S3
cd /root/BMS-opd-be
node scripts/runS3Backup.js "$BACKUP_DIR/mongo_dump.gz" "$TIMESTAMP"

# 3. Clean local backups older than 7 days
find /root/db_backups -mindepth 1 -maxdepth 1 -type d -mtime +7 -exec rm -rf {} +
`;
  await ssh.execCommand(`printf '%s\\n' '${shellScript.trim()}' > /root/backup-to-s3.sh`);
  await ssh.execCommand('chmod +x /root/backup-to-s3.sh');

  console.log('🧪 Testing backup script execution...');
  const testRun = await ssh.execCommand('/root/backup-to-s3.sh');
  console.log(testRun.stdout || testRun.stderr);

  console.log('⏰ Scheduling daily cron job (runs every day at 02:00 AM UTC)...');
  const cronJob = '0 2 * * * /root/backup-to-s3.sh >> /var/log/bms-backup.log 2>&1';
  await ssh.execCommand(`(crontab -l 2>/dev/null | grep -v 'backup-to-s3.sh' ; echo "${cronJob}") | crontab -`);

  const listCron = await ssh.execCommand('crontab -l');
  console.log('Active Crontab:');
  console.log(listCron.stdout);

  ssh.dispose();
  console.log('🎉 S3 Backup Cron Job setup successfully!');
}

setupCron().catch(console.error);
