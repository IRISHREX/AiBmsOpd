#!/usr/bin/env node

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const { getConfig, promptForPaths } = require('./config');
const { connectVPS } = require('./sshClient');
const { recordDeployment, getLastDeployment } = require('./history');

// Parse CLI command and arguments
const rawArgs = process.argv.slice(2);
let command = (rawArgs[0] || 'help').toLowerCase();
let target = (rawArgs[1] || '').toLowerCase();

// Support npm run add:be, push:fe, report:be, etc.
if (command.includes(':')) {
  const parts = command.split(':');
  command = parts[0];
  target = parts[1];
}

async function run() {
  switch (command) {
    case 'setup':
      await runSetup();
      break;

    case 'add':
      await handleAdd(target);
      break;

    case 'push':
    case 'deploy':
      await handlePush(target);
      break;

    case 'report':
    case 'status':
      await handleReport(target);
      break;

    case 'help':
    default:
      printHelp();
      break;
  }
}

// ----------------------------------------------------
// 1. SETUP
// ----------------------------------------------------
async function runSetup() {
  await promptForPaths(true);
  console.log('🎉 Setup configuration finished.');
}

// ----------------------------------------------------
// 2. ADD COMMAND (add be / add fe)
// ----------------------------------------------------
async function handleAdd(subTarget) {
  if (!subTarget || (subTarget !== 'be' && subTarget !== 'fe' && subTarget !== 'backend' && subTarget !== 'frontend')) {
    console.error('❌ Please specify what to add: "be" (backend) or "fe" (frontend)');
    console.log('   Example: npm run add be   OR   npm run add fe\n');
    process.exit(1);
  }

  const isBe = subTarget === 'be' || subTarget === 'backend';
  const config = getConfig();
  const targetDir = isBe ? config.LOCAL_BACKEND_PATH : config.LOCAL_FRONTEND_PATH;
  const label = isBe ? 'Backend' : 'Frontend';

  if (!fs.existsSync(targetDir)) {
    console.error(`❌ Target directory does not exist: ${targetDir}`);
    console.log('   Please run "npm run setup" to configure correct paths.');
    process.exit(1);
  }

  console.log('\n========================================================');
  console.log(` 📦 STAGING FILES: ${label.toUpperCase()}`);
  console.log('========================================================');
  console.log(`Directory: ${targetDir}`);

  try {
    // Check status before staging
    const beforeStatus = execSync('git status --porcelain', { cwd: targetDir, encoding: 'utf8' }).trim();
    if (!beforeStatus) {
      console.log('ℹ️  Working directory is already clean. No new or modified files to add.\n');
      showGitSummary(targetDir);
      return;
    }

    // Stage changes
    execSync('git add .', { cwd: targetDir, stdio: 'inherit' });

    // Read staged changes
    const stagedStatus = execSync('git status -s', { cwd: targetDir, encoding: 'utf8' }).trim();
    const lines = stagedStatus.split('\n').filter(Boolean);

    console.log('\n📋 Staged Files for Commit:');
    let addedCount = 0;
    for (const line of lines) {
      const code = line.slice(0, 2).trim();
      const filename = line.slice(3).trim();
      let statusIcon = '📝 Modified';
      if (code === 'A' || code === '??') statusIcon = '✨ Added';
      else if (code === 'D') statusIcon = '🗑️ Deleted';
      else if (code === 'R') statusIcon = '🔄 Renamed';

      console.log(`   [${statusIcon}] ${filename}`);
      addedCount++;
    }

    console.log(`\n✅ Successfully added ${addedCount} file(s) in ${label}!`);
    showGitSummary(targetDir);

    console.log(`💡 Next step: Run "npm run push ${isBe ? 'be' : 'fe'}" to commit, build, and deploy to aiccloud VPS!\n`);
  } catch (err) {
    console.error(`❌ Error staging files in ${label}:`, err.message);
    process.exit(1);
  }
}

// ----------------------------------------------------
// 3. PUSH COMMAND (push be / push fe)
// ----------------------------------------------------
async function handlePush(subTarget) {
  if (!subTarget || (subTarget !== 'be' && subTarget !== 'fe' && subTarget !== 'backend' && subTarget !== 'frontend')) {
    console.error('❌ Please specify what to push: "be" (backend) or "fe" (frontend)');
    console.log('   Example: npm run push fe   OR   npm run push be\n');
    process.exit(1);
  }

  const isBe = subTarget === 'be' || subTarget === 'backend';
  const config = getConfig();

  if (isBe) {
    await pushBackend(config);
  } else {
    await pushFrontend(config);
  }
}

