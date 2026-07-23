// ── Rex-specific tools and handlers ──────────────────────────────────────
const RENTVINE_BASE = `https://${process.env.RENTVINE_ACCOUNT}.rentvine.com/api/manager`;
const RENTVINE_AUTH = Buffer.from(`${process.env.RENTVINE_API_KEY}:${process.env.RENTVINE_API_SECRET}`).toString('base64');
const APTLY_TOKEN = process.env.APTLY_TOKEN;

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
    const enriched = filtered.slice(0, 10).map(item => {
      const p = item.property || item;
      return { propertyId: p.propertyID, leaseId: p.leaseID || null, address: p.address, city: p.city, state: p.stateID, zip: p.postalCode };
    });
    return { properties: enriched };
  } catch(e) {
    return { error: e.message };
  }
}

const REX_TOOLS = [
  { name: 'aptly_search_cards', description: 'Search Aptly cards by tenant name, address, or WO number.', input_schema: { type: 'object', properties: { query: { type: 'string' }, stage: { type: 'string' }, limit: { type: 'string' } }, required: [] } },
  { name: 'aptly_get_card', description: 'Get full details of an Aptly card.', input_schema: { type: 'object', properties: { card_id: { type: 'string' } }, required: ['card_id'] } },
  { name: 'aptly_update_card', description: 'Update a field on an Aptly card.', input_schema: { type: 'object', properties: { card_id: { type: 'string' }, field_name: { type: 'string' }, value: {} }, required: ['card_id','field_name','value'] } },
  { name: 'aptly_add_comment', description: 'Add a comment to an Aptly card.', input_schema: { type: 'object', properties: { card_id: { type: 'string' }, content: { type: 'string' } }, required: ['card_id','content'] } },
  { name: 'rv_search_property', description: 'Search for a property in Rentvine by address.', input_schema: { type: 'object', properties: { address: { type: 'string' } }, required: ['address'] } },
  { name: 'rv_get_lease_tenants', description: 'Get tenant contact info for a lease.', input_schema: { type: 'object', properties: { lease_id: { type: 'string' } }, required: ['lease_id'] } },
  { name: 'send_sms', description: 'Send an SMS to a tenant or owner.', input_schema: { type: 'object', properties: { to: { type: 'string' }, message: { type: 'string' }, recipient_type: { type: 'string', enum: ['tenant','owner'] }, card_id: { type: 'string' } }, required: ['to','message'] } },
];

async function executeRexTool(toolName, input) {
  try {
    switch(toolName) {
      case 'aptly_search_cards': {
        const q = input.query || '';
        const stage = input.stage || '';
        const limit = parseInt(input.limit || '20');
        const r = await fetch(`https://core-api.getaptly.com/api/board/workOrder?page=0&pageSize=100&search=${encodeURIComponent(q)}`, { headers: { 'x-token': APTLY_TOKEN } });
        const data = await r.json();
        let cards = Array.isArray(data) ? data : (data.data || []);
        cards = cards.filter(c => {
          const nameMatch = !q || (c.name||'').toLowerCase().includes(q.toLowerCase());
          const stageMatch = !stage || c.stage === stage;
          return nameMatch && stageMatch;
        });
        return { items: cards.slice(0, limit).map(c => ({ id: c._id, title: c.name||'', stage: c.stage||'', priority: c.priority||'', address: c.unit?.[0]?.name || c.location?.[0]?.name || '', description: c.description || '' })) };
      }
      case 'aptly_get_card': {
        const r = await fetch(`https://core-api.getaptly.com/api/board/workOrder/${input.card_id}`, { headers: { 'x-token': APTLY_TOKEN } });
        const data = await r.json();
        const c = data.data || data;
        if (!r.ok) return { error: `Aptly ${r.status}` };
        return { id: c.cardId, title: c.name, stage: c.stage, priority: c.priority, description: c.description, address: c.address, rentvineId: c.rentvineId };
      }
      case 'aptly_update_card': {
        const fieldMap = { 'issue type': 'nfEujqs3ujMNgMFom', 'maintenance category': 'nfEujqs3ujMNgMFom', 'home warranty': '3PvcEJoFBQLnjHnd6', 'stage': 'stage', 'priority': 'priority' };
        const fieldKey = fieldMap[input.field_name.toLowerCase()] || input.field_name;
        const body = { _id: input.card_id };
        body[fieldKey] = input.value;
        const r = await fetch('https://core-api.getaptly.com/api/board/workOrder', { method: 'POST', headers: { 'x-token': APTLY_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        const data = await r.json();
        return r.ok ? { success: true } : { error: 'Aptly error', detail: data };
      }
      case 'aptly_add_comment': {
        const r = await fetch(`https://core-api.getaptly.com/api/board/workOrder/${input.card_id}/comment`, { method: 'POST', headers: { 'x-token': APTLY_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ content: input.content }) });
        return r.ok ? { success: true } : { error: `Aptly ${r.status}` };
      }
      case 'rv_search_property': {
        return await rvPropertyLookup(input.address);
      }
      case 'rv_get_lease_tenants': {
        const r = await fetch(`${RENTVINE_BASE}/leases/${input.lease_id}/tenants`, { headers: { 'Authorization': `Basic ${RENTVINE_AUTH}`, 'X-Rentvine-Account': process.env.RENTVINE_ACCOUNT } });
        const data = await r.json();
        if (!r.ok) return { error: `Rentvine ${r.status}` };
        const arr = Array.isArray(data) ? data : (data.data || []);
        const tenants = arr.map(t => ({ name: t.contact?.fullname || t.contact?.name || t.name || '', phone: t.contact?.phone?.[0]?.number || t.phone || null, email: t.contact?.email?.[0] || t.email || null }));
        return { tenants };
      }
      case 'send_sms': {
        const QUO_TOKEN = process.env.QUO_API_TOKEN;
        const r = await fetch('https://api.quo.com/v1/messages', { method: 'POST', headers: { 'Authorization': QUO_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ content: input.message, from: '+16028549884', to: [input.to], phoneNumberId: 'PNRRARIpQO' }) });
        const data = await r.json();
        if (!r.ok) return { error: `Quo ${r.status}`, detail: data };
        if (input.card_id) {
          await fetch(`https://core-api.getaptly.com/api/board/workOrder/${input.card_id}/comment`, { method: 'POST', headers: { 'x-token': APTLY_TOKEN, 'Content-Type': 'application/json' }, body: JSON.stringify({ content: `📱 SMS sent to ${input.recipient_type || 'tenant'} (${input.to}):\n${input.message}` }) });
        }
        return { success: true };
      }
      default: return { error: `Unknown Rex tool: ${toolName}` };
    }
  } catch(e) { return { error: e.message }; }
}

module.exports = { REX_TOOLS, executeRexTool };
