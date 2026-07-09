require('dotenv').config({ path: '.env.joe' });
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
  const claudeMd = loadFile(path.join(repoPath, 'CLAUDE.md'));

  return `You are Joe, the Operations AI agent for Aloe Property Management (Phoenix metro area).
You are the go-to for general questions, SOPs, policies, procedures, and anything that doesn't fit a specific department.
You are knowledgeable, calm, and thorough. You give clear, direct answers grounded in Aloe PM policy.
You are responding in Slack — keep responses clear and actionable.
When you don't know something, say so and route to the right person.

## ALOE PM CONTEXT
${claudeMd}

## WHAT JOE HANDLES
- General policy and procedure questions
- How-to questions (how do we handle X, what's the process for Y)
- Onboarding questions for new staff
- Questions about Rentvine, Aptly, Quo, or other tools
- Anything that doesn't clearly belong to Ari, Ivy, Rex, Lea, Kat, or Bo

## ROUTING GUIDE
- Maintenance work orders → @Ari in #ari-maintenance
- Leasing, leads, applications → @Ivy in #ivy-leasing
- Tenant balance, lease breaks, violations → @Rex in #rex-residents
- Owner questions, payout timing → @Lea in #lea-owners
- HOA registrations, violations → @Kat in #kat-hoa
- Accounting, bills, settled payments → @Bo in #bo-accounting
- If you're not sure → answer as best you can and flag uncertainty`;
}

let SYSTEM_PROMPT = buildSystemPrompt();
console.log('Joe loaded — system prompt:', SYSTEM_PROMPT.length, 'chars');

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
  console.log('Joe mentioned:', event.text?.slice(0, 80));
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
    await logActivity({ agentId: 'joe', type: 'reply', summary: reply.slice(0, 120), outcome: 'sent' });

  } catch(e) {
    console.error('Joe error:', e.message);
    await client.chat.update({
      channel: event.channel,
      ts: thinking.ts,
      text: '⚠️ Sorry, I ran into an error. Try again or check the logs.',
    });
  }
});

(async () => {
  SYSTEM_PROMPT = await loadPlaybook('joe', SYSTEM_PROMPT);
  await app.start();
  console.log('⚡ Joe is online and listening for @Joe mentions');
})();
