const fs = require('fs');
const path = require('path');
const skillsDir = '/home/randi/aloe-agents/.claude/skills';
const skills = fs.readdirSync(skillsDir);
async function run() {
  for (const skill of skills) {
    const skillPath = path.join(skillsDir, skill, 'SKILL.md');
    if (!fs.existsSync(skillPath)) { console.log('SKIP ' + skill); continue; }
    const content = fs.readFileSync(skillPath, 'utf8');
    const r = await fetch('https://hub.aloepm.com/api/agents/skill-save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-agent-key': 'aloe-internal' },
      body: JSON.stringify({ skillId: skill, content })
    });
    const text = await r.text();
    console.log((text.includes('"ok":true') ? 'OK' : 'ERROR') + ' ' + skill);
  }
}
run().catch(console.error);
