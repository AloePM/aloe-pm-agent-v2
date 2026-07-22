// ── Kat-specific tools and handlers ──────────────────────────────────────
const { hubRequest } = require('./hub-client');

const RENTVINE_BASE = `https://${process.env.RENTVINE_ACCOUNT}.rentvine.com/api/manager`;
const RENTVINE_AUTH = Buffer.from(`${process.env.RENTVINE_API_KEY}:${process.env.RENTVINE_API_SECRET}`).toString('base64');
const APTLY_TOKEN = process.env.APTLY_TOKEN;

const KAT_TOOLS = [
  {
    name: 'aptly_get_aptlet_ids',
    description: 'Look up Aptly unit and building aptlet IDs for a property using just the house number. Call this before creating an HOA card to enable unit/building auto-linking.',
    input_schema: { type: 'object', properties: { house_number: { type: 'string', description: 'Just the house number, e.g. "4805" from "4805 N 87th Ave"' } }, required: ['house_number'] }
  },
  {
    name: 'rv_search_property',
    description: 'Search for a property in Rentvine by address or house number. Returns propertyID, leaseID, address, city. Always try full address first, then house number only as fallback.',
    input_schema: { type: 'object', properties: { address: { type: 'string', description: 'Property address or house number to search for' } }, required: ['address'] }
  },
  {
    name: 'rv_get_lease',
    description: 'Get lease details for a lease ID including tenant names, move-in date, lease start/end dates, and lease status.',
    input_schema: { type: 'object', properties: { leaseID: { type: 'string', description: 'Rentvine lease ID' } }, required: ['leaseID'] }
  },
  {
    name: 'rv_add_lease_charge',
    description: 'Post a charge to a tenant lease in Rentvine. For HOA admin fee: amount=5, chargeAccountID=58, description="HOA Notice". For HOA violation fine: amount=[fine amount], chargeAccountID=150, description="HOA Violation Fine".',
    input_schema: { type: 'object', properties: { leaseID: { type: 'string', description: 'Rentvine lease ID' }, amount: { type: 'number', description: 'Charge amount' }, chargeAccountID: { type: 'number', description: '58 = HOA Admin Fee ($5), 150 = HOA Violation Fine' }, description: { type: 'string', description: 'Charge description' } }, required: ['leaseID', 'amount', 'chargeAccountID', 'description'] }
  },
  {
    name: 'aptly_search_property',
    description: 'Search for a property in Aptly by address. Use as fallback when rv_search_property returns no results. Returns unit and building IDs.',
    input_schema: { type: 'object', properties: { address: { type: 'string', description: 'Property address to search for' } }, required: ['address'] }
  }
];

