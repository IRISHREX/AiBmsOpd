const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
const SSH_CONFIG = {
  host: '148.113.6.25',
  port: 20172,
  username: 'root',
  password: 'Ml0NqUQECgW2nFDF',
  readyTimeout: 30000,
};

async function testBackup() {
  const ssh = new NodeSSH();
  await ssh.connect(SSH_CONFIG);
  
  console.log('Testing S3 backup script on VPS...');
  const testScript = `
    import { uploadCsvBackupToS3, listS3Backups } from './utils/s3Storage.js';
    import mongoose from 'mongoose';
    import { Medicine } from './models/medicineSchema.js';
    import { Appointment } from './models/appointmentSchema.js';

    await mongoose.connect('mongodb://127.0.0.1:27017/MERN_STACK_HOSPITAL_MANAGEMENT');
    console.log('Connected to DB for backup test');

    const medCount = await Medicine.countDocuments();
    const aptCount = await Appointment.countDocuments();
    console.log('Medicines in local DB:', medCount);
    console.log('Appointments in local DB:', aptCount);

    const testTime = new Date().toISOString().replace(/[:.]/g, '-');
    await uploadCsvBackupToS3(testTime + '_backup_verification.csv', 'Test,Count\\nMedicines,' + medCount + '\\nAppointments,' + aptCount);
    console.log('Uploaded verification CSV to S3!');

    const backups = await listS3Backups();
    console.log('Current backups in S3 bucket:');
    backups.forEach(b => console.log(' - ' + b.key + ' (' + b.size + ' bytes)'));

    await mongoose.disconnect();
  `;

  const res = await ssh.execCommand(`node --input-type=module -e "${testScript.replace(/\n/g, ' ')}"`, { cwd: '/root/BMS-opd-be' });
  console.log(res.stdout || res.stderr);

  ssh.dispose();
}

testBackup().catch(console.error);
