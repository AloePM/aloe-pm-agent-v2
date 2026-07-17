require('dotenv').config({ path: '.env.ivy' });
const { loadPlaybook, savePlaybook } = require('./loadPlaybook');
const { logActivity } = require('./logActivity');
const { App } = require('@slack/bolt');
const Anthropic = require('@anthropic-ai/sdk');
const { getMcpServers } = require('./mcpConfig');
const fs = require('fs');
const path = require('path');

const repoPath = process.env.ALOE_REPO_PATH || path.join(process.env.HOME, 'aloe-pm-agent-v2');

function loadFile(filePath) {
  try { return fs.readFileSync(filePath, 'utf8'); } catch(e) { return ''; }
}

function buildSystemPrompt() {
  const playbook = loadFile(path.join(repoPath, '.claude/playbooks/leasing-coordinator.md'));
  const skills = [
    'lead-intake-response', 'showings', 'applications-screening', 'lease-prep'
  ].map(s => {
    const content = loadFile(path.join(repoPath, `.claude/skills/${s}/SKILL.md`));
    return content ? `\n\n## SKILL: ${s}\n${content}` : '';
  }).join('');

  return `You are Ivy, the Leasing Coordinator AI agent for Aloe Property Management (Phoenix metro area).
You are fast, organized, and consistent. You communicate in a warm, professional tone with prospects and applicants.
You are responding in Slack — keep responses clear and actionable.
Never make promises about approval, pricing, or lease terms without PM confirmation.
Always apply fair housing rules — treat every applicant consistently.

## YOUR PLAYBOOK
${playbook}
${skills}`;
}

let SYSTEM_PROMPT = buildSystemPrompt();
console.log('Ivy loaded — playbook:', SYSTEM_PROMPT.length, 'chars');

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: true,
  appToken: process.env.SLACK_APP_TOKEN,
});

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const RENTVINE_BASE = `https://${process.env.RENTVINE_ACCOUNT}.rentvine.com/api/manager`;
const RENTVINE_AUTH = Buffer.from(`${process.env.RENTVINE_API_KEY}:${process.env.RENTVINE_API_SECRET}`).toString('base64');

