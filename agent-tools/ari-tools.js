// ── Ari-specific tools and handlers ──────────────────────────────────────
const { hubRequest } = require('./hub-client');

const ARI_TOOLS = [
  { name: 'aptly_search_cards', description: 'Search Aptly work order cards. When a WO number is provided (e.g. 107454), ALWAYS search by WO number first — it returns a unique match. Only search by address if no WO number is given.', input_schema: { type: 'object', properties: { query: { type: 'string' }, stage: { type: 'string' }, limit: { type: 'string' } }, required: [] } },
  { name: 'aptly_get_card', description: 'Get full details of a work order card. Use the alphanumeric id from search results, never the WO number.', input_schema: { type: 'object', properties: { card_id: { type: 'string' } }, required: ['card_id'] } },
  { name: 'aptly_get_comments', description: 'Get all comments on a work order card.', input_schema: { type: 'object', properties: { card_id: { type: 'string' } }, required: ['card_id'] } },
  { name: 'aptly_update_card', description: 'Update a field on a work order card.', input_schema: { type: 'object', properties: { card_id: { type: 'string' }, field_name: { type: 'string' }, value: {} }, required: ['card_id','field_name','value'] } },
  { name: 'rv_dispatch_vendor', description: 'Look up a vendor in Rentvine by name AND assign them to a work order in one step. Pass vendor name and the card rentvineId. This is the ONLY tool needed to assign a vendor - it handles search and assignment automatically.', input_schema: { type: 'object', properties: { vendor_name: { type: 'string', description: 'Vendor name to search for in Rentvine' }, rv_wo_id: { type: 'string', description: 'Rentvine work order ID from aptly_get_card rentvineId field' }, send_notification: { type: 'boolean', description: 'Send notification to vendor (default true)' } }, required: ['vendor_name','rv_wo_id'] } },
  { name: 'get_vendor_for_trade', description: 'Get the right vendor for a trade and location from the Aloe vendor directory. Always use this BEFORE rv_dispatch_vendor to find the correct vendor for the job. Pass the trade (e.g. HVAC, Plumbing, Garage Doors, Cleaning, Handyman, Roofing, Landscaping, Appliances) and the city/zone (e.g. Maricopa, Chandler, Gilbert, Scottsdale, Mesa, Phoenix). Returns the recommended vendor name, phone, and any important notes.', input_schema: { type: 'object', properties: { trade: { type: 'string', description: 'Trade category e.g. HVAC, Plumbing, Garage Doors, Cleaning, Handyman, Roofing, Landscaping, Appliances, Pest Control, Electrical' }, zone: { type: 'string', description: 'City or zone e.g. Maricopa, Chandler, Gilbert, Scottsdale, Mesa, Phoenix, East Valley' } }, required: ['trade'] } },
  { name: 'rv_search_vendor', description: 'Look up a vendor in Rentvine by name to get their Rentvine contact ID for assigning to work orders.', input_schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } },
  { name: 'aptly_add_comment', description: 'Add a comment to a work order card.', input_schema: { type: 'object', properties: { card_id: { type: 'string' }, content: { type: 'string' } }, required: ['card_id','content'] } },
  { name: 'aptly_create_work_order', description: 'Create a new work order card in Aptly. Create immediately when staff gives a clear address, stage, and description. Stage rules: Open=notifies tenant+owner; Internal Work Order Request=no notifications (cleaning, carpet, mailbox, mold); Unit Turn=vacant large project; Estimating=quotes only.', input_schema: { type: 'object', properties: { description: { type: 'string' }, address: { type: 'string' }, stage: { type: 'string' }, priority: { type: 'string', enum: ['Low','Med','High'] }, unitId: { type: 'string' }, locationId: { type: 'string' }, portfolioId: { type: 'string' }, isSharedWithTenant: { type: 'boolean' }, isSharedWithOwner: { type: 'boolean' } }, required: ['description'] } },
  { name: 'aptly_get_vendor_contact', description: 'Look up a vendor contact in Aptly by name to get their phone number and email.', input_schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] } },
  { name: 'send_sms', description: 'Send an SMS to a tenant, owner, or vendor from the Aloe main number (602-854-9884). Include card_id to log as Aptly comment.', input_schema: { type: 'object', properties: { to: { type: 'string' }, message: { type: 'string' }, recipient_type: { type: 'string', enum: ['tenant','owner','vendor'] }, card_id: { type: 'string' } }, required: ['to','message'] } },
  { name: 'rv_search_property', description: 'Search for a property in Rentvine by address.', input_schema: { type: 'object', properties: { address: { type: 'string' } }, required: ['address'] } },
  { name: 'rv_get_property_units', description: 'Get all units for a property by property ID.', input_schema: { type: 'object', properties: { property_id: { type: 'string' } }, required: ['property_id'] } },
  { name: 'rv_get_notes', description: 'Get notes on a Rentvine work order by WO number.', input_schema: { type: 'object', properties: { wo_number: { type: 'string' } }, required: ['wo_number'] } },
  { name: 'rv_get_lease_tenants', description: 'Get tenant contact info for a lease from Rentvine.', input_schema: { type: 'object', properties: { lease_id: { type: 'string' } }, required: ['lease_id'] } },
];

