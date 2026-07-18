require('dotenv').config({ path: '.env.mary' });
const { loadPlaybook, savePlaybook } = require('./loadPlaybook');
const { logActivity } = require('./logActivity');
const { App } = require('@slack/bolt');
const Anthropic = require('@anthropic-ai/sdk');
const { getMcpServers } = require('./mcpConfig');
const fs = require('fs');
const path = require('path');
const https = require('https');
// mary-tools placeholder

const repoPath = process.env.ALOE_REPO_PATH || path.join(process.env.HOME, 'aloe-pm-agent-v2');

function loadFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch(e) { return ''; }
}

function buildSystemPrompt() {
  const playbook = loadFile(path.join(repoPath, '.claude/playbooks/move-in-coordinator.md'));
  const skills = [
    'move-in-checklist', 'lease-prep', 'utilities', 'charges-setup'
  ].map(s => {
    const content = loadFile(path.join(repoPath, `.claude/skills/${s}/SKILL.md`));
    return content ? `\n\n## SKILL: ${s}\n${content}` : '';
  }).join('');

  return `You are Mary, the Move-In Coordinator AI agent for Aloe Property Management (Phoenix metro area).
You handle everything from lease signing through a tenant's first day. You are warm, organized, and proactive — tenants should feel welcomed and fully prepared before they walk through the door.
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


console.log('Mary loaded — playbook:', SYSTEM_PROMPT.length, 'chars');

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

const MARY_TOOLS = [
  {
    name: 'get_move_in_lease',
    description: 'Look up a lease and tenant details for a move-in by property address or tenant name. Returns lease ID, tenant names, move-in date, rent, deposit, charges, and lease status.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Property address or tenant name to search for' }
      },
      required: ['search']
    }
  },
  {
    name: 'get_lease_charges',
    description: 'Get all charges and balance for a specific lease. Shows what has been paid and what is outstanding.',
    input_schema: {
      type: 'object',
      properties: {
        leaseID: { type: 'string', description: 'Rentvine lease ID' }
      },
      required: ['leaseID']
    }
  },
  {
    name: 'get_aptly_movein_card',
    description: 'Get the Move-Ins board card for a tenant or property. Returns card fields including lease verification status, deposit paid checkbox, utilities, insurance, and move-in date.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Tenant name or property address to search for on the Move-Ins board' }
      },
      required: ['search']
    }
  },
  {
    name: 'get_pending_move_ins',
    description: 'Get all upcoming move-ins from the Aptly Move-Ins board. Shows tenants, properties, move-in dates, and status of each step.',
    input_schema: {
      type: 'object',
      properties: {
        days: { type: 'number', description: 'Number of days ahead to look. Default 30.' }
      }
    }
  },
  {
    name: 'get_property_fee_setting',
    description: 'Get the management fee setting for a property including the placement/leasing fee amount, monthly management fee, and renewal fee. Use this on move-in day to determine the correct placement fee to bill. Pass the Rentvine property ID.',
    input_schema: {
      type: 'object',
      properties: {
        propertyID: { type: 'string', description: 'Rentvine property ID' },
        search: { type: 'string', description: 'Property address to search for if propertyID is unknown' }
      }
    }
  }
];

async function executeMaryTool(name, input) {
  const azNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' }));
  const today = azNow.toISOString().slice(0, 10);

  switch(name) {
    case 'get_move_in_lease': {
      const normalizeAddr = s => s.toLowerCase()
        .replace(/east/g, 'e').replace(/west/g, 'w').replace(/north/g, 'n').replace(/south/g, 's')
        .replace(/street/g, 'st').replace(/avenue/g, 'ave').replace(/drive/g, 'dr')
        .replace(/court/g, 'ct').replace(/circle/g, 'cir').replace(/lane/g, 'ln')
        .replace(/place/g, 'pl').replace(/road/g, 'rd').replace(/[^a-z0-9]/g, '');
      const normSearch = normalizeAddr(input.search || '');
      const nameSearch = (input.search || '').toLowerCase().replace(/[^a-z]/g, '');
      // Search pending/active leases only (much smaller set than all units)
      let allLeases = [];
      for (let pg = 1; pg <= 8; pg++) {
        const ld = await rvFetch('/leases/export', { pageSize: 100, page: pg, primaryLeaseStatusIDs: '1,2' });
        const batch = Array.isArray(ld) ? ld : (ld.data || []);
        if (!batch.length) break;
        allLeases = allLeases.concat(batch);
        if (batch.length < 100) break;
      }
      const lMatch = allLeases.find(l => {
        const tenants = (l.lease?.tenants || []).join(' ').toLowerCase().replace(/[^a-z]/g, '');
        const addr = normalizeAddr(l.unit?.address || '');
        return tenants.includes(nameSearch.slice(0, 8)) ||
               addr.includes(normSearch.slice(0, 8)) ||
               normSearch.includes(addr.slice(0, 8));
      });
      if (!lMatch) return JSON.stringify({ error: `No active/pending lease found for: ${input.search}` });
      const leaseID = lMatch.lease?.leaseID;
      const leaseData = await rvFetch(`/leases/${leaseID}`);
      const lease = leaseData.lease || leaseData;
      const unit = lMatch.unit || {};
      let tenants = [];
      try {
        const t = await rvFetch(`/leases/${leaseID}/tenants`);
        tenants = (Array.isArray(t) ? t : (t.data || [])).map(t => ({ name: t.name || t.displayName, email: t.email }));
      } catch(e) {}
      return JSON.stringify({
        leaseID,
        address: unit.address,
        city: unit.city,
        moveInDate: lease.moveInDate || lease.startDate,
        endDate: lease.endDate,
        rent: unit.rent,
        deposit: unit.deposit,
        status: lease.primaryLeaseStatusID,
        rentersInsurance: lease.rentersInsuranceCompany,
        tenants
      });
    }
    case 'get_lease_charges': {
      const charges = await rvFetch(`/leases/${input.leaseID}/charges`);
      const arr = Array.isArray(charges) ? charges : (charges.data || []);
      const balance = await rvFetch(`/leases/${input.leaseID}/balance`).catch(() => null);
      return JSON.stringify({ leaseID: input.leaseID, charges: arr.slice(0, 30), balance });
    }
    case 'get_aptly_movein_card': {
      const searchTerm = (input.search || '').toLowerCase();
      let page = 0;
      let match = null;
      while (page < 10) {
        const r = await fetch(`https://core-api.getaptly.com/api/board/K9mMGGjKgQPqDykaa?page=${page}&pageSize=50`, {
          headers: { 'x-token': process.env.APTLY_TOKEN }
        });
        if (!r.ok) break;
        const data = await r.json();
        const arr = data.data || [];
        if (!arr.length) break;
        match = arr.find(c => {
          const name = JSON.stringify(c).toLowerCase();
          return name.includes(searchTerm.slice(0, 15));
        });
        if (match) break;
        page++;
      }
      if (!match) return JSON.stringify({ error: `No Move-In card found for: ${input.search}` });
      return JSON.stringify(match);
    }
    case 'get_pending_move_ins': {
      const days = input.days || 30;
      const cutoff = new Date(azNow.getTime() + days * 86400000).toISOString().slice(0, 10);
      let all = [];
      let page = 0;
      while (page < 10) {
        const r = await fetch(`https://core-api.getaptly.com/api/board/K9mMGGjKgQPqDykaa?page=${page}&pageSize=50`, {
          headers: { 'x-token': process.env.APTLY_TOKEN }
        });
        if (!r.ok) break;
        const data = await r.json();
        const arr = data.data || [];
        if (!arr.length) break;
        all = all.concat(arr);
        page++;
      }
      // Filter by move-in date within range
      const upcoming = all.filter(c => {
        const moveIn = c.moveInDate || c['Mirror Move-in Date'] || c.mirrorMoveInDate;
        if (!moveIn) return true; // include if no date set
        return moveIn.slice(0, 10) <= cutoff;
      });
      return JSON.stringify({ count: upcoming.length, moveIns: upcoming.slice(0, 20).map(c => ({
        cardId: c._cardId || c.cardId,
        stage: c.stage,
        tenant: c.name || c.title,
        address: c.mirrorAddress || c['Mirror Address'],
        moveInDate: c.moveInDate || c['Mirror Move-in Date'],
        depositPaid: c.depositPaid || c['Deposit Paid'],
        leaseSigned: c.leaseSigned || c['Lease Signed'],
        utilitiesReceived: c.proofOfUtilitiesReceived || c['Proof of Utilities Received'],
        insuranceComplete: c.rentersInsuranceCompany || c['Renters Insurance Company']
      }))});
    }
    case 'get_property_fee_setting': {
      let propID = input.propertyID;
      // If no propertyID, find it by address
      if (!propID && input.search) {
        const normalizeAddr = s => s.toLowerCase()
          .replace(/east/g, 'e').replace(/west/g, 'w').replace(/north/g, 'n').replace(/south/g, 's')
          .replace(/street/g, 'st').replace(/avenue/g, 'ave').replace(/drive/g, 'dr')
          .replace(/[^a-z0-9]/g, '');
        const normSearch = normalizeAddr(input.search);
        let allLeases = [];
        for (let pg = 1; pg <= 8; pg++) {
          const ld = await rvFetch('/leases/export', { pageSize: 100, page: pg, primaryLeaseStatusIDs: '1,2' });
          const batch = Array.isArray(ld) ? ld : (ld.data || []);
          if (!batch.length) break;
          allLeases = allLeases.concat(batch);
          if (batch.length < 100) break;
        }
        const match = allLeases.find(l => {
          const addr = normalizeAddr(l.unit?.address || '');
          const name = (l.lease?.tenants || []).join(' ').toLowerCase().replace(/[^a-z]/g, '');
          return addr.includes(normSearch.slice(0, 8)) || normSearch.includes(addr.slice(0, 8)) ||
                 name.includes(normSearch.replace(/[^a-z]/g, '').slice(0, 8));
        });
        if (match) propID = match.property?.propertyID;
      }
      if (!propID) return JSON.stringify({ error: 'Property not found — provide propertyID or address' });
      const data = await rvFetch(`/properties/${propID}`, { includes: 'managementFeeSetting' });
      const prop = data.property || {};
      const fee = data.managementFeeSetting || {};
      return JSON.stringify({
        propertyID: propID,
        address: prop.address,
        city: prop.city,
        managementFeeSettingID: prop.managementFeeSettingID,
        feeSettingName: fee.name,
        monthlyManagementFee: fee.recurringFixedAmount,
        placementFeeAmount: fee.leaseFeeAmount,
        placementFeeType: fee.leaseFeeTypeID === '2' ? 'fixed' : 'percent',
        placementFeePercent: fee.leaseFeePercent,
        renewalFeeAmount: fee.renewalFeeAmount,
        renewalFeePercent: fee.renewalFeePercent
      });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}