// Push Frontend: Git push + npm run build + upload dist + reload Nginx
async function pushFrontend(config) {
  const feDir = config.LOCAL_FRONTEND_PATH;
  const branch = config.GIT_FRONTEND_BRANCH;
  console.log('\n========================================================');
  console.log(' 🚀 DEPLOYING FRONTEND TO aiccloud VPS');
  console.log('========================================================');
  console.log(`Frontend Directory: ${feDir}`);
  console.log(`Target VPS:         ${config.VPS_HOST}:${config.VPS_PORT}`);
  console.log(`Remote Path:        ${config.REMOTE_FRONTEND_PATH}`);
  console.log(`Production URL:     ${config.APP_DOMAIN}\n`);

  // Step 1: Git auto-commit & push if changes exist
  await syncGitRepo(feDir, branch, 'chore: automated frontend update for aiccloud deploy');

  // Step 2: Build local frontend bundle
  console.log('🔨 Step 1: Building production frontend bundle (npm run build)...');
  try {
    execSync('npm run build', { cwd: feDir, stdio: 'inherit' });
  } catch (buildErr) {
    console.error('❌ Frontend build failed! Aborting deployment.');
    process.exit(1);
  }

  const distDir = path.join(feDir, 'dist');
  if (!fs.existsSync(distDir)) {
    console.error(`❌ Build directory not found: ${distDir}`);
    process.exit(1);
  }
  console.log('✅ Frontend bundle created successfully!\n');

  // Step 3: Connect to VPS and upload dist
  console.log('📦 Step 2: Uploading dist to VPS and restarting Nginx...');
  const ssh = await connectVPS(config);

  try {
    console.log(`🧹 Cleaning remote directory: ${config.REMOTE_FRONTEND_PATH}/*`);
    await ssh.execCommand(`rm -rf ${config.REMOTE_FRONTEND_PATH}/*`);

    console.log('📤 Uploading new frontend assets...');
    await ssh.putDirectory(distDir, config.REMOTE_FRONTEND_PATH, {
      recursive: true,
      concurrency: 10,
    });
    console.log('✅ Frontend assets uploaded!');

    console.log('🔄 Restarting Nginx web server...');
    const restartRes = await ssh.execCommand('systemctl restart nginx');
    if (restartRes.code !== 0) {
      console.warn('⚠️ Nginx restart returned notice:', restartRes.stderr || restartRes.stdout);
    }
    console.log('✅ Nginx restarted!');

    console.log('🔍 Testing localhost on VPS...');
    const testRes = await ssh.execCommand('curl -s -I http://localhost');
    console.log(testRes.stdout || testRes.stderr);

    const latestCommit = getLatestCommitHash(feDir);
    recordDeployment('frontend', {
      commit: latestCommit,
      branch,
      status: 'SUCCESS',
      notes: 'Frontend dist deployed via aiccloud-deployment',
    });

    console.log('========================================================');
    console.log(' 🎉 FRONTEND DEPLOYMENT COMPLETED SUCCESSFULLY!');
    console.log(` 🌐 Live Site: ${config.APP_DOMAIN}`);
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ Frontend deployment failed during upload/restart:', err.message);
  } finally {
    ssh.dispose();
  }
}

