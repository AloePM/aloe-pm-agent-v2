// ── Rex-specific tools and handlers ──────────────────────────────────────
const { hubRequest } = require('./hub-client');

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
        const params = new URLSearchParams();
        if (input.query) params.set('query', input.query);
        if (input.stage) params.set('stage', input.stage);
        if (input.limit) params.set('limit', input.limit);
        const res = await hubRequest('GET', `/api/aptly/cards/search?${params}`);
        return res.status === 200 ? res.body : { error: `Hub ${res.status}` };
      }
      case 'aptly_get_card': {
        const res = await hubRequest('GET', `/api/aptly/cards/${input.card_id}`);
        return res.status === 200 ? res.body : { error: `Hub ${res.status}` };
      }
      case 'aptly_update_card': {
        const res = await hubRequest('POST', `/api/aptly/cards/${input.card_id}`, { field_name: input.field_name, value: input.value });
        return res.status === 200 || res.status === 201 ? { success: true } : { error: `Hub ${res.status}` };
      }
      case 'aptly_add_comment': {
        const res = await hubRequest('POST', `/api/aptly/cards/${input.card_id}/comment`, { content: input.content });
        return res.status === 200 || res.status === 201 ? { success: true } : { error: `Hub ${res.status}` };
      }
      case 'rv_search_property': {
        const res = await hubRequest('GET', `/api/rentvine/property-lookup?q=${encodeURIComponent(input.address)}`);
        return res.status === 200 ? res.body : { error: `Hub ${res.status}` };
      }
      case 'rv_get_lease_tenants': {
        const res = await hubRequest('GET', `/api/rentvine/leases/${input.lease_id}/tenants`);
        return res.status === 200 ? res.body : { error: `Hub ${res.status}` };
      }
      case 'send_sms': {
        const res = await hubRequest('POST', '/api/quo/send-sms', { to: input.to, message: input.message });
        if (res.status !== 200 && res.status !== 201) return { error: `Hub ${res.status}` };
        if (input.card_id) {
          await hubRequest('POST', `/api/aptly/cards/${input.card_id}/comment`, { content: `📱 SMS sent to ${input.recipient_type || 'tenant'} (${input.to}):\n${input.message}` });
        }
        return { success: true };
      }
      default: return { error: `Unknown Rex tool: ${toolName}` };
    }
  } catch(e) { return { error: e.message }; }
}

module.exports = { REX_TOOLS, executeRexTool };
