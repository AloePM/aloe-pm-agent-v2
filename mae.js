/**
 * Mae — Aloe PM CFO Agent
 * Private Slack channel bot (#cfo or #financials) for Randi only.
 * Answers strategic financial questions: revenue snapshots, management fee
 * tracking, and cash flow summaries — all pulled live from Rentvine.
 *
 * Deploy: PM2 on aloe-agent-server
 * Channel: #cfo (private, invite only Mae bot)
 */

const { App } = require('@slack/bolt');
require('dotenv').config();

// ─── Rentvine config ─────────────────────────────────────────────────────────
const RV_BASE = 'https://api.rentvine.com/v2';
const RV_AUTH = 'Basic ODhkMjJjOGM5NmJlNDYyMWJjMGI3YWRlZGIzZWY3NmQ6MDUzMjFmOGNlMDkwNGVlNGFiNGQ3YzJhODMyYjZkMmU=';
const RV_ACCOUNT = 'aloepm';

// Aloe PM payee contact IDs
const ALOE_PM_CONTACT_IDS = [1, 3380];

// GL account IDs for management income (excluded from owner-facing reports)
const MGMT_FEE_GL_IDS = [93, 94, 40, 148, 58, 14, 51, 90, 136, 57, 12, 62, 56, 145, 19];

// Management fee per property per month (standard)
const MGMT_FEE_MONTHLY = 89;

// ─── Date helpers ─────────────────────────────────────────────────────────────
function today() {
  return new Date().toISOString().split('T')[0];
}

function startOfMonth(offsetMonths = 0) {
  const d = new Date();
  d.setDate(1);
  d.setMonth(d.getMonth() + offsetMonths);
  return d.toISOString().split('T')[0];
}

function endOfMonth(offsetMonths = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths + 1);
  d.setDate(0);
  return d.toISOString().split('T')[0];
}

function monthLabel(offsetMonths = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offsetMonths);
  return d.toLocaleString('default', { month: 'long', year: 'numeric' });
}

function daysIntoMonth() {
  return new Date().getDate();
}

function daysInMonth() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

