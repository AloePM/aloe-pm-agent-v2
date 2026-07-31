require('dotenv').config({ path: '.env.matt' });
const { loadPlaybook, savePlaybook } = require('./loadPlaybook');
const { logActivity } = require('./logActivity');
const { App } = require('@slack/bolt');
const Anthropic = require('@anthropic-ai/sdk');
const { getMcpServers } = require('./mcpConfig');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { MATT_TOOLS, executeMattTool } = require('./matt-tools');

const repoPath = process.env.ALOE_REPO_PATH || path.join(process.env.HOME, 'aloe-pm-agent-v2');

function loadFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch(e) { return ''; }
}

function buildSystemPrompt() {
  const playbook = loadFile(path.join(repoPath, '.claude/playbooks/move-out-coordinator.md'));
  const skills = [
    'turnover-coordination', 'lease-breaks', 'tenant-communication', 'five-day-notice-charges', 'inspection-media'
  ].map(s => {
    const content = loadFile(path.join(repoPath, `.claude/skills/${s}/SKILL.md`));
    return content ? `\n\n## SKILL: ${s}\n${content}` : '';
  }).join('');

  return `You are Matt, the Move-Out Coordinator for Aloe Property Management (Phoenix metro area).
You manage the tenant move-out process end-to-end: initial notice, owner coordination,
tenant communication, timeline management, security deposit processing, and final closeout.
You are responding in Slack — keep responses clear and actionable.

CHANNEL CONTEXT — READ THIS FIRST:
SLACK → You are always talking to Aloe PM staff. Answer immediately. Never ask who is asking or why.
Never ask "are you relaying this?" or "is this coming from the tenant directly?" — it does not matter.
When staff mention a tenant, address, or move-out card, look it up immediately and report back.
NEVER ask for SSN, DOB, date of birth, account numbers, or any personal credentials in any channel.
NEVER ask for the tenant's name if you have a property address — look up the card/lease yourself.
NEVER execute or claim to have executed a bank transfer — that step is always human-performed;
your role is to track and flag it, not do it.
Never adjust or waive charges without Property Manager approval.
Document everything — every interaction should be noted in Aptly and/or Rentvine.
Escalate anything with legal implications or genuine ambiguity to the Property Manager immediately.

MOVE-OUT TYPES (required before anything else proceeds): Standard, Owner non-renewal, Eviction, Lease break

SECURITY DEPOSIT CHARGES — key defaults (full logic lives in your playbook below):
- Placeholder charge when no exact figure is ready yet and no refund is expected: $5,000 (a flag, never a real final number)
- Standard non-refundable cleaning fee: $500.00
- Carpet: only charge cleaning-rate toward replacement ($35/room, $175 min) when carpet was good condition and under 5 years old at move-in — never assume, research first
- Known vendor cost → charge cost + 10%. Unknown cost → estimate high, never low (protects owner reimbursement)

## YOUR PLAYBOOK
${playbook}
${skills}
`;
}

let SYSTEM_PROMPT = buildSystemPrompt();

console.log('Matt loaded — playbook:', SYSTEM_PROMPT.length, 'chars');

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
  console.log('Matt mentioned:', event.text?.slice(0, 80));
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
        tools: MATT_TOOLS,
        messages: mentionMessages,
      });
      mentionMessages.push({ role: 'assistant', content: response.content });
      if (response.stop_reason === 'tool_use') {
        const toolResults = [];
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            console.log('Matt mention tool:', block.name, JSON.stringify(block.input).slice(0, 100));
            const result = await executeMattTool(block.name, block.input);
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
    await logActivity({ agentId: 'matt', type: 'reply', summary: finalReply.slice(0, 120), outcome: 'sent' });
  } catch(e) {
    console.error('Matt error:', e.message);
    await client.chat.update({
      channel: event.channel,
      ts: thinking.ts,
      text: '⚠️ Sorry, I ran into an error. Try again or check the logs.',
    });
  }
});

(async () => {
  SYSTEM_PROMPT = await loadPlaybook('matt', SYSTEM_PROMPT);
  await savePlaybook('matt', SYSTEM_PROMPT);
  await app.start();
  console.log('⚡ Matt is online');
})();
