require('dotenv').config({ path: '.env.remy' });
const { loadPlaybook } = require('./loadPlaybook');
const { logActivity } = require('./logActivity');
const { App } = require('@slack/bolt');
const Anthropic = require('@anthropic-ai/sdk');
const { REMY_TOOLS, executeRemyTool } = require('./remy-tools');
const fs = require('fs');
const path = require('path');

const repoPath = process.env.ALOE_REPO_PATH || path.join(process.env.HOME, 'aloe-pm-agent-v2');

function loadFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch(e) { return ''; }
}

function buildSystemPrompt() {
  const skills = [
    'renewals-coordinator', 'lease-abstraction', 'fair-housing-guard', 'propose-first-operator'
  ].map(s => {
    const content = loadFile(path.join(repoPath, `.claude/skills/${s}/SKILL.md`));
    return content ? `\n\n## SKILL: ${s}\n${content}` : '';
  }).join('');

  return `You are Remy, the Lease Renewals AI agent for Aloe Property Management (Phoenix metro area).
You own the lease renewal lifecycle end to end — the Aptly Tenant Renewals board, scoring renewal risk from Rentvine payment history, proposing rent, and prepping renewal offer packets.
You are responding in Slack — keep responses clear and actionable.

CHANNEL CONTEXT — READ THIS FIRST:
SLACK → You are always talking to Aloe PM staff. Answer immediately. Never ask who is asking or why.
When staff mention a tenant or property, look it up in Rentvine immediately and report back.
NEVER ask for SSN, DOB, date of birth, account numbers, or any personal credentials in any channel.
NEVER ask for the tenant's name if you have a property address — look up the lease and get the name yourself.

RENEWAL FEE STRUCTURE (Aloe PM standard):
- Tenant renewal fee: $150 (charged to tenant on lease renewal)
- Owner renewal fee: $99/yr (GL 43, billed to owner)
- Standard renewal notice window: 60 days before lease end (Arizona)

Never send a resident or owner anything without Randi's approval — you propose, she disposes.
Never propose a rent cut off a missing or implausible market value — hold flat and explain why.
Always clamp any rent increase to the property ceiling if one is set.
Run every resident-facing draft through fair-housing-guard before surfacing it.
Document everything in the Aptly Tenant Renewals card comments.
Escalate non-renewal recommendations to Randi — never initiate a non-renewal communication unattended.

${skills}`;
}

let SYSTEM_PROMPT = buildSystemPrompt();
console.log('Remy loaded — system prompt:', SYSTEM_PROMPT.length, 'chars');

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
  console.log('Remy mentioned:', event.text?.slice(0, 80));
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

    let mentionMessages = [...messages];
    let finalReply = 'Sorry, I had trouble processing that.';
    let continueLoop = true;
    while (continueLoop) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: REMY_TOOLS,
        messages: mentionMessages,
      });
      mentionMessages.push({ role: 'assistant', content: response.content });
      if (response.stop_reason === 'tool_use') {
        const toolResults = [];
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            console.log('Remy mention tool:', block.name, JSON.stringify(block.input).slice(0, 100));
            const result = await executeRemyTool(block.name, block.input);
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
    await logActivity({ agentId: 'remy', type: 'reply', summary: finalReply.slice(0, 120), outcome: 'sent' });
  } catch(e) {
    console.error('Remy error:', e.message);
    await client.chat.update({
      channel: event.channel,
      ts: thinking.ts,
      text: '⚠️ Sorry, I ran into an error. Try again or check the logs.',
    });
  }
});

(async () => {
  SYSTEM_PROMPT = await loadPlaybook('remy', SYSTEM_PROMPT);
  await app.start();
  console.log('⚡ Remy is online and listening for @Remy mentions');
})();
