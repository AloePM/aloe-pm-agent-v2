/**
 * Jay — Aloe PM Accounting Agent
 * Slack Socket Mode bot that answers questions about management company payments
 * by querying Rentvine bills and grouping line items by GL account category.
 *
 * Deploy: PM2 on aloe-agent-server alongside the other 8 agents
 * Mention: @Jay in any channel, or DM directly
 */

const { App } = require('@slack/bolt');
require('dotenv').config();

// ─── Rentvine config ────────────────────────────────────────────────────────
const RV_BASE = 'https://api.rentvine.com/v2';
const RV_AUTH = 'Basic ODhkMjJjOGM5NmJlNDYyMWJjMGI3YWRlZGIzZWY3NmQ6MDUzMjFmOGNlMDkwNGVlNGFiNGQ3YzJhODMyYjZkMmU=';
const RV_ACCOUNT = 'aloepm';

// Aloe PM contact IDs (payees we care about for management income)
const ALOE_PM_CONTACT_IDS = [1, 3380]; // Contact 1 = Aloe PM, 3380 = Aloe PM-Vendor

// ─── GL account → category mapping ─────────────────────────────────────────
// Maps description keywords to clean category names for the response.
// Order matters — first match wins.
const GL_CATEGORIES = [
  { key: 'management fee',          label: 'Management Fees',              glId: 93  },
  { key: 'resident benefit package',label: 'Resident Benefit Package',     glId: 40  },
  { key: 'sn-resident benefit',     label: 'SN-Resident Benefit Package',  glId: 148 },
  { key: 'administrative fee',      label: 'Administrative Fees',          glId: 58  },
  { key: 'admin fee',               label: 'Administrative Fees',          glId: 58  },
  { key: 'late fee',                label: 'Late Fees',                    glId: 14  },
  { key: 'lease break',             label: 'Lease Break Fees',             glId: 62  },
  { key: 'lease fee',               label: 'Lease/Placement Fees',         glId: 94  },
  { key: 'placement fee',           label: 'Lease/Placement Fees',         glId: 94  },
  { key: 'five day notice',         label: 'Five Day Notice Fees',         glId: 57  },
  { key: 'onboarding fee',          label: 'Onboarding Fees',              glId: 94  },
  { key: 'renewal fee',             label: 'Renewal Fees',                 glId: 43  },
  { key: 'inspection',              label: 'Inspection Fees',              glId: 58  },
  { key: 'pet fee',                 label: 'Pet Fees',                     glId: 51  },
  { key: 'cleaning',                label: 'Cleaning',                     glId: 82  },
  { key: 'transaction fee',         label: 'Transaction Fees',             glId: 56  },
];

function categorize(description) {
  const lower = (description || '').toLowerCase();
  for (const cat of GL_CATEGORIES) {
    if (lower.includes(cat.key)) return cat.label;
  }
  return 'Other / Miscellaneous';
}

