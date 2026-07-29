const { Storage } = require('@google-cloud/storage');
const storage = new Storage();
const BUCKET = 'aloe-hub-data-496300';
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
    if (!match) { console.log(`WARN ${agent.id} — could not extract prompt`); continue; }
    const prompt = match[1].trim();
    await storage.bucket(BUCKET).file(`playbooks/${agent.id}.md`).save(prompt, { contentType: 'text/markdown' });
    console.log(`OK ${agent.id} — ${prompt.length} chars`);
  }
}

run().catch(console.error);