async function executeAriTool(toolName, input) {
  try {
    switch(toolName) {
      case 'aptly_search_cards': {
        const APTLY_TOK = 'oSWZZYDMlRZjUmnp6qb4yCr3EW3yKRO9Atns2VCANso=';
        const q = input.query || '';
        const stage = input.stage || '';
        const limit = parseInt(input.limit || '20');
        // If query looks like a WO number, search Aptly by name directly
        if (/^\d{5,6}$/.test(q.trim())) {
          // Search all pages for WO number in name
          for (let pg = 0; pg < 20; pg++) {
            const rp = await fetch(`https://core-api.getaptly.com/api/board/workOrder?page=${pg}&pageSize=100`, {
              headers: { 'x-token': APTLY_TOK }
            });
            const dp = await rp.json();
            const cp = Array.isArray(dp) ? dp : (dp.data || []);
            if (!cp.length) break;
            const match = cp.find(c => (c.name||'').startsWith(q.trim()));
            if (match) return { items: [{ id: match._id, title: match.name||'', stage: match.stage||'', priority: match.priority||'', address: match.unit?.[0]?.name||match.location?.[0]?.name||'', description: match.description||'' }] };
            if (cp.length < 100) break;
          }
          return { items: [] };
        }
        // Search by name (WO number + address in title)
        const r = await fetch(`https://core-api.getaptly.com/api/board/workOrder?page=0&pageSize=100&search=${encodeURIComponent(q)}`, {
          headers: { 'x-token': APTLY_TOK }
        });
        const data = await r.json();
        let cards = Array.isArray(data) ? data : (data.data || []);
        // Filter by query in name and stage
        cards = cards.filter(c => {
          const nameMatch = !q || (c.name||'').toLowerCase().includes(q.toLowerCase());
          const stageMatch = !stage || c.stage === stage;
          return nameMatch && stageMatch;
        });
        const items = cards.slice(0, limit).map(c => ({
          id: c._id, title: c.name||'', stage: c.stage||'', priority: c.priority||'',
          address: c.unit?.[0]?.name || c.location?.[0]?.name || '',
          description: c.description || ''
        }));
        return { items };
      }
      case 'aptly_get_card': {
        const res = await hubRequest('GET', `/api/aptly/cards/${input.card_id}`);
        return res.status === 200 ? res.body : { error: `Hub ${res.status}` };
      }
      case 'aptly_get_comments': {
        const res = await hubRequest('GET', `/api/aptly/cards/${input.card_id}/comments`);
        return res.status === 200 ? res.body : { error: `Hub ${res.status}` };
      }
      case 'aptly_update_card': {
        const fieldMap = {
          'issue type': 'nfEujqs3ujMNgMFom',
          'maintenance category': 'nfEujqs3ujMNgMFom',
          'home warranty': '3PvcEJoFBQLnjHnd6',
          'reassigned vendor': '39gNjdkmpFpoPLzth',
          'mirror maintenance notes': 'F26dyKdxBuz56YTPA',
          'mirror maintenance limit amount': 'vL9npBewrXTyxrn8c',
          'maintenance limit': 'vL9npBewrXTyxrn8c',
          'stage': 'stage',
          'priority': 'priority',
          'vendor': 'vendor',
        };
        const fieldKey = fieldMap[input.field_name.toLowerCase()] || input.field_name;
        // Call Aptly directly with correct body format
        const APTLY_TOK = 'oSWZZYDMlRZjUmnp6qb4yCr3EW3yKRO9Atns2VCANso=';
        const body = { _id: input.card_id };
        body[fieldKey] = input.value;
        const r = await fetch('https://core-api.getaptly.com/api/board/workOrder', {
          method: 'POST',
          headers: { 'x-token': APTLY_TOK, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await r.json();
        return r.ok ? { success: true } : { error: 'Aptly error', detail: data };
      }
      case 'aptly_dispatch_vendor': {
        // Look up vendor ID if not provided
        let vendorId = input.vendor_id;
        if (!vendorId && (input.vendor_name || input.vendor_phone)) {
          const searchParam = input.vendor_name ?
            `name=${encodeURIComponent(input.vendor_name)}` :
            `phone=${encodeURIComponent(input.vendor_phone)}`;
          const lookup = await hubRequest('GET', `/api/aptly/vendor-search?${searchParam}`);
          if (lookup.status === 200 && lookup.body.contacts?.length) {
            vendorId = lookup.body.contacts[0]._id;
          }
        }
        if (!vendorId) return { error: 'Vendor not found in Aptly contacts' };
        // Call Aptly directly with vendor ID
        const APTLY_TOK = 'oSWZZYDMlRZjUmnp6qb4yCr3EW3yKRO9Atns2VCANso=';
        // Get vendor name for full object
        let vendorName = input.vendor_name || '';
        // Duogram = first letter of first two words
        const words = vendorName.trim().split(/\s+/);
        let vendorDuogram = (words.length >= 2 ? words[0][0] + words[1][0] : vendorName.slice(0,2)).toUpperCase();
        const body = {
          _id: input.card_id,
          vendor: [{ _id: vendorId, name: vendorName, duogram: vendorDuogram }],
          vendorContacts: [{ _id: vendorId, name: vendorName, duogram: vendorDuogram }],
          '3PvcEJoFBQLnjHnd6': input.home_warranty || 'No',
        };
        if (input.is_reassign) body['39gNjdkmpFpoPLzth'] = true;
        const r = await fetch('https://core-api.getaptly.com/api/board/workOrder', {
          method: 'POST',
          headers: { 'x-token': APTLY_TOK, 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const data = await r.json();
        return r.ok ? { success: true, vendorId } : { error: 'Aptly error', detail: data };
      }
      case 'aptly_add_comment': {
        const res = await hubRequest('POST', `/api/aptly/cards/${input.card_id}/comment`, { content: input.content });
        return res.status === 200 || res.status === 201 ? { success: true } : { error: `Hub ${res.status}` };
      }
      case 'aptly_create_work_order': {
        // Auto-lookup Aptly IDs from address
        let unitId = input.unitId, unitName = input.unitName, unitDuogram = input.unitDuogram;
        let locationId = input.locationId, locationName = input.locationName, locationDuogram = input.locationDuogram;
        let portfolioId = input.portfolioId, portfolioName = input.portfolioName, portfolioDuogram = input.portfolioDuogram;
        let owners = input.owners || [];
        if (input.address) {
          const lookupRes = await hubRequest('GET', `/api/aptly/aptlet-lookup?q=${encodeURIComponent(input.address)}`);
          if (lookupRes.status === 200 && lookupRes.body.unit_aptly_id) {
            unitId = lookupRes.body.unit_aptly_id;
            unitName = lookupRes.body.unit_aptly_name;
            unitDuogram = lookupRes.body.unit_aptly_duogram;
            locationId = lookupRes.body.building_aptly_id;
            locationName = lookupRes.body.building_aptly_name;
            locationDuogram = lookupRes.body.building_aptly_duogram;
            portfolioId = lookupRes.body.portfolio_aptly_id;
            portfolioName = lookupRes.body.portfolio_aptly_name;
            portfolioDuogram = lookupRes.body.portfolio_aptly_duogram;
            owners = lookupRes.body.owners || [];
          }
        }
        const res = await hubRequest('POST', '/api/ari/create-work-order', {
          description: input.description,
          stage: input.stage || 'Internal Work Order Request',
          priority: input.priority || 'Med',
          isSharedWithTenant: input.isSharedWithTenant || false,
          isSharedWithOwner: input.isSharedWithOwner || false,
          unitId, unitName, unitDuogram,
          locationId, locationName, locationDuogram,
          portfolioId, portfolioName, portfolioDuogram,
          ownerContacts: owners,
        });
        if (res.status !== 200 && res.status !== 201) return { error: `Hub ${res.status}`, detail: res.body };
        return { success: true, cardId: res.body.cardId || res.body._id, message: 'Work order created in Aptly. Rentvine will sync within a few minutes.' };
      }
      case 'aptly_get_vendor_contact': {
        const res = await hubRequest('GET', `/api/aptly/vendor-search?name=${encodeURIComponent(input.name)}`);
        return res.status === 200 ? res.body : { error: `Hub ${res.status}` };
      }
      case 'send_sms': {
        const res = await hubRequest('POST', '/api/quo/send-sms', { to: input.to, message: input.message });
        if (res.status !== 200 && res.status !== 201) return { error: `Hub ${res.status}`, detail: res.body };
        if (input.card_id) {
          const comment = `📱 SMS sent to ${input.recipient_type || 'contact'} (${input.to}):\n${input.message}`;
          await hubRequest('POST', `/api/aptly/cards/${input.card_id}/comment`, { content: comment });
        }
        return { success: true, to: input.to, message: input.message };
      }
      case 'rv_dispatch_vendor': {
        const RV_AUTH = Buffer.from('2586bdded08f499bb2057e373fd662f7:81f3aa4cb0434162aab8a27702f089b8').toString('base64');
        // Step 1: Find vendor by name
        const sr = await fetch(`https://aloepm.rentvine.com/api/manager/contacts?contactType=vendor&search=${encodeURIComponent(input.vendor_name)}&pageSize=10`, {
          headers: { 'Authorization': `Basic ${RV_AUTH}`, 'X-Rentvine-Account': 'aloepm' }
        });
        const sd = await sr.json();
        const items = Array.isArray(sd) ? sd : (sd.data||[]);
        if (!items.length) return { error: `Vendor not found in Rentvine: ${input.vendor_name}` };
        const vendorContactID = items[0].contact?.contactID;
        const vendorName = items[0].contact?.name || input.vendor_name;
        // Step 2: Assign vendor to WO
        const ar = await fetch(`https://aloepm.rentvine.com/api/manager/maintenance/work-orders/${input.rv_wo_id}`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${RV_AUTH}`, 'X-Rentvine-Account': 'aloepm', 'Content-Type': 'application/json' },
          body: JSON.stringify({ vendorContactID: String(vendorContactID), sendVendorNotification: input.send_notification !== false })
        });
        const ad = await ar.json();
        return ar.ok ? { success: true, vendorName, vendorContactID } : { error: 'RV assign error', detail: ad };
      }
      case 'get_vendor_for_trade': {
        const r = await hubRequest('GET', '/api/vendors');
        if (r.status !== 200) return { error: 'Could not load vendor directory' };
        const trades = r.body.trades || [];
        const tradeLower = (input.trade || '').toLowerCase();
        const zoneLower = (input.zone || '').toLowerCase();
        // Find matching trade
        const trade = trades.find(t => (t.name||'').toLowerCase().includes(tradeLower) || tradeLower.includes((t.name||'').toLowerCase()));
        if (!trade) return { error: `No trade found for: ${input.trade}`, availableTrades: trades.map(t=>t.name).filter(Boolean) };
        const vendors = trade.vendors || [];
        // Filter by zone if provided
        let matched = vendors;
        if (zoneLower) {
          matched = vendors.filter(v => {
            const zones = (v.zones||[]).map(z=>z.toLowerCase());
            return zones.some(z => z.includes(zoneLower) || zoneLower.includes(z) || z === 'valley-wide');
          });
          if (!matched.length) matched = vendors.filter(v => (v.zones||[]).map(z=>z.toLowerCase()).includes('valley-wide'));
        }
        return { trade: trade.name, zone: input.zone || 'any', vendors: matched.slice(0,3).map(v => ({ name: v.name, phone: v.phone, zones: v.zones, notes: v.notes, priority: v.priority })) };
      }
      case 'rv_search_vendor': {
        const RV_AUTH = Buffer.from('2586bdded08f499bb2057e373fd662f7:81f3aa4cb0434162aab8a27702f089b8').toString('base64');
        const r = await fetch(`https://aloepm.rentvine.com/api/manager/contacts?contactType=vendor&search=${encodeURIComponent(input.name)}&pageSize=10`, {
          headers: { 'Authorization': `Basic ${RV_AUTH}`, 'X-Rentvine-Account': 'aloepm' }
        });
        const d = await r.json();
        const items = Array.isArray(d) ? d : (d.data||[]);
        const vendors = items.map(i => ({ contactID: i.contact?.contactID, name: i.contact?.name || i.contact?.firstName }));
        return { vendors };
      }
      case 'rv_assign_vendor': {
        const RV_AUTH = Buffer.from('2586bdded08f499bb2057e373fd662f7:81f3aa4cb0434162aab8a27702f089b8').toString('base64');
        const body = { vendorContactID: String(input.vendor_contact_id), sendVendorNotification: input.send_notification !== false };
        const r = await fetch(`https://aloepm.rentvine.com/api/manager/maintenance/work-orders/${input.rv_wo_id}`, {
          method: 'POST',
          headers: { 'Authorization': `Basic ${RV_AUTH}`, 'X-Rentvine-Account': 'aloepm', 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        const d = await r.json();
        return r.ok ? { success: true } : { error: 'RV error', detail: d };
      }
      case 'rv_search_property': {
        const res = await hubRequest('GET', `/api/rentvine/property-lookup?q=${encodeURIComponent(input.address)}`);
        return res.status === 200 ? res.body : { error: `Hub ${res.status}` };
      }
      case 'rv_get_property_units': {
        const res = await hubRequest('GET', `/api/rentvine/properties/${input.property_id}/units`);
        return res.status === 200 ? res.body : { error: `Hub ${res.status}` };
      }
      case 'rv_get_notes': {
        const res = await hubRequest('GET', `/api/rentvine/work-orders/${input.wo_number}/notes`);
        return res.status === 200 ? res.body : { error: `Hub ${res.status}` };
      }
      case 'rv_get_lease_tenants': {
        const res = await hubRequest('GET', `/api/rentvine/leases/${input.lease_id}/tenants`);
        return res.status === 200 ? res.body : { error: `Hub ${res.status}` };
      }
      default: return { error: `Unknown Ari tool: ${toolName}` };
    }
  } catch(e) { return { error: e.message }; }
}

module.exports = { ARI_TOOLS, executeAriTool };
