require('dotenv').config({ path: '.env.troy' });
const { loadPlaybook, savePlaybook } = require('./loadPlaybook');
const { logActivity } = require('./logActivity');
const { App } = require('@slack/bolt');
const Anthropic = require('@anthropic-ai/sdk');
const { getMcpServers } = require('./mcpConfig');
const fs = require('fs');
const path = require('path');
const https = require('https');
// troy-tools placeholder

const repoPath = process.env.ALOE_REPO_PATH || path.join(process.env.HOME, 'aloe-pm-agent-v2');

function loadFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch(e) { return ''; }
}

function buildSystemPrompt() {
  const playbook = loadFile(path.join(repoPath, '.claude/playbooks/unit-turn-coordinator.md'));
  const skills = [
    'balance-inquiries', 'lease-breaks', 'pets', 'lease-violations', 'reversed-payments'
  ].map(s => {
    const content = loadFile(path.join(repoPath, `.claude/skills/${s}/SKILL.md`));
    return content ? `\n\n## SKILL: ${s}\n${content}` : '';
  }).join('');

  return `You are Troy, the Unit Turn Coordinator AI agent for Aloe Property Management (Phoenix metro area).
You coordinate everything between a tenant moving out and the next tenant moving in. You track make-ready work, coordinate turn vendors, update unit status, and notify leasing when a unit is rent-ready.
You are responding in Slack — keep responses clear and actionable.

CHANNEL CONTEXT — READ THIS FIRST:
SLACK → You are always talking to Aloe PM staff. Answer immediately. Never ask who is asking or why.
Never ask "are you relaying this?" or "is this coming from the tenant directly?" — it does not matter.
When staff mention a tenant or property, look it up in Rentvine immediately and report back.
EMAIL or SMS → The channel is the verification. If it came from their email or phone, help them.
NEVER ask for SSN, DOB, date of birth, account numbers, or any personal credentials in any channel.
NEVER ask for the tenant's name if you have a property address — look up the lease and get the name yourself.

LATE FEE STRUCTURE (Aloe PM standard):
- Base late fee: $50 (charged when rent is late)
- Additional: $10 per day for each day rent remains unpaid after the grace period
- Example: $80 total = $50 base + $10 x 3 days late
- ALWAYS pull the actual tenant ledger to confirm the exact charges before explaining anything.
- Never assume or estimate — look at the real numbers first.

Never adjust or waive charges without Property Manager approval.
Document everything — every interaction should be noted in Rentvine and/or Aptly.
Escalate anything with legal implications to the Property Manager immediately.
## YOUR PLAYBOOK
${playbook}
${skills}
`;
}

let SYSTEM_PROMPT = buildSystemPrompt();


console.log('Troy loaded — playbook:', SYSTEM_PROMPT.length, 'chars');

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

// ── Tenant @mention handler ───────────────────────────────────────────────
app.event('app_mention', async ({ event, client, say }) => {
  console.log('Troy mentioned:', event.text?.slice(0, 80));
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
    // Agentic loop with tools so Rex can look up Rentvine/Aptly when @mentioned
    let mentionMessages = [...messages];
    let finalReply = 'Sorry, I had trouble processing that.';
    let continueLoop = true;
    while (continueLoop) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: [],

        messages: mentionMessages,
      });
      mentionMessages.push({ role: 'assistant', content: response.content });
      if (response.stop_reason === 'tool_use') {
        const toolResults = [];
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            console.log('Rex mention tool:', block.name, JSON.stringify(block.input).slice(0, 100));
            const result = { error: 'no tools yet' };
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: JSON.stringify(result) });
          }
        }
        mentionMessages.push({ role: 'user', content: toolResults });
      } else {
        finalReply = response.content.find(b => b.type === 'text')?.text || finalReply;
        continueLoop = false;
      }
    }
    await client.chat.update({ channel: event.channel, ts: thinking.ts, text: finalReply });
    await logActivity({ agentId: 'rex', type: 'reply', summary: finalReply.slice(0, 120), outcome: 'sent' });
  } catch(e) {
    console.error('Rex error:', e.message);
    await client.chat.update({
      channel: event.channel,
      ts: thinking.ts,
      text: '⚠️ Sorry, I ran into an error. Try again or check the logs.',
    });
  }
});

(async () => {
  SYSTEM_PROMPT = await loadPlaybook('troy', SYSTEM_PROMPT);
  await savePlaybook('rex', SYSTEM_PROMPT);
  await app.start();
  console.log('⚡ Troy is online');
})();
