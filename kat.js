require('dotenv').config({ path: '.env.kat' });
const { loadPlaybook } = require('./loadPlaybook');
const { logActivity } = require('./logActivity');
const { App } = require('@slack/bolt');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const repoPath = process.env.ALOE_REPO_PATH || path.join(process.env.HOME, 'aloe-pm-agent-v2');

function loadFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch(e) { return ''; }
}

function buildSystemPrompt() {
  const skills = [
    'hoa-registration-check', 'hoa-registration-submit'
  ].map(s => {
    const content = loadFile(path.join(repoPath, `.claude/skills/${s}/SKILL.md`));
    return content ? `\n\n## SKILL: ${s}\n${content}` : '';
  }).join('');

  const workflow = loadFile(path.join(repoPath, '.claude/workflows/hoa-workflow.md'));

  return `You are Kat, the HOA & Compliance AI agent for Aloe Property Management (Phoenix metro area).
You handle all HOA registrations, violations, and compliance for the ~450 HOA properties Aloe manages.
You are detail-oriented, organized, and proactive. You know HOA issues can cost owners money if missed.
You are responding in Slack — keep responses clear and actionable.
Never charge a tenant for a violation without confirming responsibility first.
Always check if landscaping, pool, or pest is owner-provided before issuing a tenant violation.
Never register a tenant with the HOA without verifying the correct tenant name from Rentvine.
Escalate any HOA fines over $500 or legal notices to the Property Manager immediately.

## HOA WORKFLOW
${workflow}
${skills}

## KEY FACTS
- ~450 of Aloe's ~524 properties are in HOA communities
- Registration fee: typically $25 per new tenant (varies by HOA)
- Management fee for HOA admin: $89/month (Owner Administrative Charge account)
- HOA admin fee: $5 for warnings, $75 for cure notices
- Unauthorized pet fine: $75 cure notice + $500 pet acceptance fee if approved
- Smoking fine: minimum $500 + $100 odor cleanup admin charge
- Always verify correct tenant name from Rentvine lease before submitting registration
- Registration submissions: by email to HOA, online portal with owner login, or mail check`;
}

let SYSTEM_PROMPT = buildSystemPrompt();
console.log('Kat loaded — system prompt:', SYSTEM_PROMPT.length, 'chars');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

async function getThreadHistory(client, channel, threadTs) {
  try {
    const result = await client.conversations.replies({ channel, ts: threadTs, limit: 20 });
    return result.messages || [];
  } catch(e) { return []; }
}

app.event('app_mention', async ({ event, client, say }) => {
  console.log('Kat mentioned:', event.text?.slice(0, 80));
  const userMessage = (event.text || '').replace(/<@[A-Z0-9]+>/g, '').trim();
  if (!userMessage) return;

  const thinking = await say({
    text: '⚙️ On it...',
    thread_ts: event.thread_ts || event.ts,
  });

  try {
    const threadTs = event.thread_ts || event.ts;
    const history = await getThreadHistory(client, event.channel, threadTs);
    const botInfo = await client.auth.test();
    const botUserId = botInfo.user_id;

    const messages = [];
    for (const msg of history) {
      if (msg.ts === event.ts) continue;
      if (msg.bot_id && msg.user === botUserId) {
        const text = (msg.text || '').replace('⚙️ On it...', '').trim();
        if (text) messages.push({ role: 'assistant', content: text });
      } else if (!msg.bot_id) {
        const text = (msg.text || '').replace(/<@[A-Z0-9]+>/g, '').trim();
        if (text) messages.push({ role: 'user', content: text });
      }
    }
    messages.push({ role: 'user', content: userMessage });

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages,
    });

    const reply = response.content[0]?.text || 'Sorry, I had trouble processing that.';
    await client.chat.update({ channel: event.channel, ts: thinking.ts, text: reply });
    await logActivity({ agentId: 'kat', type: 'reply', summary: reply.slice(0, 120), outcome: 'sent' });

  } catch(e) {
    console.error('Kat error:', e.message);
    await client.chat.update({
      channel: event.channel,
      ts: thinking.ts,
      text: '⚠️ Sorry, I ran into an error. Try again or check the logs.',
    });
  }
});

(async () => {
  SYSTEM_PROMPT = await loadPlaybook('kat', SYSTEM_PROMPT);
  await app.start();
  console.log('⚡ Kat is online and listening for @Kat mentions');
})();