async function rvFetch(path, params = {}) {
  const url = new URL(`${RENTVINE_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) url.searchParams.set(k, v); });
  const r = await fetch(url.toString(), { headers: { Authorization: `Basic ${RENTVINE_AUTH}`, 'X-Rentvine-Account': process.env.RENTVINE_ACCOUNT } });
  if (!r.ok) { const txt = await r.text(); throw new Error(`Rentvine ${r.status}: ${txt.slice(0, 100)}`); }
  return r.json();
}

const IVY_TOOLS = [
  {
    name: 'search_vacant_units',
    description: 'Search for vacant/available rental units. Filter by max rent, city, beds, or amenities like pool. Returns address, rent, beds, baths, sqft, available date, and pet policy.',
    input_schema: {
      type: 'object',
      properties: {
        maxRent: { type: 'number', description: 'Maximum monthly rent' },
        minRent: { type: 'number', description: 'Minimum monthly rent' },
        city: { type: 'string', description: 'City name to filter by (e.g. Gilbert, Chandler, Scottsdale)' },
        beds: { type: 'number', description: 'Number of bedrooms' },
        search: { type: 'string', description: 'General search term for address or property name' }
      }
    }
  },
  {
    name: 'get_property_details',
    description: 'Get full details for a specific property including availability date, occupancy status (vacant/tenant/owner-occupied), lease end date, rent, beds/baths, and amenities.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Property address to search for' }
      },
      required: ['search']
    }
  },
  {
    name: 'get_available_properties',
    description: 'Get all currently vacant and available properties with their details. Use when someone asks what homes are available or coming available soon.',
    input_schema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Optional city filter' },
        maxRent: { type: 'number', description: 'Optional maximum rent filter' }
      }
    }
  },
  {
    name: 'get_aptly_listing',
    description: 'Get the full Aptly listing for a property including marketing description, appliances, utilities included, pool, HOA info, parking, pet policy, lockbox info, virtual tour, and application URL. Use this when someone asks about appliances, what is included, utilities, amenities, or any property-specific details.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Property address to search for' }
      },
      required: ['search']
    }
  }
];

async function executeIvyTool(name, input) {
  switch(name) {
    case 'search_vacant_units': {
      const data = await rvFetch('/properties/units/export', { pageSize: 500, page: 1 });
      const units = Array.isArray(data) ? data : (data.data || []);
      let results = units.filter(u => {
        const unit = u.unit || {};
        const prop = u.property || {};
        if (unit.isActive === false || unit.isActive === '0') return false;
        if (String(unit.isVacant) !== '1') return false;
        if (input.maxRent && parseFloat(unit.rent) > input.maxRent) return false;
        if (input.minRent && parseFloat(unit.rent) < input.minRent) return false;
        if (input.beds && parseInt(unit.beds) !== parseInt(input.beds)) return false;
        if (input.city) {
          const addr = (prop.address || prop.streetAddress || '').toLowerCase();
          const city = (prop.city || '').toLowerCase();
          if (!addr.includes(input.city.toLowerCase()) && !city.includes(input.city.toLowerCase())) return false;
        }
        if (input.search) {
          const addr = (prop.address || prop.streetAddress || '').toLowerCase();
          if (!addr.includes(input.search.toLowerCase())) return false;
        }
        return true;
      });
      const formatted = results.slice(0, 20).map(u => ({
        address: u.property?.address || u.property?.streetAddress,
        city: u.property?.city,
        rent: u.unit?.rent,
        beds: u.unit?.beds,
        baths: u.unit?.fullBaths,
        sqft: u.unit?.sqft,
        vacant: true,
        leaseID: u.unit?.leaseID
      }));
      return JSON.stringify({ count: results.length, units: formatted });
    }
    case 'get_property_details': {
      // Fetch all properties and filter client-side (server search param ignored)
      const searchTerm = (input.search || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      let allProps = [];
      for (let pg = 1; pg <= 10; pg++) {
        const data = await rvFetch('/properties/export', { pageSize: 100, page: pg });
        const batch = Array.isArray(data) ? data : (data.data || []);
        if (!batch.length) break;
        allProps = allProps.concat(batch);
        if (batch.length < 100) break;
      }
      // Find best match by address
      const match = allProps.find(p => {
        const addr = ((p.property || p).address || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return addr.includes(searchTerm) || searchTerm.includes(addr.slice(0, 10));
      });
      if (!match) return JSON.stringify({ error: `Property not found: ${input.search}` });
      const prop = match.property || match;
      // Get units for this property
      let unitData = null;
      if (prop.propertyID) {
        try {
          const units = await rvFetch('/properties/units/export', { pageSize: 50, page: 1, propertyID: prop.propertyID });
          const arr = Array.isArray(units) ? units : (units.data || []);
          if (arr.length) unitData = arr[0].unit;
        } catch(e) {}
      }
      // Get lease if occupied
      let leaseInfo = null;
      if (unitData?.leaseID) {
        try {
          const lease = await rvFetch(`/leases/${unitData.leaseID}`);
          leaseInfo = { endDate: lease.endDate, startDate: lease.startDate, status: lease.primaryLeaseStatusID };
        } catch(e) {}
      }
      // Get appliances
      let appliances = [];
      if (prop.propertyID) {
        try {
          const appData = await rvFetch(`/maintenance/appliances`, { propertyID: prop.propertyID, pageSize: 50 });
          const appArr = Array.isArray(appData) ? appData : (appData.data || []);
          appliances = appArr.map(a => `${a.applianceType || a.name || 'Appliance'}${a.brand ? ' ('+a.brand+')' : ''}`);
        } catch(e) {}
      }
      return JSON.stringify({
        address: prop.address,
        city: prop.city,
        state: prop.stateID,
        propertyID: prop.propertyID,
        isVacant: String(unitData?.isVacant) === '1',
        rent: unitData?.rent,
        beds: unitData?.beds,
        baths: unitData?.fullBaths,
        sqft: unitData?.sqft,
        lease: leaseInfo,
        appliances,
        availableDate: String(unitData?.isVacant) === '1' ? 'Now' : (leaseInfo?.endDate || 'Contact office')
      });
    }
    case 'get_available_properties': {
      const data = await rvFetch('/properties/units/export', { pageSize: 500, page: 1 });
      const units = Array.isArray(data) ? data : (data.data || []);
      let results = units.filter(u => {
        const unit = u.unit || {};
        const prop = u.property || {};
        if (unit.isActive === false || unit.isActive === '0') return false;
        if (String(unit.isVacant) !== '1') return false;
        if (input.city) {
          const city = (prop.city || '').toLowerCase();
          const addr = (prop.address || '').toLowerCase();
          if (!city.includes(input.city.toLowerCase()) && !addr.includes(input.city.toLowerCase())) return false;
        }
        if (input.maxRent && parseFloat(unit.rent) > input.maxRent) return false;
        return true;
      });
      const formatted = results.slice(0, 25).map(u => ({
        address: u.property?.address || u.property?.streetAddress,
        city: u.property?.city,
        rent: u.unit?.rent,
        beds: u.unit?.beds,
        baths: u.unit?.fullBaths,
        sqft: u.unit?.sqft
      }));
      return JSON.stringify({ count: results.length, available: formatted });
    }
    case 'get_aptly_listing': {
      const searchTerm = (input.search || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      // Step 1: Find Rentvine unit ID by client-side address match
      let rvUnitId = null;
      let allRvUnits = [];
      for (let pg = 1; pg <= 10; pg++) {
        const rvR = await rvFetch('/properties/units/export', { pageSize: 100, page: pg });
        const batch = Array.isArray(rvR) ? rvR : (rvR.data || []);
        if (!batch.length) break;
        allRvUnits = allRvUnits.concat(batch);
        if (batch.length < 100) break;
      }
      const rvMatch = allRvUnits.find(u => {
        const addr = (u.unit?.address || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return addr.includes(searchTerm.slice(0, 14)) || searchTerm.includes(addr.slice(0, 14));
      });
      if (rvMatch) rvUnitId = String(rvMatch.unit?.unitID);
      if (!rvUnitId) return JSON.stringify({ error: `Property not found in Rentvine: ${input.search}` });
      // Step 2: Fetch ALL Aptly units and match by rentvineId
      let match = null;
      for (let pg = 0; pg < 20; pg++) {
        const r = await fetch(`https://core-api.getaptly.com/api/board/unit?page=${pg}&pageSize=50`, {
          headers: { 'x-token': process.env.APTLY_TOKEN }
        });
        if (!r.ok) break;
        const data = await r.json();
        const arr = data.data || [];
        if (!arr.length) break;
        match = arr.find(u => String(u.rentvineId) === rvUnitId);
        if (match) break;
      }
      if (!match) return JSON.stringify({ error: `Property found in Rentvine (ID: ${rvUnitId}) but not in Aptly listings` });
      return JSON.stringify({
        address: match.street,
        city: match.city,
        state: match.state,
        stage: match.stage,
        beds: match.beds,
        baths: match.baths,
        sqft: match.totalArea,
        rent: match.marketRent?.amount,
        deposit: match.deposit?.amount,
        availableDate: match.availableDate,
        publishedForRent: match.publishedForRent,
        marketingDescription: match.marketingDescription,
        parkingType: match.parkingType,
        parkingSpaces: match.parkingSpaces,
        furnished: match.furnished,
        lockboxDescription: match.lockboxDescription,
        virtualTourUrl: match.virtualTourUrl,
        applicationUrl: match.applicationUrl,
        petPolicy: match.petPolicy,
        owner: match.owners?.[0]?.name
      });
    }
    default:
      return JSON.stringify({ error: `Unknown tool: ${name}` });
  }
}


