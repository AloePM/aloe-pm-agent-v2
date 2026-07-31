const APTLY_BASE = 'https://core-api.getaptly.com';
const MOVE_OUTS_BOARD = 'YA3QWmPebvMwLwbB3';
const RENTVINE_BASE = process.env.RENTVINE_BASE || 'https://api.rentvine.com';

function aptlyHeaders() {
  return { 'x-token': process.env.APTLY_TOKEN, 'Content-Type': 'application/json' };
}

async function aptlyFetch(path, opts = {}) {
  const res = await fetch(`${APTLY_BASE}${path}`, { ...opts, headers: aptlyHeaders() });
  if (!res.ok) throw new Error(`Aptly ${path} failed: ${res.status}`);
  return res.json();
}

async function rvFetch(path) {
  const res = await fetch(`${RENTVINE_BASE}${path}`, {
    headers: { Authorization: process.env.RENTVINE_AUTH || '' },
  });
  if (!res.ok) throw new Error(`Rentvine ${path} failed: ${res.status}`);
  return res.json();
}

const MATT_TOOLS = [
  { name: 'get_move_out_card', description: 'Fetch a Move-Outs board card by ID or search by address/tenant name.', input_schema: { type: 'object', properties: { card_id: { type: 'string' }, search: { type: 'string' } }, required: [] } },
  { name: 'get_pending_move_outs', description: 'List active Move-Outs board cards, optionally filtered by stage (Upcoming Move-Out, 14 Days Out, 5 Days Out, Move-Out Day, Repairs).', input_schema: { type: 'object', properties: { stage: { type: 'string' } }, required: [] } },
  { name: 'get_move_out_lease', description: 'Look up a lease and tenant contact info (name, phone, email) from Rentvine for move-out coordination.', input_schema: { type: 'object', properties: { lease_id: { type: 'string' }, address: { type: 'string' } }, required: [] } },
  { name: 'update_move_out_card', description: 'Update fields on a Move-Outs card (move-out type, stage, owner decisions, utility confirmation, etc).', input_schema: { type: 'object', properties: { card_id: { type: 'string' }, fields: { type: 'object' } }, required: ['card_id', 'fields'] } },
  { name: 'get_move_out_ledger', description: 'Get all charges currently on a move-out lease ledger, to verify completeness against Portfolio → Bills before finalizing.', input_schema: { type: 'object', properties: { lease_id: { type: 'string' } }, required: ['lease_id'] } },
  { name: 'add_comment', description: 'Add a comment to a Move-Outs card.', input_schema: { type: 'object', properties: { card_id: { type: 'string' }, content: { type: 'string' } }, required: ['card_id', 'content'] } },
  { name: 'send_sms', description: 'Send an SMS to a tenant, owner, or vendor from the Aloe main number (602-854-9884). Include card_id to log as Aptly comment on the Move-Outs board.', input_schema: { type: 'object', properties: { to: { type: 'string' }, message: { type: 'string' }, recipient_type: { type: 'string', enum: ['tenant','owner','vendor'] }, card_id: { type: 'string' } }, required: ['to','message'] } },
];

async function executeMattTool(toolName, input) {
  try {
    switch(toolName) {
      case 'get_move_out_card': {
        if (input.card_id) return aptlyFetch(`/api/board/${MOVE_OUTS_BOARD}/${input.card_id}`);
        const board = await aptlyFetch(`/api/board/${MOVE_OUTS_BOARD}?page=0&pageSize=100`);
        const needle = (input.search || '').toLowerCase();
        const match = (board.data || []).find(c => (c.name || '').toLowerCase().includes(needle));
        return match || { error: 'No matching card found' };
      }
      case 'get_pending_move_outs': {
        const board = await aptlyFetch(`/api/board/${MOVE_OUTS_BOARD}?page=0&pageSize=100`);
        const cards = board.data || [];
        return input.stage ? cards.filter(c => c.stage === input.stage) : cards;
      }
      case 'get_move_out_lease': {
        const path = input.lease_id ? `/leases/${input.lease_id}` : `/leases?address=${encodeURIComponent(input.address || '')}`;
        return rvFetch(path);
      }
      case 'update_move_out_card': {
        return aptlyFetch(`/api/board/${MOVE_OUTS_BOARD}`, {
          method: 'POST',
          body: JSON.stringify({ _id: input.card_id, ...input.fields }),
        });
      }
      case 'get_move_out_ledger': {
        return rvFetch(`/leases/${input.lease_id}/ledger`);
      }
      case 'add_comment': {
        return aptlyFetch(`/api/board/${MOVE_OUTS_BOARD}/${input.card_id}/comment`, {
          method: 'POST',
          body: JSON.stringify({ content: input.content, userId: process.env.APTLY_COMMENT_USER_ID }),
        });
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
          const comment = `[Automated] 📱 SMS sent to ${input.recipient_type || 'contact'} (${input.to}):\n${input.message}`;
          await aptlyFetch(`/api/board/${MOVE_OUTS_BOARD}/${input.card_id}/comment`, {
            method: 'POST', body: JSON.stringify({ content: comment, userId: process.env.APTLY_COMMENT_USER_ID })
          });
        }
        return { success: true, to: input.to, message: input.message };
      }
      default: return { error: `Unknown Matt tool: ${toolName}` };
    }
  } catch(e) { return { error: e.message }; }
}

module.exports = { MATT_TOOLS, executeMattTool };
