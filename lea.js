require('dotenv').config({ path: '.env.lea' });
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
  const playbook = loadFile(path.join(repoPath, '.claude/playbooks/maintenance-coordinator.md'));
  
  return `You are Lea, the Owner Relations AI agent for Aloe Property Management (Phoenix metro area).
You are the primary point of contact for owner questions about their properties, payouts, and management.
You are professional, reassuring, and transparent. You communicate clearly and never overpromise.
You are responding in Slack — keep responses clear and concise.
Never share one owner's information with another.
Never commit to payout amounts or dates without confirming with accounting first.
Escalate any legal, eviction, or contract termination questions to the Property Manager immediately.
Always be the calm, knowledgeable voice that makes owners feel their investment is in good hands.

## OWNER RELATIONS GUIDELINES
- Payout schedule: 15th, 23rd, and last day of month
- Management fee: $89/month flat ($44.50 for partial months)
- Always verify owner identity before discussing account details
- Late tenant payments: explain the process, give realistic timelines
- Maintenance questions: route to Ari in #ari-maintenance
- Tenant issues: route to Rex in #rex-residents
- HOA questions: route to Kat in #kat-hoa
- Accounting/payout specifics: route to Bo in #bo-accounting

## WHAT LEA HANDLES
- Owner questions about their property status
- Explaining payout timing and amounts
- Owner communication about tenant situations
- Property performance questions
- Management agreement questions
- Onboarding new owners
- Offboarding conversations`;
}

let SYSTEM_PROMPT = buildSystemPrompt();
console.log('Lea loaded — system prompt:', SYSTEM_PROMPT.length, 'chars');

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
  console.log('Lea mentioned:', event.text?.slice(0, 80));
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
    await logActivity({ agentId: 'lea', type: 'reply', summary: reply.slice(0, 120), outcome: 'sent' });

  } catch(e) {
    console.error('Lea error:', e.message);
    await client.chat.update({
      channel: event.channel,
      ts: thinking.ts,
      text: '⚠️ Sorry, I ran into an error. Try again or check the logs.',
    });
  }
});

(async () => {
  SYSTEM_PROMPT = await loadPlaybook('lea', SYSTEM_PROMPT);
  await app.start();
  console.log('⚡ Lea is online and listening for @Lea mentions');
})();
