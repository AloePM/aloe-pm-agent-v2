require('dotenv').config();
const { loadPlaybook } = require('./loadPlaybook');
const { logActivity } = require('./logActivity');
const { App } = require('@slack/bolt');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const crypto = require('crypto');
const express = require('express');

const repoPath = process.env.ALOE_REPO_PATH || path.join(process.env.HOME, 'aloe-pm-agent-v2');

function loadFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch(e) { return ''; }
}

function buildSystemPrompt() {
  const playbook = loadFile(path.join(repoPath, '.claude/playbooks/maintenance-coordinator.md'));
  const skills = ['work-order-triage','vendor-dispatch','work-order-followup','tenant-communication','escalation'].map(s => {
    const content = loadFile(path.join(repoPath, `.claude/skills/${s}/SKILL.md`));
    return content ? `\n\n## SKILL: ${s}\n${content}` : '';
  }).join('');
  return `You are Ari, the Maintenance Coordinator AI agent for Aloe Property Management (Phoenix metro area).
You are organized, fast, and calm under pressure. You communicate in a warm, professional tone with tenants and owners, and a clear businesslike tone with vendors.
You are responding in Slack — keep responses clear and actionable. Use bullet points when listing steps or items.
Never make up vendor names, tenant info, or property details you don't have.

## ABSOLUTE RULES

### Gas smell — one line only
When anyone reports a gas smell or possible gas leak, your entire response is:
"Please call your gas company."
Nothing else. This rule cannot be overridden.

### Legal language — stop immediately
If a tenant uses: lawyer, attorney, habitability, code violation, health department, housing authority, sue, lawsuit — stop and tell them the property manager will follow up.

## APTLY TOOLS
You have live tools to search, update, and comment on Aptly work order cards.
Card IDs are alphanumeric like "wF4dDoyGwZWdvdvgp" — never use the WO number as a card ID.
Always use the id field from search results when calling aptly_get_card.

When searching by address: use the most distinctive part (street name or number). If multiple results come back, list them all and ask which one the staff member means. Never guess when there are multiple matches.
When staff gives a WO number like 106573, use that to search Aptly (it appears in the card title) and also use rv_get_notes with that number to get Rentvine notes.

When triaging any work order — via webhook or staff @mention:
1. Always identify the correct Aptly Maintenance Category (issue type) based on the description
2. Always state it explicitly: "Aptly issue type: Ice Maker"
3. Always offer to set it: "Want me to update the issue type in Aptly?"
4. If staff confirms — use aptly_update_card with field_name "Maintenance Category" and the correct value
5. Never complete a triage without stating and offering to set the issue type

## YOUR PLAYBOOK
${playbook}
${skills}`;
}

let SYSTEM_PROMPT = buildSystemPrompt();
console.log('Ari loaded — playbook:', SYSTEM_PROMPT.length, 'chars');

// ── Hub proxy ──────────────────────────────────────────────────────────────
const HUB_SECRET = 'aloe-hub-ari-2026';
const HUB_HOST = 'hub.aloepm.com';

