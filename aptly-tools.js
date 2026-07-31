// ── Shared Aptly Tools — imported by all agents ───────────────────────────
const APTLY_TOKEN = process.env.APTLY_TOKEN;
const APTLY_BASE = 'https://core-api.getaptly.com';

async function aptlyRequest(method, path, body) {
  const opts = {
    method,
    headers: { 'x-token': APTLY_TOKEN, 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);
  const r = await fetch(`${APTLY_BASE}${path}`, opts);
  const d = await r.json().catch(() => ({}));
  return { status: r.status, ok: r.ok, body: d };
}

const APTLY_TOOLS = [
  { name: 'aptly_search_cards', description: 'Search Aptly work order cards by WO number, address, or keyword.', input_schema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'aptly_get_card', description: 'Get full details of an Aptly card by card ID including stage, fields, vendor, and maintenance notes.', input_schema: { type: 'object', properties: { card_id: { type: 'string' } }, required: ['card_id'] } },
  { name: 'aptly_get_comments', description: 'Get comments/activity on an Aptly card.', input_schema: { type: 'object', properties: { card_id: { type: 'string' } }, required: ['card_id'] } },
  { name: 'aptly_update_card', description: 'Update a field on an Aptly card. Use field_name exactly as it appears (e.g. "Stage", "Issue Type", "home warranty").', input_schema: { type: 'object', properties: { card_id: { type: 'string' }, field_name: { type: 'string' }, value: { type: 'string' } }, required: ['card_id', 'field_name', 'value'] } },
  { name: 'aptly_add_comment', description: 'Add a comment to an Aptly card to log activity or communicate.', input_schema: { type: 'object', properties: { card_id: { type: 'string' }, content: { type: 'string' } }, required: ['card_id', 'content'] } },
  { name: 'aptly_create_card', description: 'Create a new card on an Aptly board.', input_schema: { type: 'object', properties: { board_id: { type: 'string', description: 'Aptly board UUID' }, name: { type: 'string' }, description: { type: 'string' }, assignee: { type: 'string', description: 'User ID to assign to' } }, required: ['board_id', 'name'] } },
  { name: 'aptly_get_card_tasks', description: 'Get checklist tasks on an Aptly card.', input_schema: { type: 'object', properties: { card_id: { type: 'string' } }, required: ['card_id'] } },
  { name: 'aptly_create_card_task', description: 'Create a checklist task on an Aptly card.', input_schema: { type: 'object', properties: { card_id: { type: 'string' }, title: { type: 'string' }, due_date: { type: 'string', description: 'ISO 8601 date' }, checked: { type: 'boolean' } }, required: ['card_id', 'title'] } },
  { name: 'aptly_search_emails', description: 'Search Aptly email inbox by sender, subject, or keyword. Returns threads with streamId for replies.', input_schema: { type: 'object', properties: { query: { type: 'string' }, channel_id: { type: 'string', description: 'Inbox ID to search in' } }, required: ['query'] } },
  { name: 'aptly_send_email', description: 'Send an email from an Aptly inbox. Use stream_id to reply to an existing thread.', input_schema: { type: 'object', properties: { channel_id: { type: 'string' }, to_email: { type: 'string' }, to_name: { type: 'string' }, subject: { type: 'string' }, body: { type: 'string' }, stream_id: { type: 'string', description: 'To reply to existing thread' } }, required: ['channel_id', 'to_email', 'subject', 'body'] } },
  { name: 'aptly_archive_email', description: 'Archive an email thread in Aptly by streamId.', input_schema: { type: 'object', properties: { stream_id: { type: 'string' } }, required: ['stream_id'] } },
  { name: 'aptly_reopen_email', description: 'Reopen an archived email thread in Aptly by streamId.', input_schema: { type: 'object', properties: { stream_id: { type: 'string' } }, required: ['stream_id'] } },
  { name: 'aptly_get_topics', description: 'Get all inbox topics/tags defined in Aptly for categorizing emails and messages.', input_schema: { type: 'object', properties: {} } },
];

async function executeAptlyTool(name, input) {
  switch(name) {
    case 'aptly_search_cards': {
      const r = await aptlyRequest('GET', `/api/board/workOrder?page=0&pageSize=50&search=${encodeURIComponent(input.query)}`);
      const items = (r.body.items || []).map(c => ({
        id: c._id, title: c.name, stage: c.stage?.name,
        address: (c.location||[])[0]?.name, unit: (c.unit||[])[0]?.name,
        vendor: (c.vendor||[])[0]?.name, priority: c.priority,
        description: (c.description||'').replace(/<[^>]+>/g,' ').trim().slice(0,200),
      }));
      return { items };
    }
    case 'aptly_get_card': {
      const r = await aptlyRequest('GET', `/api/board/ticket/${input.card_id}`);
      const c = r.body;
      const fields = {};
      (c.fields||[]).forEach(f => { fields[f.label||f.key] = f.value; });
      return {
        id: c._id, title: c.name, stage: c.stage?.name,
        address: (c.location||[])[0]?.name, unit: (c.unit||[])[0]?.name,
        vendor: (c.vendor||[])[0]?.name, priority: c.priority,
        description: (c.description||'').replace(/<[^>]+>/g,' ').trim(),
        fields,
        rentvineId: fields['Rentvine WO ID'] || fields['rentvineId'],
        maintenanceNotes: fields['Mirror Maintenance Notes'] || fields['maintenanceNotes'],
        homeWarranty: fields['home warranty'] || fields['Home Warranty'],
        issueType: fields['Issue Type'] || fields['issueType'],
      };
    }
    case 'aptly_get_comments': {
      const r = await aptlyRequest('GET', `/api/board/ticket/${input.card_id}/comments`);
      return { comments: r.body.items || r.body || [] };
    }
    case 'aptly_update_card': {
      const r = await aptlyRequest('GET', `/api/board/ticket/${input.card_id}`);
      const c = r.body;
      const fieldMap = {};
      (c.fields||[]).forEach(f => {
        if (f.label) fieldMap[f.label.toLowerCase()] = f._id;
        if (f.key) fieldMap[f.key.toLowerCase()] = f._id;
      });
      const fieldId = fieldMap[input.field_name.toLowerCase()];
      let updateBody = {};
      if (input.field_name.toLowerCase() === 'stage') {
        updateBody = { stage: input.value };
      } else if (fieldId) {
        updateBody = { fields: [{ _id: fieldId, value: input.value }] };
      } else {
        return { error: `Field not found: ${input.field_name}`, available: Object.keys(fieldMap) };
      }
      const ur = await aptlyRequest('PUT', `/api/board/ticket/${input.card_id}`, updateBody);
      return ur.ok ? { success: true } : { error: 'Update failed', detail: ur.body };
    }
    case 'aptly_add_comment': {
      const r = await aptlyRequest('POST', `/api/board/ticket/${input.card_id}/comments`, { content: input.content });
      return r.ok ? { success: true } : { error: 'Comment failed', detail: r.body };
    }
    case 'aptly_create_card': {
      const body = { name: input.name };
      if (input.description) body.description = input.description;
      if (input.assignee) body.assignee = input.assignee;
      const r = await aptlyRequest('POST', `/api/board/${input.board_id}/ticket`, body);
      return r.ok ? { success: true, card_id: r.body._id, title: r.body.name } : { error: 'Create failed', detail: r.body };
    }
    case 'aptly_get_card_tasks': {
      const r = await aptlyRequest('GET', `/api/board/ticket/${input.card_id}/tasks`);
      return { tasks: r.body.items || r.body || [] };
    }
    case 'aptly_create_card_task': {
      const body = { title: input.title, checked: input.checked || false };
      if (input.due_date) body.dueAt = input.due_date;
      const r = await aptlyRequest('POST', `/api/board/ticket/${input.card_id}/tasks`, body);
      return r.ok ? { success: true } : { error: 'Task create failed', detail: r.body };
    }
    case 'aptly_search_emails': {
      const params = new URLSearchParams({ query: input.query });
      if (input.channel_id) params.set('channelId', input.channel_id);
      const r = await aptlyRequest('GET', `/api/inbox/email?${params}`);
      return { threads: r.body.items || r.body || [] };
    }
    case 'aptly_send_email': {
      const body = {
        channelId: input.channel_id,
        to: [{ email: input.to_email, name: input.to_name || '' }],
        subject: input.subject,
        body: input.body,
      };
      if (input.stream_id) body.streamId = input.stream_id;
      const r = await aptlyRequest('POST', '/api/inbox/email', body);
      return r.ok ? { success: true } : { error: 'Send failed', detail: r.body };
    }
    case 'aptly_archive_email': {
      const r = await aptlyRequest('POST', `/api/inbox/email/${input.stream_id}/archive`, {});
      return r.ok ? { success: true } : { error: 'Archive failed', detail: r.body };
    }
    case 'aptly_reopen_email': {
      const r = await aptlyRequest('POST', `/api/inbox/email/${input.stream_id}/reopen`, {});
      return r.ok ? { success: true } : { error: 'Reopen failed', detail: r.body };
    }
    case 'aptly_get_topics': {
      const r = await aptlyRequest('GET', '/api/inbox/topics');
      return { topics: r.body.items || r.body || [] };
    }
    default:
      return null; // not an Aptly tool
  }
}

module.exports = { APTLY_TOOLS, executeAptlyTool };