// ─── Rentvine API ─────────────────────────────────────────────────────────────
async function rvFetch(path, params = {}) {
  const url = new URL(`${RV_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => v !== null && v !== undefined && url.searchParams.set(k, v));
  const res = await fetch(url.toString(), {
    headers: {
      'Authorization': RV_AUTH,
      'X-Rentvine-Account': RV_ACCOUNT,
      'Content-Type': 'application/json',
    }
  });
  if (!res.ok) throw new Error(`Rentvine ${path} → ${res.status}`);
  return res.json();
}

async function fetchAllPages(path, params = {}, arrayKey = null) {
  const results = [];
  let page = 1;
  while (true) {
    const data = await rvFetch(path, { ...params, page, page_size: 100 });
    const rows = arrayKey ? (data[arrayKey] || []) : (Array.isArray(data) ? data : (data.data || []));
    results.push(...rows);
    if (rows.length < 100) break;
    page++;
  }
  return results;
}

// ─── Data fetchers ────────────────────────────────────────────────────────────

/**
 * Fetch all Aloe PM manager bills for a date range.
 * Returns flat line items: { date, description, amount, category }
 */
async function fetchMgmtBills(startDate, endDate) {
  const bills = await fetchAllPages('/bills', {
    start_date: startDate,
    end_date: endDate,
  });

  const aloeBills = bills.filter(b =>
    ALOE_PM_CONTACT_IDS.includes(b.contactID || b.contact_id) &&
    !b.isVoided && !b.voided
  );

  const lineItems = [];
  for (const bill of aloeBills) {
    try {
      const detail = await rvFetch(`/bills/${bill.billID || bill.id}`, { includes: 'charges' });
      const charges = detail.charges || detail.lineItems || [];
      for (const charge of charges) {
        lineItems.push({
          date: bill.billDate || bill.date,
          description: charge.description || charge.memo || '',
          amount: parseFloat(charge.amount || 0),
          glId: charge.accountID || charge.glAccountId || null,
        });
      }
    } catch (_) { /* skip failed bill fetches */ }
  }

  return lineItems;
}

/**
 * Fetch active property count.
 */
async function fetchActivePropertyCount() {
  const props = await fetchAllPages('/properties/export');
  return props.filter(p => (p.property || p).isActive !== false).length;
}

/**
 * Fetch lease payments (tenant rent collected) for a date range.
 */
async function fetchLeasePayments(startDate, endDate) {
  const txns = await fetchAllPages('/transactions', {
    start_date: startDate,
    end_date: endDate,
    transaction_type_id: 2, // Lease Payment
    is_voided: false,
  });
  return txns.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
}

/**
 * Fetch owner payments (owner contributions in) for a date range.
 */
async function fetchOwnerContributions(startDate, endDate) {
  const txns = await fetchAllPages('/transactions', {
    start_date: startDate,
    end_date: endDate,
    transaction_type_id: 4, // Owner Payment/Contribution
    is_voided: false,
  });
  return txns.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
}

/**
 * Fetch owner payouts (money going out to owners) for a date range.
 */
async function fetchOwnerPayouts(startDate, endDate) {
  const txns = await fetchAllPages('/transactions', {
    start_date: startDate,
    end_date: endDate,
    transaction_type_id: 3, // Owner Distribution
    is_voided: false,
  });
  return txns.reduce((sum, t) => sum + parseFloat(t.amount || 0), 0);
}

// ─── Report builders ──────────────────────────────────────────────────────────

/**
 * REVENUE SNAPSHOT
 * Compares this month vs last month for management income by category.
 */
async function buildRevenueSnapshot() {
  const [thisItems, lastItems] = await Promise.all([
    fetchMgmtBills(startOfMonth(0), today()),
    fetchMgmtBills(startOfMonth(-1), endOfMonth(-1)),
  ]);

  function groupByCategory(items) {
    const map = {};
    for (const item of items) {
      const cat = categorize(item.description);
      map[cat] = (map[cat] || 0) + item.amount;
    }
    return map;
  }

  const thisMonth = groupByCategory(thisItems);
  const lastMonth = groupByCategory(lastItems);

  const thisTotal = Object.values(thisMonth).reduce((s, v) => s + v, 0);
  const lastTotal = Object.values(lastMonth).reduce((s, v) => s + v, 0);
  const pct = lastTotal > 0 ? (((thisTotal - lastTotal) / lastTotal) * 100).toFixed(1) : 'N/A';
  const trend = thisTotal >= lastTotal ? '📈' : '📉';

  // All categories across both months
  const allCats = [...new Set([...Object.keys(thisMonth), ...Object.keys(lastMonth)])].sort();

  const rows = allCats.map(cat => {
    const cur = thisMonth[cat] || 0;
    const prev = lastMonth[cat] || 0;
    const diff = cur - prev;
    const diffStr = diff >= 0 ? `+$${diff.toFixed(2)}` : `-$${Math.abs(diff).toFixed(2)}`;
    return `  • *${cat}:* $${cur.toFixed(2)} _(${diffStr} vs last month)_`;
  });

  const dayPct = Math.round((daysIntoMonth() / daysInMonth()) * 100);

  return [
    `${trend} *Revenue Snapshot — ${monthLabel(0)}*`,
    `_${daysIntoMonth()} of ${daysInMonth()} days elapsed (${dayPct}% through month)_\n`,
    `*This month:* $${thisTotal.toFixed(2)}   |   *Last month (${monthLabel(-1)}):* $${lastTotal.toFixed(2)}   |   *Change:* ${pct}%\n`,
    `*By Category:*`,
    ...rows,
    `\n_Source: Aloe PM manager bills in Rentvine_`
  ].join('\n');
}

/**
 * MANAGEMENT FEE TRACKER
 * Are we collecting what we should be?
 * Expected = active properties × $89. Actual = sum of Management Fees billed this month.
 */
async function buildMgmtFeeTracker() {
  const [activeCount, items] = await Promise.all([
    fetchActivePropertyCount(),
    fetchMgmtBills(startOfMonth(0), today()),
  ]);

  const mgmtFeeItems = items.filter(i =>
    i.description.toLowerCase().includes('management fee') ||
    i.description.toLowerCase().includes('management fees')
  );

  const collected = mgmtFeeItems.reduce((s, i) => s + i.amount, 0);
  const expected = activeCount * MGMT_FEE_MONTHLY;
  const gap = expected - collected;
  const collectPct = expected > 0 ? ((collected / expected) * 100).toFixed(1) : '0';
  const dayPct = daysIntoMonth() / daysInMonth();

  // On-track assessment: collected should be roughly proportional to days elapsed
  const expectedSoFar = expected * dayPct;
  const onTrack = collected >= expectedSoFar * 0.85; // 15% tolerance
  const statusEmoji = onTrack ? '✅' : '⚠️';
  const statusLabel = onTrack ? 'On track' : 'Behind pace';

  // Count of unique properties billed
  const billedCount = new Set(mgmtFeeItems.map(i => i.description)).size; // approximation

  return [
    `🏦 *Management Fee Tracker — ${monthLabel(0)}*\n`,
    `*Active Properties:* ${activeCount}`,
    `*Expected (${activeCount} × $${MGMT_FEE_MONTHLY}):* $${expected.toLocaleString()}`,
    `*Collected to date:* $${collected.toFixed(2)} _(${collectPct}% of expected)_`,
    `*Gap remaining:* $${gap.toFixed(2)}\n`,
    `${statusEmoji} *${statusLabel}* — ${daysIntoMonth()} days in, ${Math.round(dayPct * 100)}% of month elapsed`,
    gap > 0
      ? `_$${gap.toFixed(2)} in management fees not yet billed this month — normal if settlements haven't all run yet_`
      : `_All management fees appear collected_ 🎉`,
    `\n_Source: Rentvine manager bills + active property count_`
  ].join('\n');
}