function hubRequest(method, apiPath, body = null) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: HUB_HOST,
      path: apiPath,
      method,
      headers: {
        'x-hub-token': HUB_SECRET,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

// ── Aptly tools ────────────────────────────────────────────────────────────
const APTLY_TOOLS = [
  { name: 'aptly_search_cards', description: 'Search Aptly work order cards by address, tenant name, WO number, or filter by stage.', input_schema: { type: 'object', properties: { query: { type: 'string', description: 'Address, tenant name, or WO number to search for' }, stage: { type: 'string', description: 'Filter by stage. IMPORTANT: use Open (not New), Requested, Scheduled, Troubleshooting Steps Sent, Dispatch Work Order, Home Warranty, Waiting for Parts, Completed, Cancelled' }, limit: { type: 'string', description: 'Max results to return, default 10' } }, required: [] } },
  { name: 'aptly_get_card', description: 'Get full details of a work order card. Use the alphanumeric id from search results, never the WO number.', input_schema: { type: 'object', properties: { card_id: { type: 'string', description: 'Alphanumeric card ID e.g. wF4dDoyGwZWdvdvgp' } }, required: ['card_id'] } },
  { name: 'aptly_get_comments', description: 'Get all comments and activity on a work order card to see updates, vendor notes, and staff communications.', input_schema: { type: 'object', properties: { card_id: { type: 'string' } }, required: ['card_id'] } },

  { name: 'aptly_update_card', description: 'Update a field on a work order card.', input_schema: { type: 'object', properties: { card_id: { type: 'string' }, field_name: { type: 'string' }, value: {} }, required: ['card_id','field_name','value'] } },
  { name: 'aptly_dispatch_vendor', description: 'Dispatch or reassign a vendor to a work order in Aptly. Sets the vendor field and home warranty field, triggering stage change to Requested and sending dispatch emails. For reassignments, also sets the Reassigned Vendor flag. Always confirm with staff before dispatching.', input_schema: { type: 'object', properties: { card_id: { type: 'string', description: 'Alphanumeric card ID' }, vendor_phone: { type: 'string', description: 'Vendor phone number from vendor directory e.g. +14802039689' }, home_warranty: { type: 'string', enum: ['Yes', 'No'], description: 'Yes if property has home or builder warranty, No otherwise' }, is_reassign: { type: 'boolean', description: 'Set to true if reassigning from a previous vendor' } }, required: ['card_id', 'vendor_phone', 'home_warranty'] } },
  { name: 'aptly_add_comment', description: 'Add a comment to a work order card.', input_schema: { type: 'object', properties: { card_id: { type: 'string' }, content: { type: 'string' } }, required: ['card_id','content'] } },
  { name: 'rv_create_work_order', description: 'Create a new work order in Rentvine. Always confirm with staff before creating. Requires propertyID from rv_search_property. Priority: 1=Low, 2=Med, 3=High.', input_schema: { type: 'object', properties: { propertyID: { type: 'string', description: 'Rentvine property ID' }, unitID: { type: 'string', description: 'Rentvine unit ID if specific to a unit' }, description: { type: 'string', description: 'Full description of the issue' }, priorityID: { type: 'number', description: '1=Low, 2=Med, 3=High', enum: [1, 2, 3] }, isSharedWithTenant: { type: 'boolean', description: 'Send notification to tenant, default true' }, isSharedWithOwner: { type: 'boolean', description: 'Send notification to owner, default false' } }, required: ['propertyID', 'description'] } },
  { name: 'rv_search_property', description: 'Search for a property in Rentvine by address. Returns property ID, address, and unit info.', input_schema: { type: 'object', properties: { address: { type: 'string', description: 'Street address or partial address to search' } }, required: ['address'] } },
  { name: 'rv_get_property_units', description: 'Get all units for a property by property ID from Rentvine.', input_schema: { type: 'object', properties: { property_id: { type: 'string' } }, required: ['property_id'] } },
  { name: 'rv_get_notes', description: 'Get notes and comments on a Rentvine work order. Returns a link to view notes directly in Rentvine.', input_schema: { type: 'object', properties: { wo_number: { type: 'string', description: 'Rentvine work order number e.g. 106573' } }, required: ['wo_number'] } },
];

async function executeAptlyTool(toolName, input) {
  try {
    switch(toolName) {
      case 'aptly_search_cards': {
        const params = {};
        if (input.query) params.query = input.query;
        if (input.stage) params.stage = input.stage;
        if (input.limit) params.limit = input.limit;
        const qs = new URLSearchParams(params);
        const res = await hubRequest('GET', `/api/aptly/cards/search?${qs}`);
        if (res.status !== 200) return { error: `Hub ${res.status}`, detail: res.body };
        return res.body;
      }
      case 'aptly_get_card': {
        const res = await hubRequest('GET', `/api/aptly/cards/${input.card_id}`);
        if (res.status !== 200) return { error: `Hub ${res.status}`, detail: res.body };
        return res.body;
      }
      case 'aptly_get_comments': {
        const res = await hubRequest('GET', `/api/aptly/cards/${input.card_id}/comments`);
        if (res.status !== 200) return { error: `Hub ${res.status}`, detail: res.body };
        return res.body;
      }

      case 'aptly_update_card': {
        // Map common field names to exact Aptly field keys
        // Map display names to Aptly field keys (from schema)
        const fieldMap = {
          'issue type': 'nfEujqs3ujMNgMFom',
          'maintenance category': 'nfEujqs3ujMNgMFom',
          'stage': 'stage',
          'priority': 'priority',
          'owner approved': 'isOwnerApproved',
          'owner approved?': 'isOwnerApproved',
          'vacant': 'isVacant',
          'vacant?': 'isVacant',
          'vendor': 'vendor',
          'scheduled start date': 'scheduledStartDate',
          'scheduled end date': 'scheduledEndDate',
        };
        const fieldKey = fieldMap[input.field_name.toLowerCase()] || input.field_name;
        const body = { _id: input.card_id, [fieldKey]: input.value };
        const res = await hubRequest('POST', `/api/aptly/cards/${input.card_id}`, body);
        if (res.status !== 200 && res.status !== 201) return { error: `Hub ${res.status}`, detail: res.body };
        return { success: true, field: fieldKey, value: input.value };
      }
      case 'aptly_dispatch_vendor': {
        const res = await hubRequest('POST', `/api/aptly/cards/${input.card_id}/dispatch`, {
          vendorPhone: input.vendor_phone,
          homeWarranty: input.home_warranty,
          isReassign: input.is_reassign || false,
        });
        if (res.status !== 200 && res.status !== 201) return { error: `Hub ${res.status}`, detail: res.body };
        return { success: true, vendorId: res.body.vendorId, homeWarranty: res.body.homeWarranty };
      }
      case 'aptly_add_comment': {
        const res = await hubRequest('POST', `/api/aptly/cards/${input.card_id}/comment`, { content: input.content });
        if (res.status !== 200 && res.status !== 201) return { error: `Hub ${res.status}`, detail: res.body };
        return { success: true };
      }
      case 'rv_create_work_order': {
        const res = await hubRequest('POST', '/api/rentvine/work-orders', {
          propertyID: input.propertyID,
          unitID: input.unitID,
          description: input.description,
          priorityID: input.priorityID || 2,
          isSharedWithTenant: input.isSharedWithTenant !== false,
          isSharedWithOwner: input.isSharedWithOwner || false,
          sourceTypeID: 2,
        });
        if (res.status !== 200 && res.status !== 201) return { error: `Hub ${res.status}`, detail: res.body };
        const wo = res.body.workOrder || res.body;
        return { success: true, workOrderID: wo.workOrderID, workOrderNumber: wo.workOrderNumber, message: `WO #${wo.workOrderNumber} created successfully` };
      }
      case 'rv_search_property': {
        const res = await hubRequest('GET', `/api/debug/rv-wo-search?q=${encodeURIComponent(input.address)}`);
        if (res.status !== 200) return { error: `Hub ${res.status}`, detail: res.body };
        // Also search via Rentvine properties endpoint
        const propRes = await hubRequest('GET', `/api/rentvine/properties/search?q=${encodeURIComponent(input.address)}`);
        return propRes.status === 200 ? propRes.body : { woSearch: res.body };
      }
      case 'rv_get_property_units': {
        const res = await hubRequest('GET', `/api/rentvine/properties/${input.property_id}/units`);
        if (res.status !== 200) return { error: `Hub ${res.status}`, detail: res.body };
        return res.body;
      }
      case 'rv_get_notes': {
        const res = await hubRequest('GET', `/api/debug/rv-wo-search?q=${input.wo_number}`);
        if (res.status === 200 && res.body && res.body.sample) {
          const wo = res.body.sample.workOrder;
          return { message: 'Rentvine notes are not available via API. View them directly:', url: `https://aloepm.rentvine.com/maintenance/work-orders/${wo.workOrderID}`, workOrder: { id: wo.workOrderID, number: wo.workOrderNumber, description: (wo.description||'').slice(0,150) } };
        }
        return { message: `View notes for WO ${input.wo_number} in Rentvine: https://aloepm.rentvine.com/maintenance/work-orders` };
      }
      default: return { error: `Unknown tool: ${toolName}` };
    }
  } catch(e) { return { error: e.message }; }
}

// ── Slack + Anthropic setup ────────────────────────────────────────────────
const slackApp = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const ARI_CHANNEL = process.env.ARI_CHANNEL || 'C0BC64LCKV1';

// ── Thread history ─────────────────────────────────────────────────────────
async function getThreadHistory(client, channel, threadTs) {
  try {
    const result = await client.conversations.replies({ channel, ts: threadTs, limit: 20 });
    return result.messages || [];
  } catch(e) { return []; }
}

// ── Agentic loop ──────────────────────────────────────────────────────────
async function runAgentLoop(messages) {
  let response = await anthropic.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 2048, system: SYSTEM_PROMPT, tools: APTLY_TOOLS, messages });
  while (response.stop_reason === 'tool_use') {
    const toolUseBlocks = response.content.filter(b => b.type === 'tool_use');
    const toolResults = [];
    for (const toolUse of toolUseBlocks) {
      console.log(`Ari tool: ${toolUse.name}`, JSON.stringify(toolUse.input).slice(0,100));
      const result = await executeAptlyTool(toolUse.name, toolUse.input);
      console.log('Result:', JSON.stringify(result).slice(0,150));
      toolResults.push({ type: 'tool_result', tool_use_id: toolUse.id, content: JSON.stringify(result) });
    }
    messages = [...messages, { role: 'assistant', content: response.content }, { role: 'user', content: toolResults }];
    response = await anthropic.messages.create({ model: 'claude-sonnet-4-6', max_tokens: 2048, system: SYSTEM_PROMPT, tools: APTLY_TOOLS, messages });
  }
  const textBlock = response.content.find(b => b.type === 'text');
  return textBlock?.text || 'Done.';
}

