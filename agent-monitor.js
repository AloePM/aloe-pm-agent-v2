const express = require('express');
const { execSync } = require('child_process');
const app = express();

const HUB_URL = 'https://hub.aloepm.com/api/agents/heartbeat';

function getStatus() {
  const raw = execSync('pm2 jlist').toString();
  return JSON.parse(raw).map(p => ({
    name: p.name,
    status: p.pm2_env.status,
    uptime: p.pm2_env.pm_uptime,
    restarts: p.pm2_env.restart_time,
    memory: p.monit.memory,
  }));
}

app.get('/status', (req, res) => {
  try {
    res.json(getStatus());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

async function pushStatus() {
  try {
    const procs = getStatus();
    await fetch(HUB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-agent-key': 'aloe-internal' },
      body: JSON.stringify({ procs, pushedAt: new Date().toISOString() }),
    });
    console.log('Status pushed to hub:', new Date().toISOString());
  } catch (err) {
    console.error('Push failed:', err.message);
  }
}

pushStatus();
setInterval(pushStatus, 30000);

app.listen(4040, () => console.log('Agent monitor running on port 4040'));