async function getThreadHistory(client, channel, threadTs) {
  try {
    const result = await client.conversations.replies({ channel, ts: threadTs, limit: 20 });
    return result.messages || [];
  } catch(e) { return []; }
}

app.event('app_mention', async ({ event, client, say }) => {
  console.log('Ivy mentioned:', event.text?.slice(0, 80));
  const userMessage = (event.text || '').replace(/<@[A-Z0-9]+>/g, '').trim();
  if (!userMessage) return;

  const thinking = await say({
    text: '⚙️ On it...',
    thread_ts: event.thread_ts || event.ts,
  });

  try {
    const threadTs = event.thread_ts || event.ts;
    const history = await getThreadHistory(client, event.channel, threadTs);
    const botInfo = await client.auth.test();
    const botUserId = botInfo.user_id;

    const messages = [];
    for (const msg of history) {
      if (msg.ts === event.ts) continue;
      if (msg.bot_id && msg.user === botUserId) {
        const text = (msg.text || '').replace('⚙️ On it...', '').trim();
        if (text) messages.push({ role: 'assistant', content: text });
      } else if (!msg.bot_id) {
        const text = (msg.text || '').replace(/<@[A-Z0-9]+>/g, '').trim();
        if (text) messages.push({ role: 'user', content: text });
      }
    }
    messages.push({ role: 'user', content: userMessage });
    // Agentic loop
    let current = messages.slice();
    for (let i = 0; i < 10; i++) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: IVY_TOOLS,
        messages: current,
      });
      if (response.stop_reason !== 'tool_use') {
        const reply = response.content.filter(b => b.type === 'text').map(b => b.text).join('') || 'Sorry, I had trouble with that.';
        await client.chat.update({ channel: event.channel, ts: thinking.ts, text: reply });
        await logActivity({ agentId: 'ivy', type: 'reply', summary: reply.slice(0, 120), outcome: 'sent' });
        return;
      }
      const toolUses = response.content.filter(b => b.type === 'tool_use');
      const toolResults = await Promise.all(toolUses.map(async tb => {
        console.log('Ivy tool:', tb.name, JSON.stringify(tb.input).slice(0, 80));
        let result;
        try { result = await executeIvyTool(tb.name, tb.input); }
        catch(e) { result = JSON.stringify({ error: e.message }); }
        return { type: 'tool_result', tool_use_id: tb.id, content: result };
      }));
      current = current.concat([
        { role: 'assistant', content: response.content },
        { role: 'user', content: toolResults }
      ]);
    }
    await client.chat.update({ channel: event.channel, ts: thinking.ts, text: '⚠️ Too many steps — try a more specific question.' });

  } catch(e) {
    console.error('Ivy error:', e.message);
    await client.chat.update({
      channel: event.channel,
      ts: thinking.ts,
      text: '⚠️ Sorry, I ran into an error. Try again or check the logs.',
    });
  }
});

(async () => {
  SYSTEM_PROMPT = await loadPlaybook('ivy', SYSTEM_PROMPT);
  await savePlaybook('ivy', SYSTEM_PROMPT);
  await app.start();
  console.log('⚡ Ivy is online and listening for @Ivy mentions');
})();

