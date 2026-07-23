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
  },
  {
    name: 'aptly_create_hoa_card',
    description: 'Create a new HOA Violation card in Aptly on the HOA Violations board, with owner and resident contacts auto-linked from the building record. Never leave owner_tenant_responsible or violation_issue blank.',
    input_schema: { type: 'object', properties: { title: { type: 'string', description: 'Address – HOA Warning/Violation: [issue]' }, unit_aptly_id: { type: 'string' }, unit_aptly_name: { type: 'string' }, building_aptly_id: { type: 'string' }, building_aptly_name: { type: 'string' }, due_date: { type: 'string' }, violation_issue: { type: 'string' }, warning_or_fine: { type: 'string', enum: ['Warning', 'Fine'] }, fine_amount: { type: 'number' }, owner_tenant_responsible: { type: 'string', enum: ['Owner', 'Tenant'] }, violation_exact_wording: { type: 'string' }, mirror_hoa_name: { type: 'string' }, mirror_hoa_number: { type: 'string' }, mirror_hoa_email: { type: 'string' }, mirror_hoa_website: { type: 'string' }, tenant_phone_1: { type: 'string' }, tenant_phone_2: { type: 'string' } }, required: ['title', 'violation_issue', 'warning_or_fine', 'owner_tenant_responsible'] }
  },
  {
    name: 'aptly_search_cards',
    description: 'Search HOA Violation cards in Aptly by address or tenant name.',
    input_schema: { type: 'object', properties: { query: { type: 'string' }, stage: { type: 'string' }, limit: { type: 'string' } }, required: [] }
  },
  {
    name: 'aptly_get_card',
    description: 'Get full details of an HOA Violation card by ID.',
    input_schema: { type: 'object', properties: { card_id: { type: 'string' } }, required: ['card_id'] }
  },
  {
    name: 'aptly_update_card',
    description: 'Update a field on an HOA Violation card (e.g. Violation Issue, Warning or Fine, Owner/Tenant Responsible, Resolved?, Stage).',
    input_schema: { type: 'object', properties: { card_id: { type: 'string' }, field_name: { type: 'string' }, value: {} }, required: ['card_id','field_name','value'] }
  },
  {
    name: 'aptly_add_comment',
    description: 'Add a comment to an HOA Violation card.',
    input_schema: { type: 'object', properties: { card_id: { type: 'string' }, content: { type: 'string' } }, required: ['card_id','content'] }
  },
  {
    name: 'rv_get_lease_balance',
    description: 'Get the outstanding balance due on a Rentvine lease.',
    input_schema: { type: 'object', properties: { lease_id: { type: 'string' } }, required: ['lease_id'] }
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
      case 'aptly_create_hoa_card': {
        const cardBody = {
          name: input.title || '',
          description: input.violation_exact_wording || '',
          stage: 'HOA Violation/Notice received',
          createdAt: new Date().toISOString(),
          stageUpdatedAt: new Date().toISOString(),
          'Sz5KNfAAMDuThngyG': input.violation_issue || '',
          'cPZmmmjQwYJriT53Y': input.warning_or_fine || '',
          'iyZj4A2TfKiHRtF7i': input.owner_tenant_responsible || '',
          'dueAt': input.due_date || null,
          'nMmfRWZyAFDFNW4mo': input.tenant_phone_1 || '',
          'iSifhPDzhrNrMAZXx': input.tenant_phone_2 || '',
          'BvfLpebk484dEsd4Y': input.mirror_hoa_name || '',
          'T3tGDpxosQnR7u3NA': input.mirror_hoa_number || '',
          '2u8QFWLBDrf6tC9P9': input.mirror_hoa_email || '',
          'dMNaxpq2zPTY9rhaJ': input.mirror_hoa_website || '',
        };
        if (input.fine_amount) cardBody['RevYLWzf8Yv2QtwK9'] = Number(input.fine_amount);
        if (input.unit_aptly_id) cardBody['unit'] = [{ _id: input.unit_aptly_id, name: input.unit_aptly_name || '', duogram: (input.unit_aptly_name||'').replace(/[^A-Z0-9]/g,'').slice(0,2) }];
        if (input.building_aptly_id) {
          cardBody['location'] = [{ _id: input.building_aptly_id, name: input.building_aptly_name || '', duogram: (input.building_aptly_name||'').replace(/[^A-Z0-9]/g,'').slice(0,2) }];
          try {
            const bldRes = await fetch(`https://core-api.getaptly.com/api/board/location/${input.building_aptly_id}`, { headers: { 'x-token': APTLY_TOKEN } });
            const bldData = await bldRes.json();
            const bld = bldData.data || bldData;
            const owners = bld.owners || [];
            const residents = bld.relatedContacts || [];
            const managers = bld.managers || [];
            if (owners.length) cardBody['nxo7y67goRt5L3jah'] = owners;
            if (residents.length) cardBody['xhXRQJ2JfCSDWC43q'] = residents;
            const combined = [...owners, ...residents, ...managers];
            if (combined.length) cardBody['relatedContacts'] = combined;
          } catch(e) { console.error('HOA card building-contact lookup error:', e.message); }
        }
        const r = await fetch('https://core-api.getaptly.com/api/board/8bazEHshdZNuMKCFE', {
          method: 'POST', headers: { 'x-token': APTLY_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(cardBody)
        });
        const result = await r.json();
        if (!r.ok) return { error: `Aptly ${r.status}`, detail: result };
        return { success: true, cardId: result.data?._id || result.cardId || result._id };
      }
      case 'aptly_search_cards': {
        const q = input.query || '';
        const stage = input.stage || '';
        const limit = parseInt(input.limit || '20');
        const r = await fetch(`https://core-api.getaptly.com/api/board/8bazEHshdZNuMKCFE?page=0&pageSize=100&search=${encodeURIComponent(q)}`, { headers: { 'x-token': APTLY_TOKEN } });
        const data = await r.json();
        let cards = Array.isArray(data) ? data : (data.data || []);
        cards = cards.filter(c => {
          const nameMatch = !q || (c.name||'').toLowerCase().includes(q.toLowerCase());
          const stageMatch = !stage || c.stage === stage;
          return nameMatch && stageMatch;
        });
        return { items: cards.slice(0, limit).map(c => ({ id: c._id, title: c.name||'', stage: c.stage||'', address: c.unit?.[0]?.name || c.location?.[0]?.name || '', description: c.description || '' })) };
      }
      case 'aptly_get_card': {
        const r = await fetch(`https://core-api.getaptly.com/api/board/8bazEHshdZNuMKCFE/${input.card_id}`, { headers: { 'x-token': APTLY_TOKEN } });
        const data = await r.json();
        const c = data.data || data;
        if (!r.ok) return { error: `Aptly ${r.status}` };
        return {
          id: c.cardId, title: c.name, stage: c.stage,
          violationIssue: c['Sz5KNfAAMDuThngyG'] || '',
          warningOrFine: c['cPZmmmjQwYJriT53Y'] || '',
          ownerTenantResponsible: c['iyZj4A2TfKiHRtF7i'] || '',
          resolved: c['77xEQBRT6FRGT58wZ'] || '',
          address: c.unit?.[0]?.name || c.location?.[0]?.name || '',
        };
      }
      case 'aptly_update_card': {
        const fieldMap = {
          'violation issue': 'Sz5KNfAAMDuThngyG',
          'warning or fine': 'cPZmmmjQwYJriT53Y',
          'owner/tenant responsible': 'iyZj4A2TfKiHRtF7i',
          'owner tenant responsible': 'iyZj4A2TfKiHRtF7i',
          'resolved': '77xEQBRT6FRGT58wZ',
          'resolved?': '77xEQBRT6FRGT58wZ',
          'stage': 'stage',
        };
        const fieldKey = fieldMap[input.field_name.toLowerCase()] || input.field_name;
        const body = { _id: input.card_id };
        body[fieldKey] = input.value;
        const r = await fetch('https://core-api.getaptly.com/api/board/8bazEHshdZNuMKCFE', { method: 'POST', headers: { 'x-token': APTLY_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await r.json();
        return r.ok ? { success: true } : { error: 'Aptly error', detail: data };
      }
      case 'aptly_add_comment': {
        const r = await fetch(`https://core-api.getaptly.com/api/board/8bazEHshdZNuMKCFE/${input.card_id}/comment`, { method: 'POST', headers: { 'x-token': APTLY_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ content: input.content }) });
        return r.ok ? { success: true } : { error: `Aptly ${r.status}` };
      }
      case 'rv_get_lease_balance': {
        const r = await fetch(`${RENTVINE_BASE}/leases/${input.lease_id}/balance-due`, { headers: { 'Authorization': `Basic ${RENTVINE_AUTH}`, 'X-Rentvine-Account': process.env.RENTVINE_ACCOUNT } });
        const data = await r.json();
        return r.ok ? data : { error: `Rentvine ${r.status}` };
      }
      default: return { error: `Unknown Kat tool: ${toolName}` };
    }
  } catch(e) { return { error: e.message }; }
}
module.exports = { KAT_TOOLS, executeKatTool };