// Push Backend: Git push + upload BE files + upload .env + npm install + PM2 restart
async function pushBackend(config) {
  const beDir = config.LOCAL_BACKEND_PATH;
  const branch = config.GIT_BACKEND_BRANCH;
  console.log('\n========================================================');
  console.log(' 🚀 DEPLOYING BACKEND TO aiccloud VPS');
  console.log('========================================================');
  console.log(`Backend Directory:  ${beDir}`);
  console.log(`Target VPS:         ${config.VPS_HOST}:${config.VPS_PORT}`);
  console.log(`Remote Path:        ${config.REMOTE_BACKEND_PATH}`);
  console.log(`PM2 Process Name:   ${config.PM2_APP_NAME}\n`);

  // Step 1: Git auto-commit & push if changes exist
  await syncGitRepo(beDir, branch, 'chore: automated backend update for aiccloud deploy');

  // Step 2: Connect to VPS
  const ssh = await connectVPS(config);

  try {
    console.log('📦 Step 1: Uploading backend files to VPS...');
    await ssh.putDirectory(beDir, config.REMOTE_BACKEND_PATH, {
      recursive: true,
      concurrency: 8,
      validate: (itemPath) => {
        const norm = itemPath.replace(/\\/g, '/');
        return !norm.includes('/node_modules') && !norm.includes('/.git');
      },
    });
    console.log('✅ Backend files uploaded!');

    // Upload .env if exists
    const localEnv = path.join(beDir, '.env');
    if (fs.existsSync(localEnv)) {
      console.log('📦 Step 2: Uploading backend .env...');
      await ssh.putFile(localEnv, `${config.REMOTE_BACKEND_PATH}/.env`);
      console.log('✅ .env uploaded!');
    }

    console.log('📦 Step 3: Installing npm dependencies on VPS...');
    await ssh.execCommand('npm install --production', { cwd: config.REMOTE_BACKEND_PATH });
    console.log('✅ Dependencies verified!');

    console.log(`🔄 Step 4: Restarting PM2 process "${config.PM2_APP_NAME}"...`);
    const pm2Cmd = `pm2 restart ${config.PM2_APP_NAME} || pm2 start server.js --name "${config.PM2_APP_NAME}"`;
    const restartRes = await ssh.execCommand(pm2Cmd, { cwd: config.REMOTE_BACKEND_PATH });
    console.log(restartRes.stdout || restartRes.stderr);

    console.log('⏳ Waiting for process stabilization...');
    await new Promise((r) => setTimeout(r, 2500));

    console.log('\n📋 Latest PM2 Logs:');
    const logs = await ssh.execCommand(`pm2 logs ${config.PM2_APP_NAME} --nostream --lines 10`);
    console.log(logs.stdout || logs.stderr);

    const latestCommit = getLatestCommitHash(beDir);
    recordDeployment('backend', {
      commit: latestCommit,
      branch,
      status: 'SUCCESS',
      notes: 'Backend deployed and PM2 restarted',
    });

    console.log('========================================================');
    console.log(' 🎉 BACKEND DEPLOYMENT COMPLETED SUCCESSFULLY!');
    console.log(` 🚀 API Endpoint: ${config.APP_DOMAIN}/api`);
    console.log('========================================================\n');
  } catch (err) {
    console.error('❌ Backend deployment failed:', err.message);
  } finally {
    ssh.dispose();
  }
}

// ----------------------------------------------------
// 4. REPORT COMMAND (report fe / report be / report)
// ----------------------------------------------------
async function handleReport(subTarget) {
  const config = getConfig();

  if (!subTarget || subTarget === 'all') {
    await reportFrontend(config);
    await reportBackend(config);
    return;
  }

  if (subTarget === 'fe' || subTarget === 'frontend') {
    await reportFrontend(config);
  } else if (subTarget === 'be' || subTarget === 'backend') {
    await reportBackend(config);
  } else {
    console.error(`❌ Unknown report target: "${subTarget}". Use "fe", "be", or leave empty.`);
    process.exit(1);
  }
}

async function reportFrontend(config) {
  console.log('\n========================================================');
  console.log(' 📊 FRONTEND STATUS & LOG REPORT (aiccloud VPS)');
  console.log('========================================================');

  const lastDeploy = getLastDeployment('frontend');
  if (lastDeploy) {
    console.log(`🕒 Last Deployed:    ${lastDeploy.localTime || lastDeploy.timestamp}`);
    console.log(`📌 Commit:           ${lastDeploy.commit}`);
    console.log(`🌿 Branch:           ${lastDeploy.branch}`);
    console.log(`✅ Status:           ${lastDeploy.status}`);
  } else {
    console.log('🕒 Last Deployed:    No local history record found (prior deployment was manual)');
  }

  const ssh = await connectVPS(config);
  try {
    console.log('\n🌐 Live Domain Check:');
    const curlRes = await ssh.execCommand('curl -s -I http://localhost');
    const firstLine = (curlRes.stdout || '').split('\n')[0] || 'Unknown';
    console.log(`   Nginx Response: ${firstLine}`);

    console.log('\n📋 Last 3 Nginx Access Logs (/var/log/nginx/access.log):');
    const accessLogs = await ssh.execCommand('tail -n 3 /var/log/nginx/access.log');
    if (accessLogs.stdout && accessLogs.stdout.trim()) {
      console.log(accessLogs.stdout.trim());
    } else {
      console.log('   (No recent access log entries)');
    }

    console.log('\n⚠️ Last 3 Nginx Error Logs (/var/log/nginx/error.log):');
    const errorLogs = await ssh.execCommand('tail -n 3 /var/log/nginx/error.log');
    if (errorLogs.stdout && errorLogs.stdout.trim()) {
      console.log(errorLogs.stdout.trim());
    } else {
      console.log('   (No error log entries)');
    }
  } catch (e) {
    console.error('❌ Failed fetching frontend report from VPS:', e.message);
  } finally {
    ssh.dispose();
  }
  console.log('========================================================\n');
}

