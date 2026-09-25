const { NodeSSH } = require('c:/PROJECTS/bms-ngo/scratch_deploy/node_modules/node-ssh');
(async () => {
  const ssh = new NodeSSH();
  await ssh.connect({
    host: '148.113.6.25',
    port: 20172,
    username: 'root',
    password: 'Ml0NqUQECgW2nFDF'
  });
  const res = await ssh.execCommand('curl -s -i -X POST http://localhost/api/v1/user/login -H "Content-Type: application/json" -d "{}"');
  console.log('--- Test API through Nginx ---');
  console.log(res.stdout);
  ssh.dispose();
})();
