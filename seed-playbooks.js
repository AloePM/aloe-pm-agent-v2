const fs = require('fs');
const path = require('path');

const agents = [
  { id: 'ari', file: 'app.js' },
  { id: 'bo',  file: 'bo.js' },
  { id: 'ivy', file: 'ivy.js' },
  { id: 'rex', file: 'rex.js' },
  { id: 'lea', file: 'lea.js' },
  { id: 'kat', file: 'kat.js' },
  { id: 'jay', file: 'jay.js' },
  { id: 'mae', file: 'mae.js' },
  { id: 'joe', file: 'joe.js' },
];

async function run() {
  for (const agent of agents) {
    const filePath = path.join('/home/randi/aloe-agents', agent.file);
    if (!fs.existsSync(filePath)) { console.log(`SKIP ${agent.id}`); continue; }
    const content = fs.readFileSync(filePath, 'utf8');
    let match = content.match(/return\s*`([\s\S]*?)`\s*;\s*\}/);
    if (!match) match = content.match(/SYSTEM_PROMPT\s*=\s*`([\s\S]*?)`/);
    if (!match) { console.log(`WARN ${agent.id}`); continue; }
    const prompt = match[1].trim();
    const r = await fetch('https://hub.aloepm.com/api/agents/playbook-save', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-key': 'aloe-internal'
      },
      body: JSON.stringify({ agentId: agent.id, content: prompt })
    });
    const text = await r.text();
    console.log(`${text.includes('"ok":true') ? 'OK' : 'ERROR'} ${agent.id} — ${prompt.length} chars`);
  }
}

run().catch(console.error);
