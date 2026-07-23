const { APTLY_TOOLS, executeAptlyTool } = require('./aptly-tools');
// ── Ari-specific tools and handlers ──────────────────────────────────────
const { hubRequest } = require('./hub-client');
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

async function rvPropertyLookup(q) {
  try {
    const qLower = (q || '').toLowerCase();
    let allProps = [];
    for (let page = 1; page <= 10; page++) {
      const url = `${RENTVINE_BASE}/properties/export?pageSize=500&page=${page}`;
      const r = await fetch(url, { headers: { Authorization: `Basic ${RENTVINE_AUTH}`, 'X-Rentvine-Account': process.env.RENTVINE_ACCOUNT } });
      const batch = await r.json();
      const items = Array.isArray(batch) ? batch : (batch.data || batch.results || []);
      if (!items.length) break;
      allProps = allProps.concat(items);
      if (items.length < 500) break;
    }
    const stripDirections = s => s.replace(/\b(north|south|east|west|n|s|e|w)\b\.?/gi, '').replace(/\s+/g, ' ').trim();
    const qClean = stripDirections(qLower);
    const filtered = qLower ? allProps.filter(item => {
      const p = item.property || item;
      const addr = stripDirections((p.address || '').toLowerCase());
      const street = stripDirections((p.streetName || '').toLowerCase());
      const num = String(p.streetNumber || '').toLowerCase();
      const queryParts = qClean.split(/\s+/);
      const queryNum = queryParts.find(x => /^\d+$/.test(x)) || '';
      const queryStreet = queryParts.filter(x => !/^\d+$/.test(x)).join(' ');
      const numMatch = !queryNum || num === queryNum;
      const streetMatch = !queryStreet || addr.includes(queryStreet) || street.includes(queryStreet);
      return numMatch && streetMatch;
    }) : allProps;
    const enriched = await Promise.all(filtered.slice(0, 10).map(async item => {
      const p = item.property || item;
      let leaseId = p.leaseID || null;
      if (!leaseId) {
        try {
          const units = await rvFetch('/properties/' + p.propertyID + '/units');
          const unitList = Array.isArray(units) ? units : (units.units || units.data || []);
          if (unitList.length > 0) {
            const u = unitList[0].unit || unitList[0];
            leaseId = u.leaseID || null;
          }
        } catch(e) { /* ignore */ }
      }
      return { propertyId: p.propertyID, leaseId, address: p.address, city: p.city, state: p.stateID, zip: p.postalCode };
    }));
    return { status: 200, body: { properties: enriched } };
  } catch(e) {
    return { status: 500, body: { error: e.message } };
  }
}

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
  { name: 'rv_get_wo_history', description: 'Look up historical work orders for a property from Aloe records going back to 2018. Use this when triaging a new WO to check: has this issue happened before? Who fixed it last time? Is there a home warranty on file? What did it cost? Pass the street address (e.g. "1033 W Pecos Ave"). Optionally filter by trade keyword (e.g. "HVAC", "roof", "plumbing").', input_schema: { type: 'object', properties: { address: { type: 'string', description: 'Street address to search e.g. "1033 W Pecos Ave"' }, trade: { type: 'string', description: 'Optional trade filter e.g. "HVAC", "roof", "plumbing", "appliance"' }, limit: { type: 'number', description: 'Max results to return (default 10)' } }, required: ['address'] } },
  { name: 'rv_get_notes', description: 'Get notes on a Rentvine work order by WO number.', input_schema: { type: 'object', properties: { wo_number: { type: 'string' } }, required: ['wo_number'] } },
  { name: 'rv_get_lease_tenants', description: 'Get tenant contact info (name, phone, email) for a lease from Rentvine so Ari can text or email the tenant.', input_schema: { type: 'object', properties: { lease_id: { type: 'string' } }, required: ['lease_id'] } },
  { name: 'get_owner_contact', description: 'Get the property owner\'s name, phone, and email so Ari can text or email the owner. Requires building_aptly_id (from aptly_get_card\'s work order location field, or aptlet-lookup).', input_schema: { type: 'object', properties: { building_aptly_id: { type: 'string' } }, required: ['building_aptly_id'] } },
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
        const r = await fetch(`https://core-api.getaptly.com/api/board/workOrder/${input.card_id}`, { headers: { 'x-token': APTLY_TOKEN } });
        const data = await r.json();
        const c = data.data || data;
        if (!r.ok) return { error: `Aptly ${r.status}` };
        return {
          id: c.cardId, title: c.name, stage: c.stage, priority: c.priority,
          description: c.description, address: c.address,
          vendor: c.vendor ? c.vendor.map(v => v.name).join(', ') : '',
          woNumber: c.workOrderNumber, rentvineId: c.rentvineId,
          maintenanceCategory: c.maintenanceCategory,
          maintenanceNotes: c['F26dyKdxBuz56YTPA'] || c.maintenanceNotes || '',
          maintenanceLimit: c['vL9npBewrXTyxrn8c'] ? c['vL9npBewrXTyxrn8c'].amount : null,
          homeWarranty: c['3PvcEJoFBQLnjHnd6'] || c.homeWarranty || '',
          issueType: c['nfEujqs3ujMNgMFom'] || '',
          ownerApproved: c.isOwnerApproved, vacant: c.isVacant,
        };
      }
      case 'aptly_get_comments': {
        let foundCard = null;
        for (let page = 0; page <= 100; page++) {
          const r = await fetch(`https://core-api.getaptly.com/api/board/workOrder?page=${page}&pageSize=100&includeArchived=false`, { headers: { 'x-token': APTLY_TOKEN } });
          const data = await r.json();
          const batch = Array.isArray(data) ? data : (data.data || []);
          if (!batch.length) break;
          foundCard = batch.find(c => c.cardId === input.card_id || c._id === input.card_id);
          if (foundCard) break;
          if (batch.length < 100) break;
        }
        if (!foundCard) return { error: 'Card not found' };
        const comments = foundCard.comments || [];
        return { comments: comments.map(cm => ({ user: cm.userName || cm.userId, content: cm.content, date: cm.createdAt })) };
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
          const contacts = await aptlyVendorSearch(input.vendor_name, input.vendor_phone);
          if (contacts.length) {
            vendorId = contacts[0]._id;
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
        const r = await fetch(`https://core-api.getaptly.com/api/board/workOrder/${input.card_id}/comment`, {
          method: 'POST', headers: { 'x-token': APTLY_TOKEN, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: input.content })
        });
        return r.ok ? { success: true } : { error: `Aptly ${r.status}` };
      }
      case 'aptly_create_work_order': {
        let unitId = input.unitId, unitName = input.unitName, unitDuogram = input.unitDuogram;
        let locationId = input.locationId, locationName = input.locationName, locationDuogram = input.locationDuogram;
        let portfolioId = input.portfolioId, portfolioName = input.portfolioName, portfolioDuogram = input.portfolioDuogram;
        let owners = input.owners || [];
        if (input.address) {
          const lookup = await aptlyAptletLookup(input.address);
          if (lookup.unit_aptly_id) {
            unitId = lookup.unit_aptly_id; unitName = lookup.unit_aptly_name; unitDuogram = lookup.unit_aptly_duogram;
            locationId = lookup.building_aptly_id; locationName = lookup.building_aptly_name; locationDuogram = lookup.building_aptly_duogram;
            portfolioId = lookup.portfolio_aptly_id; portfolioName = lookup.portfolio_aptly_name; portfolioDuogram = lookup.portfolio_aptly_duogram;
            owners = lookup.owners || [];
          }
        }
        const cardBody = {
          description: input.description || '',
          stage: input.stage || 'Internal Work Order Request',
          priority: input.priority || 'Med',
          source: 'Staff',
          isSharedWithTenant: input.isSharedWithTenant || false,
          isSharedWithOwner: input.isSharedWithOwner || false,
        };
        if (unitId) cardBody['unit'] = [{ _id: unitId, name: unitName || '', duogram: unitDuogram || '' }];
        if (locationId) {
          cardBody['location'] = [{ _id: locationId, name: locationName || '', duogram: locationDuogram || '' }];
          cardBody['Buildings'] = [{ _id: locationId, name: locationName || '', duogram: locationDuogram || '' }];
        }
        if (portfolioId) cardBody['portfolio'] = [{ _id: portfolioId, name: portfolioName || '', duogram: portfolioDuogram || '' }];
        if (owners.length) cardBody['ownerContacts'] = owners;
        const stageToRVStatus = { 'Open': 'Open', 'Internal Work Order Request': 'Internal Work Order Request', 'Unit Turn': 'Unit Turn', 'Estimating': 'Estimating', 'Requested': 'Requested', 'Scheduled': 'Scheduled', 'Home Warranty': 'Home Warranty', 'Waiting for Parts': 'Waiting for Parts', 'Dispatch Work Order': 'Open', 'Completed': 'Completed', 'Cancelled': 'Cancelled' };
        cardBody['rentvineStatus'] = stageToRVStatus[input.stage] || 'Open';
        const r = await fetch('https://core-api.getaptly.com/api/board/workOrder', {
          method: 'POST', headers: { 'x-token': APTLY_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(cardBody)
        });
        const result = await r.json();
        if (!r.ok) return { error: `Aptly ${r.status}`, detail: result };
        return { success: true, cardId: result.data?._id || result._id, message: 'Work order created in Aptly. Rentvine will sync within a few minutes.' };
      }
      case 'aptly_get_vendor_contact': {
        return { contacts: await aptlyVendorSearch(input.name) };
      }
      case 'send_sms': {
        const QUO_TOKEN = process.env.QUO_API_TOKEN;
        const r = await fetch('https://api.quo.com/v1/messages', {
          method: 'POST',
          headers: { 'Authorization': QUO_TOKEN, 'Content-Type': 'application/json' },
          body: JSON.stringify({ content: input.message, from: '+16028549884', to: [input.to], phoneNumberId: 'PNRRARIpQO' }),
        });
        const data = await r.json();
        if (!r.ok) return { error: `Quo ${r.status}`, detail: data };
        if (input.card_id) {
          const comment = `📱 SMS sent to ${input.recipient_type || 'contact'} (${input.to}):\n${input.message}`;
          await fetch(`https://core-api.getaptly.com/api/board/workOrder/${input.card_id}/comment`, {
            method: 'POST', headers: { 'x-token': APTLY_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ content: comment })
          });
        }
        return { success: true, to: input.to, message: input.message };
      }
      case 'rv_dispatch_vendor': {
        const RV_AUTH = Buffer.from('2586bdded08f499bb2057e373fd662f7:81f3aa4cb0434162aab8a27702f089b8').toString('base64');
        // Step 1: Find vendor by name — try progressively shorter search terms
        const searchTerms = [
          input.vendor_name,
          input.vendor_name.split(' ').slice(0,2).join(' '),
          input.vendor_name.split(' ')[0],
        ].filter((v,i,a) => v && a.indexOf(v) === i);
        let items = [];
        for (const term of searchTerms) {
          const sr = await fetch(`https://aloepm.rentvine.com/api/manager/contacts?contactType=vendor&search=${encodeURIComponent(term)}&pageSize=10`, {
            headers: { 'Authorization': `Basic ${RV_AUTH}`, 'X-Rentvine-Account': 'aloepm' }
          });
          const sd = await sr.json();
          items = Array.isArray(sd) ? sd : (sd.data||[]);
          if (items.length) break;
        }
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
        let vendorData;
        try { vendorData = await readVendorsGCS(); } catch(e) { return { error: 'Could not load vendor directory: ' + e.message }; }
        const trades = vendorData.trades || [];
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
        matched = matched.slice().sort((a,b) => (a.priority ?? 999) - (b.priority ?? 999));
        return { trade: trade.name, zone: input.zone || 'any', vendors: matched.slice(0,3).map(v => ({ name: v.name, phone: v.phone, zones: v.zones, notes: v.notes, priority: v.priority })), instruction: 'Vendors are sorted by priority, lowest number first. Always dispatch the first vendor listed unless its notes state a specific reason not to (e.g. unavailable, wrong scope, requires pre-approval).' };
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
        const res = await rvPropertyLookup(input.address);
        return res.body;
      }
      case 'rv_get_property_units': {
        try {
          const data = await rvFetch('/properties/' + input.property_id + '/units');
          const units = Array.isArray(data) ? data : (data.units || data.data || []);
          return { units: units.map(u => ({ unitId: u.unitID || u.id, address: u.address || u.streetAddress, name: u.name, beds: u.bedrooms, baths: u.bathrooms })) };
        } catch(e) { return { error: e.message }; }
      }
      case 'rv_get_wo_history': {
        try {
          const lookup = await rvPropertyLookup(input.address);
          const props = lookup.body?.properties || [];
          if (!props.length) return { error: 'Property not found for address: ' + input.address, history: [] };
          const propertyId = props[0].propertyId;
          const limit = Math.min(parseInt(input.limit) || 10, 50);
          const data = await rvFetch('/maintenance/work-orders', { propertyID: propertyId, pageSize: 100, page: 1 });
          let rows = Array.isArray(data) ? data : (data.data || []);
          rows = rows.map(r => r.workOrder || r);
          if (input.trade) {
            const tradeLower = input.trade.toLowerCase();
            rows = rows.filter(r => (r.description || '').toLowerCase().includes(tradeLower));
          }
          rows.sort((a,b) => new Date(b.dateCreated || 0) - new Date(a.dateCreated || 0));
          const history = rows.slice(0, limit).map(r => ({
            workOrderNumber: r.workOrderNumber, date: r.dateCreated || null,
            description: (r.description || '').slice(0, 200), status: r.workOrderStatusID || null,
          }));
          return { propertyId, history, note: 'Reflects Rentvine work order history for this property.' };
        } catch(e) { return { error: e.message, history: [] }; }
      }
      case 'rv_get_notes': {
        try {
          const results = await rvFetch('/maintenance/work-orders', { pageSize: 50, page: 1, search: input.wo_number });
          const rows = Array.isArray(results) ? results : [];
          const found = rows.find(r => String(r.workOrder.workOrderNumber) === String(input.wo_number) || String(r.workOrder.workOrderID) === String(input.wo_number));
          if (!found) return { error: 'WO not found', wo_number: input.wo_number };
          const internalId = found.workOrder.workOrderID;
          const notes = await rvFetch('/notes', { objectTypeID: 16, objectID: internalId, pageSize: 50 });
          return {
            workOrder: { id: internalId, number: found.workOrder.workOrderNumber, description: (found.workOrder.description||'').slice(0,200) },
            notes: Array.isArray(notes) ? notes.map(n => ({ author: n.createdByName||n.author, content: n.note||n.content, date: n.datePosted||n.createdAt })) : []
          };
        } catch(e) { return { error: e.message }; }
      }
      case 'rv_get_lease_tenants': {
        const r = await fetch(`${RENTVINE_BASE}/leases/${input.lease_id}/tenants`, {
          headers: { 'Authorization': `Basic ${RENTVINE_AUTH}`, 'X-Rentvine-Account': process.env.RENTVINE_ACCOUNT }
        });
        const data = await r.json();
        if (!r.ok) return { error: `Rentvine ${r.status}`, detail: JSON.stringify(data).slice(0,200) };
        const arr = Array.isArray(data) ? data : (data.data || []);
        const tenants = arr.map(t => ({
          name: t.contact?.fullname || t.contact?.name || t.name || '',
          phone: t.contact?.phone?.[0]?.number || t.phone || null,
          email: t.contact?.email?.[0] || t.email || null,
        }));
        return { tenants };
      }
      case 'get_owner_contact': {
        const bldRes = await fetch(`https://core-api.getaptly.com/api/board/location/${input.building_aptly_id}`, { headers: { 'x-token': APTLY_TOKEN } });
        const bldData = await bldRes.json();
        const bld = bldData.data || bldData;
        const owners = bld.owners || [];
        if (!owners.length) return { owners: [] };
        const resolved = await Promise.all(owners.map(async o => {
          try {
            const cRes = await fetch(`https://core-api.getaptly.com/api/contacts?page=0&name=${encodeURIComponent(o.name)}`, { headers: { 'x-token': APTLY_TOKEN } });
            const cData = await cRes.json();
            const match = (cData.data || [])[0];
            return { name: o.name, phone: match?.phone?.[0]?.number || null, email: match?.email?.[0] || null };
          } catch(e) { return { name: o.name, phone: null, email: null }; }
        }));
        return { owners: resolved };
      }
      default: return { error: `Unknown Ari tool: ${toolName}` };
    }
  } catch(e) { return { error: e.message }; }
}

