require('dotenv').config({ path: '.env.mary' });
const { loadPlaybook, savePlaybook } = require('./loadPlaybook');
const { logActivity } = require('./logActivity');
const { App } = require('@slack/bolt');
const Anthropic = require('@anthropic-ai/sdk');
const { getMcpServers } = require('./mcpConfig');
const { hubRequest } = require('./hub-client');
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
  },
  {
    name: 'check_existing_placement_bill',
    description: 'Check if a placement/leasing fee bill has already been posted to a property in Rentvine. Searches bills for GL account 6112 (Commissions/Placement Fees) for the property. Use before posting a new placement fee bill to avoid duplicates.',
    input_schema: {
      type: 'object',
      properties: {
        propertyID: { type: 'string', description: 'Rentvine property ID' },
        search: { type: 'string', description: 'Property address if propertyID unknown' }
      }
    }
  },
  {
    name: 'get_lease_payments',
    description: 'Get all payments and charges for a lease. Shows move-in funds paid, when they were paid, outstanding balance, and payment history. Use to verify move-in funds received before releasing keys.',
    input_schema: {
      type: 'object',
      properties: {
        leaseID: { type: 'string', description: 'Rentvine lease ID' },
        search: { type: 'string', description: 'Property address or tenant name if leaseID unknown' }
      }
    }
  },
  {
    name: 'post_placement_fee_bill',
    description: 'Post a placement/leasing fee bill to a property in Rentvine. Payee is always Aloe Property Management (contactID 1), GL account 6112. ALWAYS check check_existing_placement_bill first to avoid duplicates. ALWAYS confirm the amount with staff before posting.',
    input_schema: {
      type: 'object',
      properties: {
        propertyID: { type: 'string', description: 'Rentvine property ID' },
        portfolioID: { type: 'string', description: 'Rentvine portfolio ID (ledger owner)' },
        amount: { type: 'number', description: 'Placement fee amount to bill' },
        memo: { type: 'string', description: 'Note explaining the fee (e.g. standard fee, owner-sourced reduction)' },
        date: { type: 'string', description: 'Bill date in YYYY-MM-DD format. Defaults to today.' }
      },
      required: ['propertyID', 'portfolioID', 'amount']
    }
  }
];

