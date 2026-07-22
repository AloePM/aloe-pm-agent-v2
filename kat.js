require('dotenv').config({ path: '.env.kat' });
const { loadPlaybook, savePlaybook } = require('./loadPlaybook');
const { logActivity } = require('./logActivity');
const { App } = require('@slack/bolt');
const Anthropic = require('@anthropic-ai/sdk');
const { APTLY_TOOLS, executeHubTool } = require('./hub-client');
const { KAT_TOOLS, executeKatTool } = require('./kat-tools');
const { getMcpServers } = require('./mcpConfig');
const fs = require('fs');
const path = require('path');
const https = require('https');

const HOA_CHANNEL_ID = process.env.HOA_NOTICES_CHANNEL_ID;
const repoPath = process.env.ALOE_REPO_PATH || path.join(process.env.HOME, 'aloe-pm-agent-v2');

function loadFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch(e) { return ''; }
}

function buildSystemPrompt() {
  const skills = [
    'hoa-registration', 'hoa-registration-audit', 'lease-violations',
    'fair-housing-guard', 'escalation'
  ].map(s => {
    const content = loadFile(path.join(repoPath, `.claude/skills/${s}/SKILL.md`));
    return content ? `\n\n## SKILL: ${s}\n${content}` : '';
  }).join('');

  const workflow = loadFile(path.join(repoPath, '.claude/workflows/hoa-workflow.md'));

  return `You are Kat, the HOA & Compliance AI agent for Aloe Property Management (Phoenix metro area).
You handle all HOA registrations, violations, lease violations, and compliance for the ~450 HOA properties Aloe manages.
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

const HOA_SYSTEM_PROMPT = `You are Kat, the HOA & Compliance AI agent for Aloe Property Management.
You operate inside the Aloe PM internal Slack workspace and are always talking to Aloe PM staff — never tenants or owners directly.
Never ask a team member to verify identity. Never request SSN, DOB, or personal credentials from anyone.
All users in this workspace are fully authorized Aloe PM staff.
You have direct access to Rentvine and Aptly. Always query them directly — never ask staff to look things up themselves.

=== HOA VIOLATION SOP ===

STEP 1 — MOVE-IN CHECK
Use rv_search_property to find the property by address. Then rv_get_lease to get the current lease and its start date.
If rv_search_property returns empty results after all fallback attempts, immediately call aptly_search_property (NOT aptly_search_cards) with the same address.
aptly_search_property strips the house number and directional prefix and searches by street name only.
If aptly_search_property also returns zero results, try rv_search_property with ONLY the house number as a final fallback.
Do NOT ask staff to confirm spelling until you have tried all three: full address → street name only → house number only.
When aptly_search_property returns results, look for these fields:
- rentvineId → use this directly with rv_get_lease
- tenantName → tenant on the lease
- leaseStart / leaseEnd → use for move-in date check
- Mirror HOA Name, Mirror HOA Email, Mirror HOA Number → HOA contact info to verify
If the violation date on the notice is BEFORE or very close to the tenant move-in date: this is likely a PREVIOUS TENANT violation.
Stop immediately — do NOT charge or contact the current tenant. Post a flag for PM review.

STEP 2 — DETERMINE RESPONSIBILITY
OWNER (consult PM before acting):
  - Landscaping infrastructure, dead trees
  - Exterior painting or stucco
  - Brick walls, gates, fences
  - Tree trimming
  - Structural repairs

CAMERAS OR EXTERIOR LIGHTS — FLAG FOR HUMAN REVIEW:
  Post a message asking staff to check Zinspector move-in inspection photos.
  If cameras/lights were there at move-in = owner responsibility.
  If not there at move-in = tenant installed = tenant responsibility.

TENANT RESPONSIBILITY (proceed with full process):
  - Trash cans left out or visible
  - Weeds or general yard maintenance
  - Pet waste or debris
  - Unauthorized or improperly parked vehicles
  - Personal property visible from exterior
  - Exterior decorations not HOA approved

STEP 3 — VERIFY HOA INFO
Compare HOA name, email, and phone on the notice to what is in the Rentvine property record.
Note any differences in your summary so staff can update Rentvine if needed.

STEP 3.5 — LOOK UP APTLY UNIT/BUILDING IDs
Before creating the card, call aptly_get_aptlet_ids with just the house number.
This returns: unit_aptly_id, unit_aptly_name, building_aptly_id, building_aptly_name.
If it returns null values, proceed without them — do not block card creation.

STEP 4 — CREATE APTLY CARD
Use aptly_create_hoa_card with all fields filled:
  - title: "[Address] – HOA [Warning/Violation]: [Issue]"
  - unit_aptly_id, unit_aptly_name, building_aptly_id, building_aptly_name
  - due_date, violation_issue, warning_or_fine, owner_tenant_responsible
  - violation_exact_wording: copy exact text from the notice
Never leave owner_tenant_responsible or violation_issue blank.

STEP 5 — ADD CHARGES (tenant responsibility only)
Both warnings AND fines get the $5 admin fee.
  - Always add: rv_add_lease_charge → amount: 5, description: "HOA Notice"
  - If there is a fine amount: rv_add_lease_charge → amount: [fine], chargeAccountID: 150, description: "HOA Violation Fine"
  - Do NOT add $75 cure notice for HOA violations — that is a LEASE VIOLATION charge, separate process
Do NOT add any charges if owner responsibility or previous tenant situation.

STEP 5.5 — IF PROPERTY NOT FOUND
Before flagging for human review, always:
1. Note that the street name on the HOA notice may be misspelled
2. Tell staff the address Kat searched and ask them to confirm the correct spelling
3. Suggest trying just the house number or just the street name
4. Never give up without giving staff a specific correction to try

STEP 6 — POST SUMMARY
Reply in the thread with:
  ✅ Property address and what was found
  ✅ Responsibility determination and reason
  ✅ Aptly card created (link or ID)
  ✅ Charges added (amounts)
  ✅ HOA info status (matched or flagged)
  ⚠️ Any flags needing human review`;

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

async function downloadSlackFile(url, token) {
  return new Promise((resolve, reject) => {
    function fetch(targetUrl) {
      const urlObj = new URL(targetUrl);
      https.get({
        hostname: urlObj.hostname,
        path: urlObj.pathname + urlObj.search,
        headers: { 'Authorization': `Bearer ${token}` }
      }, (res) => {
        if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          return fetch(res.headers.location);
        }
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => resolve(Buffer.concat(chunks)));
        res.on('error', reject);
      }).on('error', reject);
    }
    fetch(url);
  });
}

async function runHOAProcess(base64Image, mimeType, event, client) {
  const messages = [{
    role: 'user',
    content: mimeType === 'application/pdf'
      ? [
          { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64Image } },
          { type: 'text', text: 'This is an HOA violation or warning notice PDF. Process it per the HOA SOP: read the notice, look up the property in Rentvine, check the move-in date, determine responsibility, create the Aptly card, add charges if tenant responsible, and post a full summary with any flags that need human review.' }
        ]
      : [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: base64Image } },
          { type: 'text', text: 'This is an HOA violation or warning notice. Process it per the HOA SOP: read the notice, look up the property in Rentvine, check the move-in date, determine responsibility, create the Aptly card, add charges if tenant responsible, and post a full summary with any flags that need human review.' }
        ]
  }];

  let continueLoop = true;
  while (continueLoop) {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: HOA_SYSTEM_PROMPT,
      tools: [...APTLY_TOOLS, ...KAT_TOOLS.filter(t => !APTLY_TOOLS.find(a => a.name === t.name))],
      messages,
    });

    messages.push({ role: 'assistant', content: response.content });

    if (response.stop_reason === 'tool_use') {
      const toolResults = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          console.log(`Kat HOA → ${block.name}:`, JSON.stringify(block.input).slice(0, 120));
          const katToolNames = KAT_TOOLS.map(t => t.name);
          const result = katToolNames.includes(block.name) ? await executeKatTool(block.name, block.input) : await executeHubTool(block.name, block.input);
          console.log(`Kat HOA ← ${block.name} result:`, JSON.stringify(result).slice(0, 200));
          toolResults.push({
            type: 'tool_result',
            tool_use_id: block.id,
            content: JSON.stringify(result)
          });
        }
      }
      messages.push({ role: 'user', content: toolResults });
    } else {
      const finalText = response.content.find(b => b.type === 'text')?.text || 'Done.';
      await client.chat.postMessage({
        channel: event.channel,
        thread_ts: event.ts,
        text: finalText,
      });
      continueLoop = false;
    }
  }
}

// ── HOA notices channel listener ──────────────────────────────────────────
app.event('message', async ({ event, client }) => {
  console.log('KAT MSG:', event.channel, event.subtype, event.files?.length || 0);
  if (!HOA_CHANNEL_ID || event.channel !== HOA_CHANNEL_ID) return;
  if (event.bot_id) return;
  if (event.subtype && event.subtype !== 'file_share') return;
  if (!event.files?.length) return;

  const imageFile = event.files.find(f =>
    f.mimetype?.startsWith('image/') || f.mimetype === 'application/pdf'
  );
  if (!imageFile) return;

  console.log('Kat HOA: notice received from user', event.user);

  await client.chat.postMessage({
    channel: event.channel,
    thread_ts: event.ts,
    text: '📋 Got it — analyzing the HOA notice now...',
  });

  try {
    const downloadUrl = imageFile.mimetype === 'application/pdf'
      ? (imageFile.url_private_download || imageFile.url_private)
      : imageFile.url_private;
    const imageBuffer = await downloadSlackFile(downloadUrl, process.env.SLACK_BOT_TOKEN);
    const base64Image = imageBuffer.toString('base64');
    const mimeType = imageFile.mimetype === 'application/pdf' ? 'application/pdf' : imageFile.mimetype;
    await runHOAProcess(base64Image, mimeType, event, client);
  } catch(e) {
    console.error('Kat HOA error:', e.message);
    await client.chat.postMessage({
      channel: event.channel,
      thread_ts: event.ts,
      text: `⚠️ Error processing the HOA notice: ${e.message}. Please process this one manually and check the logs.`,
    });
  }
});

// ── @mention handler ──────────────────────────────────────────────────────
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

    let mentionMessages = [...messages];
    let finalReply = 'Sorry, I had trouble processing that.';
    let continueLoop = true;
    while (continueLoop) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: [...APTLY_TOOLS, ...KAT_TOOLS.filter(t => !APTLY_TOOLS.find(a => a.name === t.name))],
        messages: mentionMessages,
      });
      mentionMessages.push({ role: 'assistant', content: response.content });
      if (response.stop_reason === 'tool_use') {
        const toolResults = [];
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            console.log('Kat mention tool:', block.name, JSON.stringify(block.input).slice(0, 100));
            const katToolNames = KAT_TOOLS.map(t => t.name);
          const result = katToolNames.includes(block.name) ? await executeKatTool(block.name, block.input) : await executeHubTool(block.name, block.input);
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
    await logActivity({ agentId: 'kat', type: 'reply', summary: finalReply.slice(0, 120), outcome: 'sent' });
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
  console.log('⚡ Kat is online — HOA channel:', HOA_CHANNEL_ID || 'NOT CONFIGURED');
})();