// Merge shared Aptly tools — skip any already defined in ARI_TOOLS
const ARI_TOOL_NAMES = new Set(ARI_TOOLS.map(t => t.name));
const EXTRA_APTLY_TOOLS = APTLY_TOOLS.filter(t => !ARI_TOOL_NAMES.has(t.name));
const ALL_ARI_TOOLS = [...ARI_TOOLS, ...EXTRA_APTLY_TOOLS];

async function executeAriToolFull(name, input) {
  const ariResult = await executeAriTool(name, input);
  if (ariResult !== null && ariResult !== undefined) return ariResult;
  return await executeAptlyTool(name, input);
}

async function aptlyVendorSearch(name, phone) {
  const params = new URLSearchParams({ page: 0, pageSize: 20 });
  if (phone) params.set('phone', phone);
  if (name) params.set('query', name);
  const r = await fetch(`https://core-api.getaptly.com/api/contacts?${params}`, { headers: { 'x-token': APTLY_TOKEN } });
  const data = await r.json();
  const contacts = (data.data || []).filter(c =>
    c.contactType === 'Vendor' ||
    c.typeId === 'vendor' ||
    (c.fullname && name && c.fullname.toLowerCase().includes(name.toLowerCase()))
  );
  return contacts.map(c => ({ _id: c._id, name: c.fullname, type: c.contactType }));
}