// ─── Rentvine API helpers ────────────────────────────────────────────────────
async function rvFetch(path, params = {}) {
  const url = new URL(`${RV_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
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

async function getBillDetail(billId) {
  // Fetches a single bill with its line items (charges)
  try {
    const data = await rvFetch(`/bills/${billId}`, { includes: 'charges' });
    return data;
  } catch (e) {
    return null;
  }
}

/**
 * Fetch all Aloe PM manager bills for a date range and return
 * an array of { billId, date, description, amount } line items.
 */
async function fetchAloepmBills(startDate, endDate) {
  const lineItems = [];
  let page = 1;
  const pageSize = 50;

  while (true) {
    const data = await rvFetch('/bills', {
      start_date: startDate,
      end_date: endDate,
      page,
      page_size: pageSize,
    });

    const bills = Array.isArray(data) ? data : (data.data || data.bills || []);
    if (!bills.length) break;

    // Filter to Aloe PM payees only, non-voided
    const aloeBills = bills.filter(b =>
      ALOE_PM_CONTACT_IDS.includes(b.contactID || b.contact_id) &&
      !b.isVoided && !b.voided
    );

    // For each bill, fetch line items
    for (const bill of aloeBills) {
      const detail = await getBillDetail(bill.billID || bill.id);
      if (!detail) continue;

      const charges = detail.charges || detail.lineItems || [];
      for (const charge of charges) {
        lineItems.push({
          billId: bill.billID || bill.id,
          date: bill.billDate || bill.date,
          description: charge.description || charge.memo || '',
          amount: parseFloat(charge.amount || charge.total || 0),
        });
      }
    }

    if (bills.length < pageSize) break;
    page++;
  }

  return lineItems;
}

/**
 * Given a target amount and optional date, find the matching settlement
 * and return a grouped breakdown by GL category.
 *
 * Strategy:
 * 1. Look back up to 30 days for Aloe PM bills
 * 2. Find a date where the sum of all Aloe PM bill line items ≈ targetAmount
 * 3. Group line items on that date by category and sum
 */
async function resolvePayment(targetAmount, hintDate = null) {
  const tolerance = 0.02; // cents rounding tolerance

  // Build date range to search
  const end = hintDate ? new Date(hintDate) : new Date();
  const start = new Date(end);
  start.setDate(start.getDate() - 30);

  const fmt = d => d.toISOString().split('T')[0];
  const lineItems = await fetchAloepmBills(fmt(start), fmt(end));

  if (!lineItems.length) return null;

  // Group line items by date
  const byDate = {};
  for (const item of lineItems) {
    const d = (item.date || '').split('T')[0];
    if (!byDate[d]) byDate[d] = [];
    byDate[d].push(item);
  }

  // Find date(s) where total ≈ targetAmount
  const matches = [];
  for (const [date, items] of Object.entries(byDate)) {
    const total = items.reduce((s, i) => s + i.amount, 0);
    if (Math.abs(total - targetAmount) <= tolerance) {
      matches.push({ date, items, total });
    }
  }

  if (!matches.length) return null;

  // If multiple matches, pick most recent
  matches.sort((a, b) => b.date.localeCompare(a.date));
  const best = matches[0];

  // Group by category
  const grouped = {};
  for (const item of best.items) {
    const cat = categorize(item.description);
    if (!grouped[cat]) grouped[cat] = 0;
    grouped[cat] += item.amount;
  }

  return {
    date: best.date,
    total: best.total,
    breakdown: grouped,
    itemCount: best.items.length,
  };
}

// ─── Parse user message for amount and optional date ────────────────────────
function parseQuery(text) {
  // Extract dollar amount: $818.70 or 818.70
  const amountMatch = text.match(/\$?([\d,]+\.?\d{0,2})/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '')) : null;

  // Extract date hints: 6/24, June 24, 6/24/2026, yesterday, etc.
  let date = null;
  const datePatterns = [
    /(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/,              // 6/24 or 6/24/2026
    /(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\w*\s+(\d{1,2})(?:,?\s*(\d{4}))?/i, // June 24
  ];

  for (const pat of datePatterns) {
    const m = text.match(pat);
    if (m) {
      const now = new Date();
      if (pat.source.startsWith('(\\d')) {
        // numeric date
        const month = parseInt(m[1]) - 1;
        const day = parseInt(m[2]);
        const year = m[3] ? parseInt(m[3]) : now.getFullYear();
        date = new Date(year, month, day).toISOString().split('T')[0];
      } else {
        // named month
        const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
        const month = months.indexOf(m[1].slice(0,3).toLowerCase());
        const day = parseInt(m[2]);
        const year = m[3] ? parseInt(m[3]) : now.getFullYear();
        date = new Date(year, month, day).toISOString().split('T')[0];
      }
      break;
    }
  }

  if (text.toLowerCase().includes('yesterday')) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    date = d.toISOString().split('T')[0];
  }

  return { amount, date };
}

// ─── Format the breakdown response ──────────────────────────────────────────
function formatBreakdown(result) {
  const lines = [];
  const sorted = Object.entries(result.breakdown).sort((a, b) => b[1] - a[1]);

  for (const [category, amount] of sorted) {
    lines.push(`• *${category}:* $${amount.toFixed(2)}`);
  }

  return [
    `💰 *Payment Breakdown — ${result.date}*`,
    `Total: *$${result.total.toFixed(2)}* across ${result.itemCount} line items\n`,
    ...lines,
    `\n_Grouped from individual Aloe PM manager bills in Rentvine_`
  ].join('\n');
}

// ─── Slack App ───────────────────────────────────────────────────────────────
const app = new App({
  token: process.env.JAY_BOT_TOKEN,
  appToken: process.env.JAY_APP_TOKEN,
  socketMode: true,
});

// Handle @Jay mentions
app.event('app_mention', async ({ event, say }) => {
  await handleMessage(event.text, say);
});

// Handle DMs
app.message(async ({ message, say }) => {
  if (message.channel_type === 'im') {
    await handleMessage(message.text, say);
  }
});

async function handleMessage(text, say) {
  const { amount, date } = parseQuery(text || '');

  // If no dollar amount found, show help
  if (!amount) {
    await say(
      `Hi, I'm Jay 🧾 — your Aloe PM accounting agent.\n\n` +
      `Ask me things like:\n` +
      `• _"What does the $818.70 payment consist of?"_\n` +
      `• _"Break down the $1,240 check from 6/20"_\n` +
      `• _"What was in yesterday's $950 payment?"_\n\n` +
      `I'll look up the matching Aloe PM settlement in Rentvine and break it down by GL category.`
    );
    return;
  }

  await say(`🔍 Looking up $${amount.toFixed(2)} in Rentvine${date ? ` around ${date}` : ' (checking last 30 days)'}...`);

  try {
    const result = await resolvePayment(amount, date);

    if (!result) {
      await say(
        `❌ I couldn't find an Aloe PM payment totaling *$${amount.toFixed(2)}*${date ? ` on or before ${date}` : ' in the last 30 days'}.\n\n` +
        `A few things to check:\n` +
        `• The amount might span multiple settlement runs\n` +
        `• Try including a date: _"the $${amount.toFixed(2)} from 6/24"_\n` +
        `• The payment may predate my 30-day lookback window`
      );
      return;
    }

    await say(formatBreakdown(result));
  } catch (err) {
    console.error('Jay error:', err);
    await say(`⚠️ Something went wrong querying Rentvine: ${err.message}`);
  }
}

// ─── Start ───────────────────────────────────────────────────────────────────
(async () => {
  await app.start();
  console.log('⚡ Jay (accounting agent) is running');
})();