async function reportBackend(config) {
  console.log('\n========================================================');
  console.log(' 📊 BACKEND STATUS & LOG REPORT (aiccloud VPS)');
  console.log('========================================================');

  const lastDeploy = getLastDeployment('backend');
  if (lastDeploy) {
    console.log(`🕒 Last Deployed:    ${lastDeploy.localTime || lastDeploy.timestamp}`);
    console.log(`📌 Commit:           ${lastDeploy.commit}`);
    console.log(`🌿 Branch:           ${lastDeploy.branch}`);
    console.log(`✅ Status:           ${lastDeploy.status}`);
  } else {
    console.log('🕒 Last Deployed:    No local history record found (prior deployment was manual)');
  }

  const ssh = await connectVPS(config);
  try {
    console.log(`\n⚙️ PM2 Service Status [${config.PM2_APP_NAME}]:`);
    const pm2Status = await ssh.execCommand(`pm2 describe ${config.PM2_APP_NAME}`);
    if (pm2Status.stdout.includes('status')) {
      const lines = pm2Status.stdout.split('\n');
      for (const line of lines) {
        if (line.includes('status') || line.includes('uptime') || line.includes('restarts') || line.includes('mem')) {
          console.log(`   ${line.trim()}`);
        }
      }
    } else {
      const list = await ssh.execCommand('pm2 status');
      console.log(list.stdout.trim());
    }

    console.log('\n📋 Last 3 Backend Output Logs (/root/.pm2/logs/bms-backend-out.log):');
    const outLogs = await ssh.execCommand(`tail -n 3 /root/.pm2/logs/${config.PM2_APP_NAME}-out.log`);
    if (outLogs.stdout && outLogs.stdout.trim()) {
      console.log(outLogs.stdout.trim());
    } else {
      console.log('   (No recent output entries)');
    }

    console.log('\n⚠️ Last 3 Backend Error Logs (/root/.pm2/logs/bms-backend-error.log):');
    const errLogs = await ssh.execCommand(`tail -n 3 /root/.pm2/logs/${config.PM2_APP_NAME}-error.log`);
    if (errLogs.stdout && errLogs.stdout.trim()) {
      console.log(errLogs.stdout.trim());
    } else {
      console.log('   (No recent error entries)');
    }
  } catch (e) {
    console.error('❌ Failed fetching backend report from VPS:', e.message);
  } finally {
    ssh.dispose();
  }
  console.log('========================================================\n');
}

// ----------------------------------------------------
// HELPER FUNCTIONS
// ----------------------------------------------------
function showGitSummary(repoDir) {
  try {
    const branch = execSync('git branch --show-current', { cwd: repoDir, encoding: 'utf8' }).trim();
    const commit = execSync('git log -1 --pretty=format:"%h - %s (%cr)"', { cwd: repoDir, encoding: 'utf8' }).trim();
    console.log(`🌿 Branch: ${branch}`);
    console.log(`🔖 Latest Commit: ${commit}\n`);
  } catch (e) {}
}

function getLatestCommitHash(repoDir) {
  try {
    return execSync('git rev-parse --short HEAD', { cwd: repoDir, encoding: 'utf8' }).trim();
  } catch (e) {
    return 'HEAD';
  }
}

async function syncGitRepo(repoDir, branch, defaultCommitMsg) {
  try {
    const status = execSync('git status --porcelain', { cwd: repoDir, encoding: 'utf8' }).trim();
    if (status) {
      console.log(`📝 Uncommitted changes detected in ${repoDir}. Staging and committing...`);
      execSync('git add .', { cwd: repoDir, stdio: 'inherit' });
      execSync(`git commit -m "${defaultCommitMsg}"`, { cwd: repoDir, stdio: 'inherit' });
    }
    console.log(`📤 Pushing changes to git remote origin/${branch}...`);
    execSync(`git push origin ${branch}`, { cwd: repoDir, stdio: 'inherit' });
    console.log('✅ Git repository synchronized with remote!\n');
  } catch (e) {
    console.warn(`⚠️ Git sync notice (continuing with deployment): ${e.message}\n`);
  }
}

function printHelp() {
  console.log(`
========================================================
 🚀 aiccloud VPS Dynamic Deployment Tool
========================================================

Usage:
  npm run <command> [target]
  node cli.js <command> [target]

Commands:
  setup                  Configure or update local machine project paths
  add fe                 Stage changed frontend files and display in terminal
  add be                 Stage changed backend files and display in terminal
  push fe                Git push + build local bundle + upload dist to VPS + restart Nginx
  push be                Git push + upload backend to VPS + install npm + restart PM2
  report fe              Show when frontend was last deployed and its last 3 logs
  report be              Show when backend was last deployed and its last 3 logs
  report                 Show full deployment report for both frontend and backend

Examples:
  npm run add be
  npm run push be
  npm run add fe
  npm run push fe
  npm run report fe
  npm run report be
========================================================
`);
}

run().catch((err) => {
  console.error('\n❌ Fatal error:', err);
  process.exit(1);
});