async function getGCSToken() {
  const r = await fetch('http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token', {
    headers: { 'Metadata-Flavor': 'Google' }
  });
  const d = await r.json();
  return d.access_token;
}

async function readVendorsGCS() {
  const token = await getGCSToken();
  const r = await fetch(`https://storage.googleapis.com/storage/v1/b/aloe-hub-data-496300/o/vendors.json?alt=media`, {
    headers: { Authorization: 'Bearer ' + token }
  });
  if (!r.ok) throw new Error('GCS read ' + r.status);
  return r.json();
}

async function aptlyAptletLookup(address) {
  const houseNum = (address || '').trim().split(' ')[0];
  if (!houseNum) return { unit_aptly_id: null, building_aptly_id: null };
  for (let page = 0; page < 15; page++) {
    const r = await fetch(`https://core-api.getaptly.com/api/board/workOrder?page=${page}&pageSize=100&includeArchived=true`, { headers: { 'x-token': APTLY_TOKEN } });
    const data = await r.json();
    const cards = Array.isArray(data) ? data : (data.data || []);
    if (!cards.length) break;
    for (const c of cards) {
      const name = c.name || '';
      if (name.includes(houseNum) && c.unit?.[0]?._id && c.location?.[0]?._id) {
        const buildingId = c.location[0]._id;
        let portfolioId = null, portfolioName = null, portfolioDuogram = null, owners = [];
        try {
          const bldResp = await fetch(`https://core-api.getaptly.com/api/board/location/${buildingId}`, { headers: { 'x-token': APTLY_TOKEN } });
          const bldData = await bldResp.json();
          const bld = bldData.data || bldData;
          portfolioId = bld.portfolio?.[0]?._id || null;
          portfolioName = bld.portfolio?.[0]?.name || null;
          portfolioDuogram = bld.portfolio?.[0]?.duogram || null;
          owners = bld.owners || [];
        } catch(e) { /* ignore */ }
        return {
          unit_aptly_id: c.unit[0]._id, unit_aptly_name: c.unit[0].name || null, unit_aptly_duogram: c.unit[0].duogram || null,
          building_aptly_id: buildingId, building_aptly_name: c.location[0].name || null, building_aptly_duogram: c.location[0].duogram || null,
          portfolio_aptly_id: portfolioId, portfolio_aptly_name: portfolioName, portfolio_aptly_duogram: portfolioDuogram,
          owners
        };
      }
    }
  }
  return { unit_aptly_id: null, building_aptly_id: null };
}

module.exports = { ARI_TOOLS: ALL_ARI_TOOLS, executeAriTool: executeAriToolFull };
