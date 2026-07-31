const express = require('express');
const { execSync } = require('child_process');
const app = express();

const HUB_URL = 'https://hub.aloepm.com/api/agents/heartbeat';
process.env.HUB_INTERNAL_SECRET = process.env.HUB_INTERNAL_SECRET || 'unused-placeholder-for-tools-introspection';

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
function getTools() {
  const tools = {};
  try {
    delete require.cache[require.resolve('./remy-tools')];
    const { REMY_TOOLS } = require('./remy-tools');
    tools.remy = REMY_TOOLS.map(t => ({ name: t.name, description: t.description }));
  } catch (e) {
    console.error('getTools remy failed:', e.message);
  }
  try {
    delete require.cache[require.resolve('./ari-tools')];
    const { ARI_TOOLS } = require('./ari-tools');
    tools.ari = ARI_TOOLS.map(t => ({ name: t.name, description: t.description }));
  } catch (e) {
    console.error('getTools ari failed:', e.message);
  }
  try {
    delete require.cache[require.resolve('./kat-tools')];
    const { KAT_TOOLS } = require('./kat-tools');
    tools.kat = KAT_TOOLS.map(t => ({ name: t.name, description: t.description }));
  } catch (e) {
    console.error('getTools kat failed:', e.message);
  }
  try {
    delete require.cache[require.resolve('./rex-tools')];
    const { REX_TOOLS } = require('./rex-tools');
    tools.rex = REX_TOOLS.map(t => ({ name: t.name, description: t.description }));
  } catch (e) {
    console.error('getTools rex failed:', e.message);
  }
  try {
    delete require.cache[require.resolve('./bo-tools')];
    const { BO_TOOLS } = require('./bo-tools');
    tools.bo = BO_TOOLS.map(t => ({ name: t.name, description: t.description }));
  } catch (e) {
    console.error('getTools bo failed:', e.message);
  }
  try {
    delete require.cache[require.resolve('./ivy-tools')];
    const { IVY_TOOLS } = require('./ivy-tools');
    tools.ivy = IVY_TOOLS.map(t => ({ name: t.name, description: t.description }));
  } catch (e) {
    console.error('getTools ivy failed:', e.message);
  }
  try {
    delete require.cache[require.resolve('./mary-tools')];
    const { MARY_TOOLS } = require('./mary-tools');
    tools.mary = MARY_TOOLS.map(t => ({ name: t.name, description: t.description }));
  } catch (e) {
    console.error('getTools mary failed:', e.message);
  }
  return tools;
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
    const tools = getTools();
    await fetch(HUB_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-agent-key': 'aloe-internal' },
      body: JSON.stringify({ procs, tools, pushedAt: new Date().toISOString() }),
    });
    console.log('Status pushed to hub:', new Date().toISOString());
  } catch (err) {
    console.error('Push failed:', err.message);
  }
}

pushStatus();
setInterval(pushStatus, 30000);

app.listen(4040, () => console.log('Agent monitor running on port 4040'));
