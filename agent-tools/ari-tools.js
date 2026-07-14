// ── Ari-specific tools and handlers ──────────────────────────────────────
const { hubRequest } = require('./hub-client');

const ARI_TOOLS = [
  { name: 'aptly_search_cards', description: 'Search Aptly work order cards by address, tenant name, WO number, or filter by stage.', input_schema: { type: 'object', properties: { query: { type: 'string' }, stage: { type: 'string' }, limit: { type: 'string' } }, required: [] } },
  { name: 'aptly_get_card', description: 'Get full details of a work order card. Use the alphanumeric id from search results, never the WO number.', input_schema: { type: 'object', properties: { card_id: { type: 'string' } }, required: ['card_id'] } },
  { name: 'aptly_get_comments', description: 'Get all comments on a work order card.', input_schema: { type: 'object', properties: { card_id: { type: 'string' } }, required: ['card_id'] } },
  { name: 'aptly_update_card', description: 'Update a field on a work order card.', input_schema: { type: 'object', properties: { card_id: { type: 'string' }, field_name: { type: 'string' }, value: {} }, required: ['card_id','field_name','value'] } },
  { name: 'aptly_dispatch_vendor', description: 'Dispatch or reassign a vendor to a work order in Aptly.', input_schema: { type: 'object', properties: { card_id: { type: 'string' }, vendor_phone: { type: 'string' }, home_warranty: { type: 'string', enum: ['Yes','No'] }, is_reassign: { type: 'boolean' } }, required: ['card_id','vendor_phone','home_warranty'] } },
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
        const params = new URLSearchParams();
        if (input.query) params.set('query', input.query);
        if (input.stage) params.set('stage', input.stage);
        if (input.limit) params.set('limit', input.limit);
        const res = await hubRequest('GET', `/api/aptly/cards/search?${params}`);
        return res.status === 200 ? res.body : { error: `Hub ${res.status}`, detail: res.body };
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
        const res = await hubRequest('POST', `/api/aptly/cards/${input.card_id}`, { field_name: input.field_name, value: input.value });
        return res.status === 200 || res.status === 201 ? { success: true } : { error: `Hub ${res.status}`, detail: res.body };
      }
      case 'aptly_dispatch_vendor': {
        const res = await hubRequest('POST', `/api/aptly/cards/${input.card_id}/dispatch`, { vendorPhone: input.vendor_phone, homeWarranty: input.home_warranty, isReassign: input.is_reassign });
        return res.status === 200 || res.status === 201 ? { success: true } : { error: `Hub ${res.status}`, detail: res.body };
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
