require('dotenv').config({ path: '.env.ivy' });
const { loadPlaybook, savePlaybook } = require('./loadPlaybook');
const { logActivity } = require('./logActivity');
const { App } = require('@slack/bolt');
const Anthropic = require('@anthropic-ai/sdk');
const { getMcpServers } = require('./mcpConfig');
const fs = require('fs');
const path = require('path');

const repoPath = process.env.ALOE_REPO_PATH || path.join(process.env.HOME, 'aloe-pm-agent-v2');

function loadFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch(e) { return ''; }
}

function buildSystemPrompt() {
  const playbook = loadFile(path.join(repoPath, '.claude/playbooks/leasing-coordinator.md'));
  const skills = [
    'lead-intake-response', 'showings', 'applications-screening', 'lease-prep'
  ].map(s => {
    const content = loadFile(path.join(repoPath, `.claude/skills/${s}/SKILL.md`));
    return content ? `\n\n## SKILL: ${s}\n${content}` : '';
  }).join('');

  return `You are Ivy, the Leasing Coordinator AI agent for Aloe Property Management (Phoenix metro area).
You are fast, organized, and consistent. You communicate in a warm, professional tone with prospects and applicants.
You are responding in Slack — keep responses clear and actionable.
Never make promises about approval, pricing, or lease terms without PM confirmation.
Always apply fair housing rules — treat every applicant consistently.

## YOUR PLAYBOOK
${playbook}
${skills}`;
}

let SYSTEM_PROMPT = buildSystemPrompt();
console.log('Ivy loaded — playbook:', SYSTEM_PROMPT.length, 'chars');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RENTVINE_BASE = `https://${process.env.RENTVINE_ACCOUNT}.rentvine.com/api/manager`;
const RENTVINE_AUTH = Buffer.from(`${process.env.RENTVINE_API_KEY}:${process.env.RENTVINE_API_SECRET}`).toString('base64');

async function rvFetch(path, params = {}) {
  const url = new URL(`${RENTVINE_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) url.searchParams.set(k, v); });
  const r = await fetch(url.toString(), { headers: { Authorization: `Basic ${RENTVINE_AUTH}`, 'X-Rentvine-Account': process.env.RENTVINE_ACCOUNT } });
  if (!r.ok) { const txt = await r.text(); throw new Error(`Rentvine ${r.status}: ${txt.slice(0, 100)}`); }
  return r.json();
}

const { IVY_TOOLS, executeIvyTool } = require('./ivy-tools');

// executeIvyTool now lives in ivy-tools.js (consolidated schemas + handlers)


async function getThreadHistory(client, channel, threadTs) {
  try {
    const result = await client.conversations.replies({ channel, ts: threadTs, limit: 20 });
    return result.messages || [];
  } catch(e) { return []; }
}

app.event('app_mention', async ({ event, client, say }) => {
  console.log('Ivy mentioned:', event.text?.slice(0, 80));
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
    // Agentic loop
    let current = messages.slice();
    for (let i = 0; i < 10; i++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: IVY_TOOLS,
        messages: current,
      });
      if (response.stop_reason !== 'tool_use') {
        const reply = response.content.filter(b => b.type === 'text').map(b => b.text).join('') || 'Sorry, I had trouble with that.';
        await client.chat.update({ channel: event.channel, ts: thinking.ts, text: reply });
        await logActivity({ agentId: 'ivy', type: 'reply', summary: reply.slice(0, 120), outcome: 'sent' });
        return;
      }
      const toolUses = response.content.filter(b => b.type === 'tool_use');
      const toolResults = await Promise.all(toolUses.map(async tb => {
        console.log('Ivy tool:', tb.name, JSON.stringify(tb.input).slice(0, 80));
        let result;
        try { result = await executeIvyTool(tb.name, tb.input); }
        catch(e) { result = JSON.stringify({ error: e.message }); }
        return { type: 'tool_result', tool_use_id: tb.id, content: result };
      }));
      current = current.concat([
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults }
      ]);
    }
    await client.chat.update({ channel: event.channel, ts: thinking.ts, text: '⚠️ Too many steps — try a more specific question.' });

  } catch(e) {
    console.error('Ivy error:', e.message);
    await client.chat.update({
      channel: event.channel,
      ts: thinking.ts,
      text: '⚠️ Sorry, I ran into an error. Try again or check the logs.',
    });
  }
});

(async () => {
  SYSTEM_PROMPT = await loadPlaybook('ivy', SYSTEM_PROMPT);
  await savePlaybook('ivy', SYSTEM_PROMPT);
  await app.start();
  console.log('⚡ Ivy is online and listening for @Ivy mentions');
})();

