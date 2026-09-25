const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
(async () => {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '148.113.6.25',
    port: 20172,
    username: 'root',
    password: 'Ml0NqUQECgW2nFDF'
  });
  const res = await ssh.execCommand('curl -s -i -X POST http://localhost:5000/api/v1/prescription/save -H "Content-Type: application/json" -d "{\\"patientId\\": \\"6ab5ff778ec7f414dfa3da6a\\", \\"doctorId\\": \\"6ab5cc01ab2888ce1b48ff8c\\"}"');
  console.log('--- Test Prescription Save ---');
  console.log(res.stdout);
  ssh.dispose();
})();
