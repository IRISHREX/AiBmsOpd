const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'deployment-state.json');

function getState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {
      return {};
    }
  }
  return {};
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

function recordDeployment(target, info = {}) {
  const state = getState();
  if (!state[target]) state[target] = [];
  
  const entry = {
    timestamp: new Date().toISOString(),
    localTime: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
    target,
    commit: info.commit || 'N/A',
    branch: info.branch || 'N/A',
    status: info.status || 'SUCCESS',
    notes: info.notes || '',
  };

  // Keep last 10 deployments for this target
  state[target].unshift(entry);
  if (state[target].length > 10) state[target] = state[target].slice(0, 10);

  state[`last_${target}`] = entry;
  saveState(state);
  return entry;
}

function getLastDeployment(target) {
  const state = getState();
  return state[`last_${target}`] || (state[target] && state[target][0]) || null;
}

module.exports = {
  recordDeployment,
  getLastDeployment,
  getState,
};
