require('dotenv').config({ path: '.env.bo' });
const { loadPlaybook } = require('./loadPlaybook');
const { logActivity } = require('./logActivity');
const { App } = require('@slack/bolt');
const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

const RENTVINE_BASE = `https://${process.env.RENTVINE_ACCOUNT}.rentvine.com/api/manager`;
const RENTVINE_AUTH = Buffer.from(`${process.env.RENTVINE_API_KEY}:${process.env.RENTVINE_API_SECRET}`).toString('base64');
const APTLY_TOKEN = process.env.APTLY_TOKEN;

async function rvFetch(path, params = {}) {
  const url = new URL(`${RENTVINE_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) url.searchParams.set(k, v); });
  const r = await fetch(url.toString(), { headers: { Authorization: `Basic ${RENTVINE_AUTH}`, 'X-Rentvine-Account': process.env.RENTVINE_ACCOUNT } });
  if (!r.ok) { const txt = await r.text(); throw new Error(`Rentvine ${r.status}: ${txt.slice(0, 100)}`); }
  return r.json();
}

async function rvReport(reportName, filters = [], displayColumns = []) {
  const url = `${RENTVINE_BASE}/reports/${reportName}?exportTypeID=1&json=${encodeURIComponent(JSON.stringify({ displayColumns, filters, orderBys: [] }))}`;
  const r = await fetch(url, { headers: { Authorization: `Basic ${RENTVINE_AUTH}`, 'X-Rentvine-Account': process.env.RENTVINE_ACCOUNT } });
  if (!r.ok) throw new Error(`Rentvine report ${r.status}`);
  const data = await r.json();
  return Array.isArray(data) ? data : (data.data || []);
}

const ALOE_FEE_IDS = new Set([93, 94, 40, 148, 58, 14, 51, 90, 136, 57, 12, 62, 56, 145, 19]);

const BO_TOOLS = [
  {
    name: 'get_todays_settlements',
    description: 'Get payments that settled today or on a specific date. Use to answer questions about late rent payments that cleared, who settled, and owner payout amounts.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format. Defaults to today if not provided.' }
      }
    }
  },
  {
    name: 'get_unpaid_bills',
    description: 'Get all unpaid owner expense bills from Rentvine, grouped by property. Excludes Aloe fee accounts.',
    input_schema: {
      type: 'object',
      properties: {
        propertyID: { type: 'string', description: 'Optional — filter by specific property ID' }
      }
    }
  },
  {
    name: 'get_lease_charges',
    description: 'Get unpaid charges for a specific lease to check if tenant is past due.',
    input_schema: {
      type: 'object',
      properties: {
        leaseID: { type: 'string', description: 'Rentvine lease ID' }
      },
      required: ['leaseID']
    }
  },
  {
    name: 'get_owner_payout_summary',
    description: 'Calculate which owners are ready to be paid out based on late rent that has settled today. Shows owner net after management fee and unpaid bills.',
    input_schema: {
      type: 'object',
      properties: {
        date: { type: 'string', description: 'Date in YYYY-MM-DD format. Defaults to today.' }
      }
    }
  },
  {
    name: 'get_bills_by_property',
    description: 'Get all unpaid bills for a specific property address or property ID.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Property address to search for' }
      },
      required: ['search']
    }
  },
  {
    name: 'get_tenant_ledger',
    description: 'Get the full accounting ledger for a tenant or lease.',
    input_schema: {
      type: 'object',
      properties: {
        leaseID: { type: 'string', description: 'Rentvine lease ID' }
      },
      required: ['leaseID']
    }
  }
  ,{
    name: "get_posted_payments",
    description: "Get lease payments posted in Rentvine by date range. Use this when settlement report returns no results.",
    input_schema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string", description: "End date YYYY-MM-DD" }
      }
    }
  }
  ,
  {
    name: "get_paid_bills_by_vendor",
    description: "Get historical paid bills filtered by vendor contact ID. Use for check register lookups, expense log reconciliation, or payment history for a specific vendor like Aloe Reimbursements (contactID 3229) or management income (contactIDs 1 or 3380). Includes date range filtering.",
    input_schema: {
      type: "object",
      properties: {
        contactID: { type: "string", description: "Rentvine contact/vendor ID. 3229=Aloe Reimbursements, 1=Aloe PM, 3380=Aloe PM-Vendor" },
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string", description: "End date YYYY-MM-DD" }
      }
    }
  },
  {
    name: "get_check_register",
    description: "Pull the check register from Rentvine — all payments made out of the trust account for a date range. Use for bank reconciliation, owner payment verification, or auditing vendor payments.",
    input_schema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string", description: "End date YYYY-MM-DD" },
        propertyID: { type: "string", description: "Optional — filter by property" }
      }
    }
  },
  {
    name: "get_deposit_register",
    description: "Pull the deposit/receipt register from Rentvine — all money received into the trust account for a date range. Use for bank reconciliation or confirming rent deposits.",
    input_schema: {
      type: "object",
      properties: {
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string", description: "End date YYYY-MM-DD" },
        propertyID: { type: "string", description: "Optional — filter by property" }
      }
    }
  },
  {
    name: "get_owner_ledger",
    description: "Pull the owner ledger from Rentvine for a specific owner or property — shows all charges, payments, and draws. Use for owner statement prep or reconciliation.",
    input_schema: {
      type: "object",
      properties: {
        ownerID: { type: "string", description: "Rentvine owner contact ID" },
        propertyID: { type: "string", description: "Optional — filter by property" },
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string", description: "End date YYYY-MM-DD" }
      }
    }
  },
  {
    name: "run_accounting_report",
    description: "Run any Rentvine accounting report by name. Report names: payables, checks, receipts, ownerLedger, tenantLedger, trialBalance, managementFees. Use when a specific report is needed that other tools do not cover.",
    input_schema: {
      type: "object",
      properties: {
        reportName: { type: "string", description: "Rentvine report route name" },
        startDate: { type: "string", description: "Start date YYYY-MM-DD" },
        endDate: { type: "string", description: "End date YYYY-MM-DD" },
        contactID: { type: "string", description: "Optional vendor/contact filter" },
        propertyID: { type: "string", description: "Optional property filter" }
      },
      required: ["reportName"]
    }
  }
];

async function executeTool(name, input) {
  const azNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' }));
  const today = azNow.toISOString().slice(0, 10);

  switch(name) {
    case 'get_todays_settlements': {
      const date = input.date || today;
      const data = await rvReport('settlement-detail',
        [{ name: 'settlementDate', comparator: 'betweenDate', startDate: date, endDate: date }],
        ['settlementDate','datePosted','contactName','unit','amount','reference']
      );
      return JSON.stringify({ date, count: data.length, settlements: data });
    }
case 'get_posted_payments': {
      const date = input.date || today;
      const startDate = input.startDate || date;
      const endDate = input.endDate || date;
      // Pull lease payments posted in date range
      let allPayments = [];
      for (let pg = 1; pg <= 5; pg++) {
        const data = await rvFetch('/accounting/transactions', {
          pageSize: 200, page: pg,
          startDate, endDate,
          transactionTypeIDs: 2 // lease payments
        });
        const batch = Array.isArray(data) ? data : (data.data || []);
        if (!batch.length) break;
        allPayments = allPayments.concat(batch);
        if (batch.length < 200) break;
      }
      return JSON.stringify({ startDate, endDate, count: allPayments.length, payments: allPayments.slice(0, 50) });
    }
    case 'get_unpaid_bills': {
      const filters = [
        { name: 'isPaid', comparator: 'booleanFalse' },
        { name: 'isVoided', comparator: 'booleanFalse' }
      ];
      const data = await rvReport('payables', filters,
        ['propertyID','contactName','chargeAccountID','datePosted','dateDue','amount','amountUnpaid','description','billID']
      );
      const ownerBills = data.filter(b => !ALOE_FEE_IDS.has(parseInt(b.chargeAccountID || 0)));
      if (input.propertyID) {
        return JSON.stringify(ownerBills.filter(b => String(b.propertyID) === String(input.propertyID)));
      }
      const slimBills = ownerBills.slice(0, 30).map(b => ({
        billID: b.billID, propID: b.propertyID, vendor: b.contactName,
        amount: b.amountUnpaid || b.amount, desc: (b.description||'').slice(0,60), due: b.dateDue
      }));
      return JSON.stringify({ count: ownerBills.length, bills: slimBills });
    }

    case 'get_lease_charges': {
      // Get unpaid charges via transactions endpoint
      const data = await rvFetch('/accounting/transactions', { 
        leaseID: input.leaseID, pageSize: 50,
        'transactionTypeIDs[]': 1  // 1 = charges
      });
      const allCharges = Array.isArray(data) ? data : (data.data || []);
      // Filter to unpaid/past due
      const currentMonthStart = azNow.getFullYear() + '-' + String(azNow.getMonth() + 1).padStart(2, '0') + '-01';
      const unpaid = allCharges.filter(c => {
        const due = c.dateDue || c.dueDate || c.datePosted || '';
        const isPaid = c.isPaid === true || c.isPaid === 1 || c.isPaid === '1';
        return !isPaid && due && due < currentMonthStart;
      });
      return JSON.stringify({ 
        leaseID: input.leaseID, 
        totalCharges: allCharges.length,
        pastDueCharges: unpaid.slice(0, 20).map(c => ({
          desc: c.description, amount: c.amount, due: c.dateDue || c.dueDate, isPaid: c.isPaid
        }))
      });
    }

    case 'get_owner_payout_summary': {
      const date = input.date || today;
      const currentMonthStart = `${azNow.getFullYear()}-${String(azNow.getMonth() + 1).padStart(2, '0')}-01`;

      // Get settlements
      const settlements = await rvReport('settlement-detail',
        [{ name: 'settlementDate', comparator: 'betweenDate', startDate: date, endDate: date }],
        ['settlementDate','datePosted','contactName','unit','amount','reference']
      );

      if (settlements.length === 0) return JSON.stringify({ date, message: 'No settlements on this date' });

      // Get all active leases
      let allLeases = [];
      for (let pg = 1; pg <= 10; pg++) {
        const batch = await rvFetch('/leases/export', { pageSize: 200, page: pg, 'primaryLeaseStatusIDs[]': 2 });
        if (!Array.isArray(batch) || batch.length === 0) break;
        allLeases = allLeases.concat(batch);
        if (batch.length < 200) break;
      }

      const leaseByTenant = {};
      allLeases.forEach(item => {
        const l = item.lease || item;
        const tenants = Array.isArray(l.tenants) ? l.tenants : [];
        tenants.forEach(t => {
          if (t.name) leaseByTenant[t.name.toLowerCase()] = {
            leaseID: l.leaseID,
            propertyID: (item.property && item.property.propertyID) || l.propertyID,
            address: (item.unit && item.unit.address) || (item.property && item.property.address) || '',
            city: (item.unit && item.unit.city) || (item.property && item.property.city) || '',
          };
        });
      });

      // Get unpaid bills
      const billsData = await rvReport('payables',
        [{ name: 'isPaid', comparator: 'booleanFalse' }, { name: 'isVoided', comparator: 'booleanFalse' }],
        ['propertyID','chargeAccountID','amount','amountUnpaid','description','billID']
      );
      const ownerBillsByProp = {};
      billsData.forEach(b => {
        if (ALOE_FEE_IDS.has(parseInt(b.chargeAccountID || 0))) return;
        const pid = String(b.propertyID || '');
        if (!ownerBillsByProp[pid]) ownerBillsByProp[pid] = [];
        ownerBillsByProp[pid].push({ desc: b.description, amount: parseFloat(b.amountUnpaid || b.amount || 0), billID: b.billID });
      });

      const results = [];
      for (const s of settlements) {
        const amount = parseFloat(s.amount || 0);
        if (amount <= 0) continue;
        const leaseInfo = leaseByTenant[(s.contactName || '').toLowerCase()];
        if (!leaseInfo) { results.push({ tenant: s.contactName, amount, status: 'lease not found' }); continue; }

        // Check past due
        const charges = await rvFetch('/leases/' + leaseInfo.leaseID + '/charges', { pageSize: 50, isPaid: false });
        const chargeArr = Array.isArray(charges) ? charges : (charges.data || []);
        const pastDue = chargeArr.filter(c => (c.dateDue || c.dueDate || '') < currentMonthStart);
        if (pastDue.length === 0) { results.push({ tenant: s.contactName, address: leaseInfo.address, amount, status: 'current/prepaid — skip' }); continue; }

        const ownerBills = ownerBillsByProp[String(leaseInfo.propertyID)] || [];
        const ownerBillTotal = ownerBills.reduce((a, b) => a + b.amount, 0);
        const ownerNet = amount - 89 - ownerBillTotal;

        results.push({
          tenant: s.contactName,
          address: leaseInfo.address,
          city: leaseInfo.city,
          settled: amount,
          mgmtFee: 89,
          ownerBillTotal,
          ownerBills,
          ownerNet,
          pastDueCharges: pastDue.map(c => `${c.description} due ${(c.dateDue||c.dueDate||'').slice(0,10)}`),
          status: ownerBills.length > 0 ? 'verify bills before paying' : 'ready to pay out'
        });
      }

      return JSON.stringify({ date, results });
    }

    case 'get_bills_by_property': {
      const props = await rvFetch('/properties/export', { pageSize: 200, page: 1 });
      const match = (Array.isArray(props) ? props : []).find(p =>
        ((p.property && p.property.address) || '').toLowerCase().includes(input.search.toLowerCase())
      );
      if (!match) return JSON.stringify({ error: 'Property not found: ' + input.search });
      const propID = match.property && match.property.propertyID;
      const bills = await rvReport('payables',
        [{ name: 'isPaid', comparator: 'booleanFalse' }, { name: 'isVoided', comparator: 'booleanFalse' }],
        ['propertyID','contactName','chargeAccountID','datePosted','dateDue','amount','amountUnpaid','description','billID']
      );
      const propBills = bills.filter(b => String(b.propertyID) === String(propID) && !ALOE_FEE_IDS.has(parseInt(b.chargeAccountID || 0)));
      return JSON.stringify({ property: match.property.address, propID, bills: propBills });
    }

    case 'get_tenant_ledger': {
      const data = await rvFetch('/accounting/transactions', { 
        leaseID: input.leaseID, pageSize: 30
      });
      const txns = Array.isArray(data) ? data : (data.data || []);
      return JSON.stringify({ 
        leaseID: input.leaseID, 
        count: txns.length,
        transactions: txns.slice(0, 20).map(t => ({
          date: t.datePosted, type: t.transactionType, 
          desc: (t.description||'').slice(0,60), 
          amount: t.amount, isPaid: t.isPaid
        }))
      });
    }

    case 'get_posted_payments': {
      const startDate = input.startDate || today;
      const endDate = input.endDate || today;

      // Get active lease IDs first to filter results
      let activeLeaseIDs = new Set();
      for (let pg = 1; pg <= 10; pg++) {
        const batch = await rvFetch('/leases/export', { 
          pageSize: 200, page: pg,
          'primaryLeaseStatusIDs[]': 2
        });
        if (!Array.isArray(batch) || !batch.length) break;
        batch.forEach(item => {
          const l = item.lease || item;
          if (l.leaseID) activeLeaseIDs.add(String(l.leaseID));
        });
        if (batch.length < 200) break;
      }

      let allPayments = [];
      for (let pg = 1; pg <= 3; pg++) {
        const data = await rvFetch('/accounting/transactions', {
          pageSize: 100, page: pg,
          startDate, endDate,
          'transactionTypeIDs[]': 2
        });
        const batch = Array.isArray(data) ? data : (data.data || []);
        if (!batch.length) break;
        allPayments = allPayments.concat(batch);
        if (batch.length < 100) break;
      }

      // Filter to active leases only
      allPayments = allPayments.filter(t => activeLeaseIDs.has(String(t.leaseID)));
      const slim = allPayments.slice(0, 30).map(t => ({
        id: t.transactionID || t.id,
        date: t.datePosted || t.date,
        tenant: t.contactName || t.name || '',
        amount: t.amount,
        leaseID: t.leaseID,
        address: t.address || t.unitAddress || '',
        description: (t.description || '').slice(0, 80)
      }));
      return JSON.stringify({ startDate, endDate, count: allPayments.length, payments: slim });
    }
        default:
      return JSON.stringify({ error: 'Unknown tool: ' + name });
  }
}

function buildSystemPrompt() {
  return `You are Bo, the Accounting AI agent for Aloe Property Management (Phoenix metro area).
You have LIVE access to Rentvine via tools — always use your tools to get real data before answering.
Never say you don't have access — you do. Call the tools.

You handle: settled payments, owner payouts, bills, late payment tracking, net payout calculations.
You are precise and numbers-focused. Never guess at amounts — pull real data.

## PAYOUT RULES
- Management fee: $89/month flat ($44.50 for partial months)
- Owner net = rent collected - $89 mgmt fee - unpaid owner expense bills
- Payout dates: 15th, 23rd, last day of month
- Aloe fee accounts to EXCLUDE from owner deductions: 93, 94, 40, 148, 58, 14, 51, 90, 136, 57, 12, 62, 56, 145, 19

## ROUTING
- Tenant balance disputes → @Rex in #rex-residents
- Owner communication → @Lea in #lea-owners
- Maintenance bills → @Ari in #ari-maintenance`;
}

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
  console.log('Bo mentioned:', event.text?.slice(0, 80));
  const userMessage = (event.text || '').replace(/<@[A-Z0-9]+>/g, '').trim();
  if (!userMessage) return;

  const thinking = await say({
    text: '⚙️ Pulling live data...',
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
        const text = (msg.text || '').replace('⚙️ Pulling live data...', '').trim();
        if (text) messages.push({ role: 'assistant', content: text });
      } else if (!msg.bot_id) {
        const text = (msg.text || '').replace(/<@[A-Z0-9]+>/g, '').trim();
        if (text) messages.push({ role: 'user', content: text });
      }
    }
    messages.push({ role: 'user', content: userMessage });

    // Agentic loop — keep calling tools until done
    let current = messages.slice();
    for (let i = 0; i < 10; i++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: buildSystemPrompt(),
        tools: BO_TOOLS,
        messages: current,
      });

      if (response.stop_reason !== 'tool_use') {
        const reply = response.content.filter(b => b.type === 'text').map(b => b.text).join('') || 'Sorry, I had trouble with that.';
        await client.chat.update({ channel: event.channel, ts: thinking.ts, text: reply });
    await logActivity({ agentId: 'bo', type: 'reply', summary: reply.slice(0, 120), outcome: 'sent' });
        return;
      }

      // Process tool calls
      const toolUses = response.content.filter(b => b.type === 'tool_use');
      const toolResults = await Promise.all(toolUses.map(async tb => {
        console.log('Bo tool:', tb.name, JSON.stringify(tb.input).slice(0, 80));
        let result;
        try { result = await executeTool(tb.name, tb.input); }
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
    console.error('Bo error:', e.message);
    await client.chat.update({
      channel: event.channel,
      ts: thinking.ts,
      text: '⚠️ Error: ' + e.message,
    });
  }
});
(async () => {
  SYSTEM_PROMPT = await loadPlaybook('bo', SYSTEM_PROMPT);
  await app.start();
  console.log('⚡ Bo is online with live Rentvine access');
})();