async function executeKatTool(toolName, input) {
  try {
    switch(toolName) {
      case 'aptly_get_aptlet_ids': {
        const q = input.house_number;
        try {
          const r = await fetch(`https://core-api.getaptly.com/api/board/unit?page=0&pageSize=100&query=${encodeURIComponent(q)}`, {
            headers: { 'x-token': APTLY_TOKEN }
          });
          const data = await r.json();
          const units = data.data || data.cards || (Array.isArray(data) ? data : []);
          const match = units.find(u => {
            const name = (u.name || '').toLowerCase();
            return name.includes(q.toLowerCase()) || name.startsWith(q.toLowerCase());
          });
          if (match) {
            const loc = (match.location || [])[0] || {};
            const unit = (match.unit || [])[0] || match;
            return {
              unit_aptly_id: unit._id || match._id || null,
              unit_aptly_name: unit.name || match.name || null,
              unit_aptly_duogram: unit.duogram || match.duogram || null,
              building_aptly_id: loc._id || null,
              building_aptly_name: loc.name || null,
              building_aptly_duogram: loc.duogram || null
            };
          }
        } catch(e) { console.error('aptlet-ids direct error:', e.message); }
        const res = await hubRequest('GET', `/api/aptly/aptlet-lookup?q=${encodeURIComponent(input.house_number)}`);
        if (res.status === 200 && res.body.unit_aptly_id) return res.body;
        return { unit_aptly_id: null, building_aptly_id: null };
      }
      case 'rv_search_property': {
        const shortQ = (input.address || '').split(',')[0].replace(/(gilbert|chandler|mesa|phoenix|scottsdale|maricopa|tempe|casa grande|az|arizona)/gi, '').trim().slice(0, 20);
        const res = await hubRequest('GET', `/api/rentvine/property-lookup?q=${encodeURIComponent(shortQ)}`);
        if (res.status === 200 && res.body?.properties?.length) return res.body;
        // Fallback: try house number only
        const houseNum = (input.address || '').match(/^\d+/)?.[0];
        if (houseNum) {
          const res2 = await hubRequest('GET', `/api/rentvine/property-lookup?q=${encodeURIComponent(houseNum)}`);
          if (res2.status === 200 && res2.body?.properties?.length) return res2.body;
        }
        return { error: `Property not found: ${input.address}`, properties: [] };
      }
      case 'rv_get_lease': {
        const r = await fetch(`${RENTVINE_BASE}/leases/${input.leaseID}`, {
          headers: { 'Authorization': `Basic ${RENTVINE_AUTH}`, 'X-Rentvine-Account': process.env.RENTVINE_ACCOUNT }
        });
        const data = await r.json();
        const lease = data.lease || data;
        // Get tenants — first try lease.tenants array (names directly on lease record)
        let tenants = [];
        if (Array.isArray(lease.tenants) && lease.tenants.length) {
          tenants = lease.tenants.filter(Boolean);
        } else {
          // Fallback: call /tenants endpoint
          try {
            const tr = await fetch(`${RENTVINE_BASE}/leases/${input.leaseID}/tenants`, {
              headers: { 'Authorization': `Basic ${RENTVINE_AUTH}`, 'X-Rentvine-Account': process.env.RENTVINE_ACCOUNT }
            });
            const td = await tr.json();
            const arr = Array.isArray(td) ? td : (td.data || []);
            tenants = arr.map(t => t.contact?.name || t.name || t.displayName || '').filter(Boolean);
          } catch(e) {}
        }
        return { leaseID: lease.leaseID, startDate: lease.startDate, endDate: lease.endDate, moveInDate: lease.moveInDate, status: lease.primaryLeaseStatusID, tenants };
      }
      case 'rv_add_lease_charge': {
        const azNow = new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Phoenix' }));
        const datePosted = azNow.toISOString().slice(0, 10);
        const body = {
          chargeAccountID: input.chargeAccountID,
          amount: String(input.amount),
          description: input.description,
          datePosted
        };
        const r = await fetch(`${RENTVINE_BASE}/accounting/leases/${input.leaseID}/charges`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${RENTVINE_AUTH}`, 'X-Rentvine-Account': process.env.RENTVINE_ACCOUNT, 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const result = await r.json();
        if (!r.ok) return { error: `Rentvine ${r.status}`, detail: JSON.stringify(result).slice(0, 200) };
        return { success: true, leaseID: input.leaseID, amount: input.amount, chargeAccountID: input.chargeAccountID, datePosted };
      }
      case 'aptly_search_property': {
        const res = await hubRequest('GET', `/api/aptly/aptlet-lookup?q=${encodeURIComponent(input.address)}`);
        if (res.status === 200 && res.body?.unit_aptly_id) return res.body;
        // Try house number only
        const houseNum = (input.address || '').match(/^\d+/)?.[0];
        if (houseNum) {
          const res2 = await hubRequest('GET', `/api/aptly/aptlet-lookup?q=${encodeURIComponent(houseNum)}`);
          if (res2.status === 200 && res2.body?.unit_aptly_id) return res2.body;
        }
        return { unit_aptly_id: null, building_aptly_id: null };
      }
      default: return { error: `Unknown Kat tool: ${toolName}` };
    }
  } catch(e) { return { error: e.message }; }
}
module.exports = { KAT_TOOLS, executeKatTool };
