/**
 * Aloe Hub Client — shared module for all agents
 */
const https = require('https');

const HUB_HOST = 'hub.aloepm.com';
const HUB_PORT = 443;
const HUB_SECRET = process.env.HUB_INTERNAL_SECRET;
if (!HUB_SECRET) throw new Error('HUB_INTERNAL_SECRET is not set in environment');

function hubRequest(method, path, body = null) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const req = require('https').request({
      hostname: HUB_HOST,
      port: HUB_PORT,
      path,
      method,
      headers: {
        'x-hub-token': HUB_SECRET,
        'Content-Type': 'application/json',
        ...(bodyStr ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
      },
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch(e) { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

const aptly = {
  searchCards: (query, stage, limit = 10) => {
    const qs = new URLSearchParams();
    if (query) qs.set('query', query);
    if (stage) qs.set('stage', stage);
    qs.set('limit', limit);
    return hubRequest('GET', `/api/aptly/cards/search?${qs}`);
  },
  getCard: (cardId) => hubRequest('GET', `/api/aptly/cards/${cardId}`),
  updateCard: (cardId, fields) => hubRequest('POST', `/api/aptly/cards/${cardId}`, { _id: cardId, ...fields }),
  addComment: (cardId, content) => hubRequest('POST', `/api/aptly/cards/${cardId}/comment`, { content }),
  createHOACard: (fields) => hubRequest('POST', `/api/aptly/hoa-cards`, fields),
};

const rentvine = {
  searchWorkOrders: (query) => hubRequest('GET', `/api/debug/rv-wo-search?q=${encodeURIComponent(query)}`),
  getWorkOrderNotes: (woNumber) => hubRequest('GET', `/api/rentvine/work-orders/${woNumber}/notes`),
  searchProperties: (address) => hubRequest('GET', `/api/rentvine/property-lookup?q=${encodeURIComponent(address)}`),
  getLease: (leaseId) => hubRequest('GET', `/api/rentvine/leases/${leaseId}`),
  addLeaseCharge: (leaseId, amount, description) =>
    hubRequest('POST', `/api/rentvine/leases/${leaseId}/charges`, { amount, description }),
};

const APTLY_TOOLS = [
  { name: 'aptly_search_cards', description: 'Search Aptly cards by address, tenant name, or WO number.', input_schema: { type: 'object', properties: { query: { type: 'string' }, stage: { type: 'string' }, limit: { type: 'string' } }, required: [] } },
  { name: 'aptly_get_card', description: 'Get full details of a card by ID.', input_schema: { type: 'object', properties: { card_id: { type: 'string' } }, required: ['card_id'] } },
  { name: 'aptly_update_card', description: 'Update a field on a card.', input_schema: { type: 'object', properties: { card_id: { type: 'string' }, field_name: { type: 'string' }, value: {} }, required: ['card_id', 'field_name', 'value'] } },
  { name: 'aptly_add_comment', description: 'Add a comment to a card.', input_schema: { type: 'object', properties: { card_id: { type: 'string' }, content: { type: 'string' } }, required: ['card_id', 'content'] } },
  { name: 'rv_get_notes', description: 'Get Rentvine notes for a work order by WO number.', input_schema: { type: 'object', properties: { wo_number: { type: 'string' } }, required: ['wo_number'] } },
  { name: 'aptly_search_property', description: 'Search Aptly for a property by address when Rentvine search returns no results. Returns tenant name, lease dates, Rentvine ID, HOA info, and owner details. Use this as fallback when rv_search_property fails.', input_schema: { type: 'object', properties: { address: { type: 'string' } }, required: ['address'] } },
  { name: 'rv_search_property', description: 'Find a property in Rentvine by street address. Returns propertyID, leaseID, and HOA custom fields.', input_schema: { type: 'object', properties: { address: { type: 'string' } }, required: ['address'] } },
  { name: 'rv_get_lease', description: 'Get lease details including tenant name and lease start date (move-in date).', input_schema: { type: 'object', properties: { lease_id: { type: 'string' } }, required: ['lease_id'] } },
  { name: 'rv_add_lease_charge', description: 'Add a charge to a tenant lease. HOA admin fee: amount=5 description="HOA Notice". Fine: description="HOA Violation Fine". Only when tenant is responsible — warning OR fine both get the $5 admin fee.', input_schema: { type: 'object', properties: { lease_id: { type: 'string' }, amount: { type: 'number' }, description: { type: 'string', enum: ['HOA Notice', 'HOA Violation Fine'] } }, required: ['lease_id', 'amount', 'description'] } },
  {
    name: 'rv_get_lease_balance',
    description: 'Get the outstanding balance and charge breakdown for a tenant lease. Always use this before discussing any charges with or about a tenant.',
    input_schema: {
      type: 'object',
      properties: { lease_id: { type: 'string' } },
      required: ['lease_id']
    }
  },
  { name: 'aptly_create_hoa_card', description: 'Create a new HOA Violation card in Aptly on the HOA Violations board. Never leave owner_tenant_responsible or violation_issue blank.', input_schema: { type: 'object', properties: { title: { type: 'string', description: 'Address – HOA Warning/Violation: [issue]' }, unit_aptly_id: { type: 'string', description: 'Aptly unit aptlet ID from aptly_get_aptlet_ids' }, unit_aptly_name: { type: 'string' }, building_aptly_id: { type: 'string', description: 'Aptly building aptlet ID from aptly_get_aptlet_ids' }, building_aptly_name: { type: 'string' }, due_date: { type: 'string' }, violation_issue: { type: 'string' }, warning_or_fine: { type: 'string', enum: ['Warning', 'Fine'] }, fine_amount: { type: 'number' }, owner_tenant_responsible: { type: 'string', enum: ['Owner', 'Tenant'] }, violation_exact_wording: { type: 'string' }, mirror_hoa_name: { type: 'string' }, mirror_hoa_number: { type: 'string' }, mirror_hoa_email: { type: 'string' } }, required: ['title', 'violation_issue', 'warning_or_fine', 'owner_tenant_responsible'] } },
];

async function executeHubTool(toolName, input) {
  try {
    const fieldMap = {
      'issue type': 'nfEujqs3ujMNgMFom',
      'home warranty': '3PvcEJoFBQLnjHnd6',
      'stage': 'stage',
      'priority': 'priority',
    };
    switch(toolName) {
      case 'aptly_search_cards': {
        const params = {};
        if (input.query) params.query = input.query;
        if (input.stage) params.stage = input.stage;
        if (input.limit) params.limit = input.limit;
        const res = await hubRequest('GET', `/api/aptly/cards/search?${new URLSearchParams(params)}`);
        return res.status === 200 ? res.body : { error: `Hub ${res.status}`, detail: res.body };
      }
      case 'aptly_get_card': {
        const res = await hubRequest('GET', `/api/aptly/cards/${input.card_id}`);
        return res.status === 200 ? res.body : { error: `Hub ${res.status}`, detail: res.body };
      }
      case 'aptly_update_card': {
        const fieldKey = fieldMap[input.field_name.toLowerCase()] || input.field_name;
        const res = await hubRequest('POST', `/api/aptly/cards/${input.card_id}`, { _id: input.card_id, [fieldKey]: input.value });
        return res.status === 200 || res.status === 201 ? { success: true } : { error: `Hub ${res.status}`, detail: res.body };
      }
      case 'aptly_add_comment': {
        const res = await hubRequest('POST', `/api/aptly/cards/${input.card_id}/comment`, { content: input.content });
        return res.status === 200 || res.status === 201 ? { success: true } : { error: `Hub ${res.status}`, detail: res.body };
      }
      case 'rv_get_notes': {
        const res = await hubRequest('GET', `/api/rentvine/work-orders/${input.wo_number}/notes`);
        return res.status === 200 ? res.body : { error: `Hub ${res.status}`, detail: res.body };
      }
      case 'aptly_search_property': {
        // Use dedicated property search route that searches all Aptly boards
        // Strips house number and directional to avoid spelling mismatch issues
        const normalize = (raw) => (raw || '')
          .replace(/^\d+\s+/, '')
          .replace(/^[NSEW]\.?\s+/i, '')
          .split(' ')[0];
        const streetName = normalize(input.address);
        const houseNum = (input.address || '').trim().split(' ')[0];
        let res = await hubRequest('GET', `/api/aptly/property-search?q=${encodeURIComponent(streetName)}`);
        if (res.status !== 200 || !res.body?.items?.length) {
          res = await hubRequest('GET', `/api/aptly/property-search?q=${encodeURIComponent(houseNum)}`);
        }
        // Extract Rentvine ID from Mirror Rentvine ID field if present
        const items = res.body?.items || [];
        const enriched = items.map(card => ({
          ...card,
          rentvineId: card['Mirror Rentvine ID'] || card['Rentvine ID'] || null,
          tenantName: card['Mirror Residents']?.[0]?.name || card['Tenants First Name'] || null,
          leaseStart: card['Mirror Move-In Date'] || card['Lease Term Start'] || null,
          leaseEnd: card['Mirror End Date'] || card['Lease Expire Date'] || null,
        }));
        // Fallback: if first result has no unit/building IDs, try Kat building lookup
        const finalItems = await Promise.all(enriched.map(async card => {
          if (!card.unit_aptly_id && input.address) {
            try {
              const fallback = await hubRequest('GET', `/api/kat/building-lookup?q=${encodeURIComponent(input.address)}`);
              if (fallback.status === 200 && fallback.body.unit_aptly_id) {
                return { ...card, ...fallback.body };
              }
            } catch(e) {}
          }
          return card;
        }));
        return { items: finalItems, total: finalItems.length };
      }
      case 'rv_search_property': {
        const normalized = (input.address || '')
          .replace(/\bwest\b/gi, 'W').replace(/\beast\b/gi, 'E')
          .replace(/\bnorth\b/gi, 'N').replace(/\bsouth\b/gi, 'S')
          .replace(/\bdrive\b/gi, 'Dr').replace(/\bstreet\b/gi, 'St')
          .replace(/\bavenue\b/gi, 'Ave').replace(/\bboulevard\b/gi, 'Blvd')
          .replace(/\bcourt\b/gi, 'Ct').replace(/\blane\b/gi, 'Ln')
          .replace(/\bplace\b/gi, 'Pl').replace(/\broad\b/gi, 'Rd')
          .replace(/\bcircle\b/gi, 'Cir').replace(/[.,]/g, '')
          .replace(/\s+/g, ' ').trim();
        let res = await hubRequest('GET', `/api/rentvine/property-lookup?q=${encodeURIComponent(normalized)}`);
        if (res.status === 200) {
          const body = res.body;
          const isEmpty = !body?.data?.length && !body?.results?.length && !Array.isArray(body);
          if (isEmpty) {
            const streetOnly = normalized.split(' ').slice(0, 3).join(' ');
            res = await hubRequest('GET', `/api/rentvine/property-lookup?q=${encodeURIComponent(streetOnly)}`);
          }
        }
        return res.status === 200 ? res.body : { error: `Hub ${res.status}`, detail: res.body };
      }
      case 'rv_get_lease': {
        const res = await hubRequest('GET', `/api/rentvine/leases/${input.lease_id}`);
        return res.status === 200 ? res.body : { error: `Hub ${res.status}`, detail: res.body };
      }
      case 'rv_add_lease_charge': {
        const res = await hubRequest('POST', `/api/rentvine/leases/${input.lease_id}/charges`, {
          amount: input.amount, description: input.description
        });
        return res.status === 200 || res.status === 201 ? { success: true } : { error: `Hub ${res.status}`, detail: res.body };
      }
      case 'rv_get_lease_balance': {
        const res = await hubRequest('GET', `/api/rentvine/leases/${input.lease_id}/balance-due`);
        return res.status === 200 ? res.body : { error: `Hub ${res.status}`, detail: res.body };
      }
      case 'aptly_create_hoa_card': {
        const res = await hubRequest('POST', `/api/aptly/hoa-cards`, input);
        return res.status === 200 || res.status === 201 ? { success: true, card: res.body } : { error: `Hub ${res.status}`, detail: res.body };
      }

      default: return { error: `Unknown tool: ${toolName}` };
    }
  } catch(e) { return { error: e.message }; }
}

module.exports = { hubRequest, aptly, rentvine, APTLY_TOOLS, executeHubTool };