async function executeMaryTool(name, input) {
  const azNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' }));
  const today = azNow.toISOString().slice(0, 10);

  switch(name) {
    case 'get_move_in_lease': {
      // Use Hub property lookup (fast) — strip city/state for best match
      const shortQ = (input.search || '').split(',')[0].replace(/(gilbert|chandler|mesa|phoenix|scottsdale|maricopa|tempe|az|arizona)/gi, '').trim().slice(0, 20);
      const propRes = await hubRequest('GET', `/api/rentvine/property-lookup?q=${encodeURIComponent(shortQ)}`);
      let propertyID = null;
      let address = null;
      if (propRes.status === 200 && propRes.body) {
        const props = propRes.body.properties || (Array.isArray(propRes.body) ? propRes.body : [propRes.body]);
        const p = props[0];
        propertyID = p?.propertyId || p?.propertyID || p?.property?.propertyID;
        address = p?.address || p?.property?.address;
      }
      // If Hub lookup failed, fall back to tenant name search in leases
      let leaseID = null;
      let unit = {};
      if (propertyID) {
        // Get lease for this property
        const unitRes = await rvFetch('/properties/units/export', { pageSize: 10, page: 1, propertyID });
        const units = Array.isArray(unitRes) ? unitRes : (unitRes.data || []);
        if (units.length) {
          unit = units[0].unit || {};
          leaseID = unit.leaseID;
        }
        // If no active lease on unit, check future leases
        if (!leaseID) {
          const leases = await rvFetch('/leases/export', { pageSize: 10, page: 1, primaryLeaseStatusIDs: '1,2', propertyIDs: propertyID });
          const la = Array.isArray(leases) ? leases : (leases.data || []);
          if (la.length) leaseID = la[0].lease?.leaseID;
        }
      } else {
        // Fall back: search by tenant name across active leases (up to 3 pages)
        const nameSearch = (input.search || '').toLowerCase().replace(/[^a-z]/g, '');
        for (let pg = 1; pg <= 3; pg++) {
          const ld = await rvFetch('/leases/export', { pageSize: 100, page: pg, primaryLeaseStatusIDs: '1,2' });
          const batch = Array.isArray(ld) ? ld : (ld.data || []);
          if (!batch.length) break;
          const match = batch.find(l => {
            const tenants = (l.lease?.tenants || []).map(t => typeof t === 'string' ? t : t.name || '').join(' ').toLowerCase().replace(/[^a-z]/g, '');
            return tenants.includes(nameSearch.slice(0, 8));
          });
          if (match) { leaseID = match.lease?.leaseID; unit = match.unit || {}; propertyID = match.property?.propertyID; break; }
          if (batch.length < 100) break;
        }
      }
      if (!leaseID) return JSON.stringify({ error: `No active/pending lease found for: ${input.search}` });
      const leaseData = await rvFetch(`/leases/${leaseID}`);
      const lease = leaseData.lease || leaseData;
      let tenants = [];
      try {
        const t = await rvFetch(`/leases/${leaseID}/tenants`);
        tenants = (Array.isArray(t) ? t : (t.data || [])).map(t => ({ name: t.name || t.displayName, email: t.email }));
      } catch(e) {}
      return JSON.stringify({
        leaseID,
        propertyID,
        address: address || unit.address,
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
      // If no propertyID, use Hub property lookup (fast) — use street number only for best results
      if (!propID && input.search) {
        const shortQuery = (input.search || '').split(',')[0].replace(/(gilbert|chandler|mesa|phoenix|scottsdale|maricopa|tempe|az|arizona)/gi, '').trim().slice(0, 20);
        const propRes = await hubRequest('GET', `/api/rentvine/property-lookup?q=${encodeURIComponent(shortQuery)}`);
        if (propRes.status === 200 && propRes.body) {
          const props = propRes.body.properties || (Array.isArray(propRes.body) ? propRes.body : [propRes.body]);
          const p = props[0];
          propID = p?.propertyId || p?.propertyID || p?.property?.propertyID;
        }
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
    case 'check_existing_placement_bill': {
      let propID = input.propertyID;
      if (!propID && input.search) {
        const shortQ = (input.search || '').split(',')[0].replace(/(gilbert|chandler|mesa|phoenix|scottsdale|maricopa|tempe|az|arizona)/gi, '').trim().slice(0, 20);
        const propRes = await hubRequest('GET', `/api/rentvine/property-lookup?q=${encodeURIComponent(shortQ)}`);
        if (propRes.status === 200 && propRes.body) {
          const props = propRes.body.properties || [];
          propID = props[0]?.propertyId || props[0]?.propertyID;
        }
      }
      if (!propID) return JSON.stringify({ error: 'Property not found' });
      // Search bills for this property with GL 6112
      const azNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' }));
      const startDate = new Date(azNow.getTime() - 90 * 86400000).toISOString().slice(0, 10);
      const bills = await rvFetch('/accounting/bills', { pageSize: 50, page: 1 });
      const arr = Array.isArray(bills) ? bills : (bills.data || []);
      // Filter bills for this property by checking charges
      const matches = [];
      for (const b of arr.slice(0, 20)) {
        if (b.bill?.isVoided === '1') continue;
        try {
          const detail = await rvFetch(`/accounting/bills/${b.bill?.billID}`, { includes: 'charges,property' });
          const charges = detail.charges || [];
          const isPlacement = charges.some(c => String(c.transaction?.chargeAccountID) === '94' || String(c.transaction?.chargeAccountID) === '6112');
          const isThisProp = charges.some(c => String(c.property?.propertyID) === String(propID));
          if (isPlacement && isThisProp) {
            matches.push({
              billID: b.bill?.billID,
              date: b.bill?.billDate,
              amount: charges.find(c => isPlacement)?.transaction?.amount,
              isVoided: b.bill?.isVoided,
              memo: b.bill?.description
            });
          }
        } catch(e) {}
      }
      return JSON.stringify({ propertyID: propID, existingBills: matches, found: matches.length > 0 });
    }
    case 'get_lease_payments': {
      let leaseID = input.leaseID;
      if (!leaseID && input.search) {
        // Use lease search
        const shortQ = (input.search || '').split(',')[0].replace(/(gilbert|chandler|mesa|phoenix|scottsdale|maricopa|tempe|az|arizona)/gi, '').trim().slice(0, 20);
        const propRes = await hubRequest('GET', `/api/rentvine/property-lookup?q=${encodeURIComponent(shortQ)}`);
        if (propRes.status === 200 && propRes.body?.properties?.length) {
          leaseID = propRes.body.properties[0]?.leaseId;
        }
      }
      if (!leaseID) return JSON.stringify({ error: 'Lease not found' });
      // Get lease balance
      const balance = await rvFetch(`/leases/${leaseID}/balance`).catch(() => null);
      // Get transactions
      const txns = await rvFetch('/accounting/transactions/search', { leaseIDs: leaseID, pageSize: 50, page: 1, transactionTypeIDs: '2' }).catch(() => null);
      const payments = Array.isArray(txns) ? txns : (txns?.data || []);
      return JSON.stringify({
        leaseID,
        balance: balance?.balance || balance,
        totalUnpaid: balance?.unpaidTotalAmount,
        payments: payments.slice(0, 20).map(p => ({
          date: p.transaction?.datePosted || p.datePosted,
          amount: p.transaction?.amount || p.amount,
          description: p.transaction?.description || p.description,
          type: p.transaction?.transactionTypeID
        }))
      });
    }
    case 'post_placement_fee_bill': {
      const azNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' }));
      const today = azNow.toISOString().slice(0, 10);
      const billDate = input.date || today;
      // Resolve propertyID if not provided
      let propID = input.propertyID;
      if (!propID && input.search) {
        const shortQ = (input.search || '').split(',')[0].replace(/(gilbert|chandler|mesa|phoenix|scottsdale|maricopa|tempe|az|arizona)/gi, '').trim().slice(0, 20);
        const propRes = await hubRequest('GET', `/api/rentvine/property-lookup?q=${encodeURIComponent(shortQ)}`);
        if (propRes.status === 200 && propRes.body?.properties?.length) {
          propID = propRes.body.properties[0]?.propertyId;
        }
      }
      if (!propID) return JSON.stringify({ error: 'Property not found — provide propertyID or search address' });
      // Get the property's portfolioID then get the portfolio ledger
      const propData = await rvFetch(`/properties/${propID}`);
      const portfolioID = propData.property?.portfolioID;
      if (!portfolioID) return JSON.stringify({ error: 'Could not find portfolio for property ' + propID });
      const portData = await rvFetch(`/portfolios/${portfolioID}`, { includes: 'ledger' });
      const ledgerID = portData.ledger?.ledgerID;
      if (!ledgerID) return JSON.stringify({ error: 'Could not find ledger for portfolio ' + portfolioID });
      // Post the bill
      const body = {
        payeeContactID: 1,
        billDate,
        dateDue: billDate,
        description: input.memo || 'Leasing/Placement Fee',
        charges: [{
          ledgerID: String(ledgerID),
          chargeAccountID: '94',
          amount: String(input.amount),
          description: input.memo || 'Leasing/Placement Fee'
        }]
      };
      const r = await fetch(`${RENTVINE_BASE}/accounting/bills`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${RENTVINE_AUTH}`,
          'X-Rentvine-Account': process.env.RENTVINE_ACCOUNT,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });
      const result = await r.json();
      if (!r.ok) return JSON.stringify({ error: `Rentvine ${r.status}`, detail: JSON.stringify(result).slice(0,200) });
      return JSON.stringify({ success: true, billID: result.bill?.billID, amount: input.amount, date: billDate, propertyID: propID, ledgerID });
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