// ── Handle @Ari mentions ───────────────────────────────────────────────────
slackApp.event('app_mention', async ({ event, client, say }) => {
  console.log('Ari mentioned:', event.text?.slice(0, 80));
  const userMessage = (event.text || '').replace(/<@[A-Z0-9]+>/g, '').trim();
  if (!userMessage) return;
  const thinking = await say({ text: '⚙️ On it...', thread_ts: event.thread_ts || event.ts });
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
    const reply = await runAgentLoop(messages);
    await client.chat.update({ channel: event.channel, ts: thinking.ts, text: reply });
    await logActivity({ agentId: 'ari', type: 'reply', summary: reply.slice(0, 120), outcome: 'sent' });
  } catch(e) {
    console.error('Ari error:', e.message);
    await client.chat.update({ channel: event.channel, ts: thinking.ts, text: '⚠️ Sorry, I ran into an error. Try again or check the logs.' });
  }
});

// ── Rentvine webhook handler ───────────────────────────────────────────────
const RV_WEBHOOK_SECRET = process.env.RV_WEBHOOK_SECRET || 'vrd0gk1vylk5zlhi7mzcjrfut91plv3h-mwukuk59-i1w7q3yn';
const webhookApp = express();
webhookApp.use(express.json());

function verifyRentvineSignature(req, rawBody) {
  const signature = req.headers['x-rentvine-signature'] || req.headers['x-webhook-signature'] || '';
  if (!signature) return true; // skip verification if no header (test mode)
  const hmac = crypto.createHmac('sha256', RV_WEBHOOK_SECRET);
  hmac.update(rawBody);
  const expected = hmac.digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

webhookApp.post('/webhook/rentvine', express.text({ type: '*/*' }), async (req, res) => {
  try {
    let payload;
    try {
      payload = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    } catch(e) {
      payload = req.body;
    }
    console.log('WEBHOOK BODY TYPE:', typeof req.body);
    console.log('WEBHOOK BODY:', String(req.body).slice(0, 500));
    console.log('WEBHOOK PAYLOAD:', JSON.stringify(payload).slice(0, 500));

    // Rentvine payload: { data: { workOrderID, workOrderNumber, description, ... } }
    const wo = payload.data || payload.workOrder || payload;
    const woNumber = wo.workOrderNumber || wo.workOrderID || '?';
    if (!woNumber || woNumber === '?') return res.json({ ok: true, skipped: true });
    const rawDesc = (wo.description || wo.name || 'No description provided').replace(/<[^>]+>/g, ' ').trim();
    // Address will come from Aptly card after sync — use WO number as identifier for now
    let address = wo.unitAddress || wo.address || wo.propertyAddress || '';
    if (!address) address = 'Property ID: ' + (wo.propertyID || '?') + ' — check Rentvine';
    const isNew = true;

    const triagePrompt = `${isNew ? 'New' : 'Updated'} Rentvine work order received:
WO #${woNumber} — ${address}
Description: ${rawDesc}
Event: work_order.created

Triage this work order: classify urgency (Emergency/Urgent/Routine), identify the Aptly issue type, recommend troubleshoot-first or instant dispatch, suggest the right vendor for Chandler/East Valley, and flag any escalation triggers. Be concise — this is a Slack notification for the team.`;

    // Get Ari's triage
    let reply;
    let issueType = '';
    try {
      const triageMessages = [{ role: 'user', content: triagePrompt + '\n\nAlso tell me: what is the exact Aptly Maintenance Category you would assign this? Reply with the issue type on a line starting with "ISSUE_TYPE:" so I can parse it.' }];
      reply = await runAgentLoop(triageMessages);
      // Extract issue type from reply
      const issueMatch = reply.match(/ISSUE_TYPE:\s*(.+)/);
      if (issueMatch) {
        issueType = issueMatch[1].trim();
        reply = reply.replace(/ISSUE_TYPE:\s*.+\n?/, '').trim();
      }
    } catch(loopErr) {
      console.error('Triage loop error:', loopErr.message);
      reply = 'Triage completed — check work order manually.';
    }

    // Post to #ari-maintenance
    const triagePost = await slackApp.client.chat.postMessage({
      channel: ARI_CHANNEL,
      text: `🔔 *${isNew ? 'New' : 'Updated'} Work Order* — WO #${woNumber}\n📍 ${address}\n\n${reply}\n\n_Reply in this thread to take action on WO #${woNumber} at ${address}_`,
    });

    // Wait 45 seconds for Aptly sync then update issue type and grab real address
    if (woNumber) {
      setTimeout(async () => {
        try {
          const searchRes = await hubRequest('GET', `/api/aptly/cards/search?query=${woNumber}`);
          if (searchRes.status === 200 && searchRes.body.items && searchRes.body.items.length > 0) {
            const card = searchRes.body.items[0];
            const realAddress = card.address || card.title || '';
            // Update issue type if we have one
            if (issueType) {
              await hubRequest('POST', `/api/aptly/cards/${card.id}`, { _id: card.id, nfEujqs3ujMNgMFom: issueType });
              console.log(`Auto-set issue type "${issueType}" on card ${card.id} for WO #${woNumber}`);
              await slackApp.client.chat.postMessage({
                channel: ARI_CHANNEL,
                text: `✅ *WO #${woNumber}* — ${realAddress || address}
Auto-set issue type: *${issueType}*`,
              });
            }
          } else {
            console.log('Aptly card not found yet for WO #' + woNumber);
          }
        } catch(e) {
          console.error('Auto issue type error:', e.message);
        }
      }, 45000);
    }

    res.json({ ok: true });
  } catch(e) {
    console.error('Webhook error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

webhookApp.post('/webhook/quo', express.json(), async (req, res) => {
  try {
    const { from, inboxNumber, body, hasAttachment, mediaUrls, isInvoice, isQuote, vendorName } = req.body;
    console.log('Quo message from:', from, 'vendor:', vendorName, 'attachment:', hasAttachment, 'invoice:', isInvoice, 'quote:', isQuote);

    const type = isInvoice ? 'INVOICE' : isQuote ? 'QUOTE' : 'ATTACHMENT';
    const emoji = isInvoice ? '🧾' : isQuote ? '💰' : '📎';
    const vendorDisplay = vendorName || from;

    const prompt = `A vendor just sent a ${type.toLowerCase()} via text to the Aloe maintenance line.
From: ${vendorDisplay} (${from})
${vendorName ? `Vendor identified: ${vendorName}` : 'Vendor not found in Rentvine — unknown sender'}
Message: ${body || '(no text — attachment only)'}
Has attachment: ${hasAttachment}
${mediaUrls && mediaUrls.length ? 'Attachment URLs: ' + mediaUrls.join(', ') : ''}

${isInvoice ? `This appears to be an INVOICE from ${vendorDisplay}. Search Aptly for recent work orders assigned to this vendor and suggest which one to close. The bill should be entered in Rentvine and the work order marked Completed.` : ''}
${isQuote ? `This appears to be a QUOTE/ESTIMATE from ${vendorDisplay}. The team should review and approve or decline before proceeding.` : ''}
${!isInvoice && !isQuote ? `This is an attachment from ${vendorDisplay}. Determine what action the team should take.` : ''}
Be concise — this is a Slack alert for the maintenance team.`;

    const reply = await runAgentLoop([{ role: 'user', content: prompt }]);

    await slackApp.client.chat.postMessage({
      channel: ARI_CHANNEL,
      text: `${emoji} *Vendor ${type} Received*
📱 From: ${from}
💬 "${body || '(attachment only)'}"

${reply}`,
    });

    res.json({ ok: true });
  } catch(e) {
    console.error('Quo webhook error:', e.message);
    res.status(500).json({ error: e.message });
  }
});

webhookApp.get('/webhook/health', (req, res) => res.json({ ok: true, service: 'ari-webhook' }));


// ── Daily follow-up check ─────────────────────────────────────────────────
async function runDailyFollowUp() {
  console.log('Running daily follow-up check...');
  try {
    // Fetch all WOs from Hub
    const res = await hubRequest('GET', '/api/aptly/cards/search?query=scheduled');
    if (res.status !== 200) { console.error('Follow-up fetch failed:', res.status); return; }

    const cards = res.body.items || [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdue = cards.filter(c => {
      if ((c.stage || '').toLowerCase() !== 'scheduled') return false;
      if (!c.scheduledDate) return false;
      const scheduled = new Date(c.scheduledDate);
      scheduled.setHours(0, 0, 0, 0);
      return (today - scheduled) >= (24 * 60 * 60 * 1000);
    });

    console.log(`Follow-up check: ${cards.length} scheduled cards, ${overdue.length} overdue`);
    if (!overdue.length) return;

    let msg = `⏰ *Daily Follow-Up — ${overdue.length} work order${overdue.length > 1 ? 's' : ''} past scheduled date*\n`;
    msg += `_These were scheduled yesterday or earlier and may need a status check:_\n\n`;
    for (const c of overdue) {
      const vendor = c.vendor || 'No vendor listed';
      const sched = c.scheduledDate || '?';
      msg += `• *WO #${c.woNumber || c.id}* — ${c.title || 'Unknown'}\n`;
      msg += `  Vendor: ${vendor} | Was scheduled: ${sched}\n\n`;
    }
    msg += `Reply with what you'd like to do on any of these.`;

    await slackApp.client.chat.postMessage({ channel: ARI_CHANNEL, text: msg });
    console.log('Follow-up posted to Slack');
  } catch(e) {
    console.error('Daily follow-up error:', e.message);
  }
}

function scheduleFollowUp() {
  // Arizona = UTC-7, no DST. 9am AZ = 16:00 UTC
  function msUntilNext9amAZ() {
    const now = new Date();
    const azNow = new Date(now.toLocaleString('en-US', { timeZone: 'America/Phoenix' }));
    const next = new Date(azNow);
    next.setHours(9, 0, 0, 0);
    if (azNow >= next) next.setDate(next.getDate() + 1);
    return next - azNow;
  }
  const ms = msUntilNext9amAZ();
  console.log(`Follow-up scheduled in ${Math.round(ms/60000)} min`);
  setTimeout(() => {
    runDailyFollowUp();
    setInterval(runDailyFollowUp, 24 * 60 * 60 * 1000);
  }, ms);
}

// ── Start both servers ─────────────────────────────────────────────────────
(async () => {
  SYSTEM_PROMPT = await loadPlaybook('ari', SYSTEM_PROMPT);
  await slackApp.start();
  console.log('⚡ Ari is online and listening for @Ari mentions');
  scheduleFollowUp();

  const WEBHOOK_PORT = process.env.WEBHOOK_PORT || 3001;
  webhookApp.listen(WEBHOOK_PORT, () => {
    console.log(`🪝 Webhook server listening on port ${WEBHOOK_PORT}`);
    console.log(`   Rentvine webhook URL: http://34.16.238.69:${WEBHOOK_PORT}/webhook/rentvine`);
  });
})();