async function getThreadHistory(client, channel, threadTs) {
  try {
    const result = await client.conversations.replies({ channel, ts: threadTs, limit: 20 });
    return result.messages || [];
  } catch(e) { return []; }
}

// ── Tenant @mention handler ───────────────────────────────────────────────
app.event('app_mention', async ({ event, client, say }) => {
  console.log('Mary mentioned:', event.text?.slice(0, 80));
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
    // Agentic loop with tools so Mary can look up Rentvine/Aptly when @mentioned
    let mentionMessages = [...messages];
    let finalReply = 'Sorry, I had trouble processing that.';
    let continueLoop = true;
    while (continueLoop) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: MARY_TOOLS,

        messages: mentionMessages,
      });
      mentionMessages.push({ role: 'assistant', content: response.content });
      if (response.stop_reason === 'tool_use') {
        const toolResults = [];
        for (const block of response.content) {
          if (block.type === 'tool_use') {
            console.log('Mary tool:', block.name, JSON.stringify(block.input).slice(0, 100));
            let result;
            try { result = await executeMaryTool(block.name, block.input); }
            catch(e) { result = JSON.stringify({ error: e.message }); }
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: result });
          }
        }
        mentionMessages.push({ role: 'user', content: toolResults });
      } else {
        finalReply = response.content.find(b => b.type === 'text')?.text || finalReply;
        continueLoop = false;
      }
    }
    await client.chat.update({ channel: event.channel, ts: thinking.ts, text: finalReply });
    await logActivity({ agentId: 'mary', type: 'reply', summary: finalReply.slice(0, 120), outcome: 'sent' });
  } catch(e) {
    console.error('Mary error:', e.message);
    await client.chat.update({
      channel: event.channel,
      ts: thinking.ts,
      text: '⚠️ Sorry, I ran into an error. Try again or check the logs.',
    });
  }
});

(async () => {
  SYSTEM_PROMPT = await loadPlaybook('mary', SYSTEM_PROMPT);
  await savePlaybook('mary', SYSTEM_PROMPT);
  await app.start();
  console.log('⚡ Mary is online');
})();
