const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Load environment variables from local .env or fallback locations
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (fs.existsSync(envPath)) {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const eqIdx = line.indexOf('=');
      if (eqIdx !== -1) {
        const key = line.slice(0, eqIdx).trim();
        let val = line.slice(eqIdx + 1).trim();
        // remove surrounding quotes
        if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
          val = val.slice(1, -1);
        }
        if (!process.env[key]) {
          process.env[key] = val;
        }
      }
    }
  }
}

loadEnv();

function askQuestion(query, defaultValue = '') {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    const promptText = defaultValue ? `${query} [${defaultValue}]: ` : `${query}: `;
    rl.question(promptText, (answer) => {
      rl.close();
      resolve(answer.trim() || defaultValue);
    });
  });
}

async function promptForPaths(forcePrompt = false) {
  const defaultRoot = process.env.LOCAL_PROJECT_ROOT || path.resolve(__dirname, '..');
  const defaultBe = process.env.LOCAL_BACKEND_PATH || path.join(defaultRoot, 'BMS-opd-be');
  const defaultFe = process.env.LOCAL_FRONTEND_PATH || path.join(defaultRoot, 'BMS-opd-fe');

  const needsPrompt = forcePrompt || !process.env.LOCAL_PROJECT_ROOT || !process.env.LOCAL_BACKEND_PATH || !process.env.LOCAL_FRONTEND_PATH;

  if (!needsPrompt) {
    return {
      LOCAL_PROJECT_ROOT: process.env.LOCAL_PROJECT_ROOT,
      LOCAL_BACKEND_PATH: process.env.LOCAL_BACKEND_PATH,
      LOCAL_FRONTEND_PATH: process.env.LOCAL_FRONTEND_PATH,
    };
  }

  console.log('\n========================================================');
  console.log(' ⚙️  aiccloud Deployment: Local Machine Project Paths Setup');
  console.log('========================================================');
  console.log('Please verify or enter the absolute paths for your project:\n');

  const root = await askQuestion('📁 LOCAL_PROJECT_ROOT', defaultRoot);
  const be = await askQuestion('📁 LOCAL_BACKEND_PATH', path.join(root, 'BMS-opd-be'));
  const fe = await askQuestion('📁 LOCAL_FRONTEND_PATH', path.join(root, 'BMS-opd-fe'));

  // Save back to .env
  updateEnvFile({
    LOCAL_PROJECT_ROOT: root.replace(/\\/g, '/'),
    LOCAL_BACKEND_PATH: be.replace(/\\/g, '/'),
    LOCAL_FRONTEND_PATH: fe.replace(/\\/g, '/'),
  });

  process.env.LOCAL_PROJECT_ROOT = root;
  process.env.LOCAL_BACKEND_PATH = be;
  process.env.LOCAL_FRONTEND_PATH = fe;

  console.log('✅ Local project paths saved to .env\n');

  return {
    LOCAL_PROJECT_ROOT: root,
    LOCAL_BACKEND_PATH: be,
    LOCAL_FRONTEND_PATH: fe,
  };
}

function updateEnvFile(updates) {
  const envPath = path.join(__dirname, '.env');
  let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
  for (const [key, value] of Object.entries(updates)) {
    const regex = new RegExp(`^${key}=.*$`, 'm');
    if (regex.test(content)) {
      content = content.replace(regex, `${key}=${value}`);
    } else {
      content += `\n${key}=${value}`;
    }
  }
  fs.writeFileSync(envPath, content, 'utf8');
}

function getConfig() {
  loadEnv();
  return {
    // Local paths
    LOCAL_PROJECT_ROOT: process.env.LOCAL_PROJECT_ROOT || path.resolve(__dirname, '..'),
    LOCAL_BACKEND_PATH: process.env.LOCAL_BACKEND_PATH || path.join(process.env.LOCAL_PROJECT_ROOT || path.resolve(__dirname, '..'), 'BMS-opd-be'),
    LOCAL_FRONTEND_PATH: process.env.LOCAL_FRONTEND_PATH || path.join(process.env.LOCAL_PROJECT_ROOT || path.resolve(__dirname, '..'), 'BMS-opd-fe'),

    // Remote VPS info
    VPS_HOST: process.env.VPS_HOST || '148.113.6.25',
    VPS_PORT: parseInt(process.env.VPS_PORT || '20172', 10),
    VPS_USER: process.env.VPS_USER || 'root',
    VPS_PASSWORD: process.env.VPS_PASSWORD || 'Ml0NqUQECgW2nFDF',
    REMOTE_FRONTEND_PATH: process.env.REMOTE_FRONTEND_PATH || '/root/BMS-opd-fe',
    REMOTE_BACKEND_PATH: process.env.REMOTE_BACKEND_PATH || '/root/BMS-opd-be',
    PM2_APP_NAME: process.env.PM2_APP_NAME || 'bms-backend',
    APP_DOMAIN: process.env.APP_DOMAIN || 'https://biomechasoft.in',

    // Git Branches
    GIT_BACKEND_BRANCH: process.env.GIT_BACKEND_BRANCH || 'main',
    GIT_FRONTEND_BRANCH: process.env.GIT_FRONTEND_BRANCH || 'Sohel2',
    GIT_ROOT_BRANCH: process.env.GIT_ROOT_BRANCH || 'main',
  };
}

module.exports = {
  getConfig,
  promptForPaths,
  updateEnvFile,
};
