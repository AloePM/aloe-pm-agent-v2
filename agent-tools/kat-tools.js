// ── Kat-specific tools and handlers ──────────────────────────────────────
const { hubRequest } = require('./hub-client');

const KAT_TOOLS = [
  { name: 'aptly_get_aptlet_ids', description: 'Look up Aptly unit and building aptlet IDs for a property using just the house number. Call this before aptly_create_hoa_card to enable unit/building auto-linking on the card.', input_schema: { type: 'object', properties: { house_number: { type: 'string', description: 'Just the house number, e.g. "4805" from "4805 N 87th Ave"' } }, required: ['house_number'] } },
];

async function executeKatTool(toolName, input) {
  try {
    switch(toolName) {
      case 'aptly_get_aptlet_ids': {
        // First try aptlet-lookup (searches existing WO cards)
        const res = await hubRequest('GET', `/api/aptly/aptlet-lookup?q=${encodeURIComponent(input.house_number)}`);
        if (res.status === 200 && res.body.unit_aptly_id) return res.body;
        // Fallback: search Buildings board directly
        const fallback = await hubRequest('GET', `/api/kat/building-lookup?q=${encodeURIComponent(input.house_number)}`);
        return fallback.status === 200 ? fallback.body : { unit_aptly_id: null, building_aptly_id: null };
      }
      default: return { error: `Unknown Kat tool: ${toolName}` };
    }
  } catch(e) { return { error: e.message }; }
}

module.exports = { KAT_TOOLS, executeKatTool };