/**
 * CASH FLOW SUMMARY
 * Money in (rent collected + owner contributions) vs money out (owner payouts + bills).
 */
async function buildCashFlow() {
  const [
    rentIn,
    ownerIn,
    ownerOut,
    mgmtIncome,
  ] = await Promise.all([
    fetchLeasePayments(startOfMonth(0), today()),
    fetchOwnerContributions(startOfMonth(0), today()),
    fetchOwnerPayouts(startOfMonth(0), today()),
    fetchMgmtBills(startOfMonth(0), today()),
  ]);

  const mgmtTotal = mgmtIncome.reduce((s, i) => s + i.amount, 0);
  const totalIn = rentIn + ownerIn;
  const totalOut = ownerOut; // bills to vendors excluded — that's owner money, not ours
  const netFlow = totalIn - totalOut;

  // Separate Aloe PM's income from trust activity
  const aloeNet = mgmtTotal; // what Aloe actually earned this month

  return [
    `💵 *Cash Flow — ${monthLabel(0)} (Month to Date)*\n`,
    `*TRUST ACCOUNT ACTIVITY*`,
    `  📥 Rent collected from tenants:  $${rentIn.toLocaleString('en-US', {minimumFractionDigits:2})}`,
    `  📥 Owner contributions in:       $${ownerIn.toLocaleString('en-US', {minimumFractionDigits:2})}`,
    `  📤 Owner distributions out:      $${ownerOut.toLocaleString('en-US', {minimumFractionDigits:2})}`,
    `  ──────────────────────────────────`,
    `  *Net trust flow:*                $${netFlow.toLocaleString('en-US', {minimumFractionDigits:2})} ${netFlow >= 0 ? '✅' : '⚠️'}\n`,
    `*ALOE PM INCOME (what we earned)*`,
    `  💰 Management fees & charges:    $${aloeNet.toLocaleString('en-US', {minimumFractionDigits:2})}`,
    `\n_Source: Rentvine transactions + manager bills_`
  ].join('\n');
}

// ─── GL category helper (same as Jay, kept in sync) ──────────────────────────
const GL_CATEGORIES = [
  { key: 'management fee',           label: 'Management Fees'             },
  { key: 'resident benefit package', label: 'Resident Benefit Package'    },
  { key: 'sn-resident benefit',      label: 'SN-Resident Benefit Package' },
  { key: 'administrative fee',       label: 'Administrative Fees'         },
  { key: 'admin fee',                label: 'Administrative Fees'         },
  { key: 'late fee',                 label: 'Late Fees'                   },
  { key: 'lease break',              label: 'Lease Break Fees'            },
  { key: 'lease fee',                label: 'Lease/Placement Fees'        },
  { key: 'placement fee',            label: 'Lease/Placement Fees'        },
  { key: 'five day notice',          label: 'Five Day Notice Fees'        },
  { key: 'onboarding fee',           label: 'Onboarding Fees'             },
  { key: 'renewal fee',              label: 'Renewal Fees'                },
  { key: 'inspection',               label: 'Inspection Fees'             },
  { key: 'pet fee',                  label: 'Pet Fees'                    },
  { key: 'cleaning',                 label: 'Cleaning'                    },
  { key: 'transaction fee',          label: 'Transaction Fees'            },
];

function categorize(description) {
  const lower = (description || '').toLowerCase();
  for (const cat of GL_CATEGORIES) {
    if (lower.includes(cat.key)) return cat.label;
  }
  return 'Other / Miscellaneous';
}

// ─── Intent detection ─────────────────────────────────────────────────────────
function detectIntent(text) {
  const lower = text.toLowerCase();

  if (lower.match(/revenue|snapshot|this month|monthly|breakdown|how much.*made|income/))
    return 'revenue';
  if (lower.match(/management fee|mgmt fee|on track|collecting|$89|fee income/))
    return 'mgmtfee';
  if (lower.match(/cash flow|money in|money out|flowing|collected|distributed|paid out|net/))
    return 'cashflow';

  return null;
}

// ─── Slack App ────────────────────────────────────────────────────────────────
const app = new App({
  token: process.env.MAE_BOT_TOKEN,
  appToken: process.env.MAE_APP_TOKEN,
  socketMode: true,
});

app.event('app_mention', async ({ event, say }) => {
  await handleMessage(event.text, say);
});

app.message(async ({ message, say }) => {
  // Only respond in the designated private channel (set MAE_CHANNEL_ID in env)
  const allowedChannel = process.env.MAE_CHANNEL_ID;
  if (allowedChannel && message.channel !== allowedChannel) return;
  if (message.bot_id) return; // ignore other bots

  await handleMessage(message.text || '', say);
});

async function handleMessage(text, say) {
  const intent = detectIntent(text);

  if (!intent) {
    await say(
      `Hi Randi 👋 I'm Mae, your CFO agent. Here's what I can pull for you:\n\n` +
      `• *Revenue snapshot* — _"What's our revenue this month vs last?"_\n` +
      `• *Management fee tracker* — _"Are we on track with management fees?"_\n` +
      `• *Cash flow* — _"What's our cash flow this month?"_`
    );
    return;
  }

  const labels = {
    revenue: '📊 Pulling revenue snapshot...',
    mgmtfee: '🏦 Checking management fee collections...',
    cashflow: '💵 Building cash flow summary...',
  };

  await say(labels[intent]);

  try {
    let report;
    if (intent === 'revenue')  report = await buildRevenueSnapshot();
    if (intent === 'mgmtfee')  report = await buildMgmtFeeTracker();
    if (intent === 'cashflow') report = await buildCashFlow();

    await say(report);
  } catch (err) {
    console.error('Mae error:', err);
    await say(`⚠️ I hit an error pulling that from Rentvine: ${err.message}`);
  }
}

// ─── Start ────────────────────────────────────────────────────────────────────
(async () => {
  await app.start();
  console.log('⚡ Mae (CFO agent) is running');
})();
