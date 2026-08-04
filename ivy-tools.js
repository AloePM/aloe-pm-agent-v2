// ── Ivy tool definitions: schema + handler together, single source of truth ─
const RENTVINE_BASE = `https://${process.env.RENTVINE_ACCOUNT}.rentvine.com/api/manager`;
const RENTVINE_AUTH = Buffer.from(`${process.env.RENTVINE_API_KEY}:${process.env.RENTVINE_API_SECRET}`).toString('base64');

async function rvFetch(path, params = {}) {
  const url = new URL(`${RENTVINE_BASE}${path}`);
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) url.searchParams.set(k, v); });
  const r = await fetch(url.toString(), { headers: { Authorization: `Basic ${RENTVINE_AUTH}`, 'X-Rentvine-Account': process.env.RENTVINE_ACCOUNT } });
  if (!r.ok) { const txt = await r.text(); throw new Error(`Rentvine ${r.status}: ${txt.slice(0, 100)}`); }
  return r.json();
}

const normalizeAddr = (s) => (s || '')
  .toLowerCase()
  .replace(/\bstreet\b/g, 'st')
  .replace(/\bavenue\b/g, 'ave')
  .replace(/\bboulevard\b/g, 'blvd')
  .replace(/\bdrive\b/g, 'dr')
  .replace(/\bcourt\b/g, 'ct')
  .replace(/\bplace\b/g, 'pl')
  .replace(/\blane\b/g, 'ln')
  .replace(/\broad\b/g, 'rd')
  .replace(/\bparkway\b/g, 'pkwy')
  .replace(/\bwest\b/g, 'w')
  .replace(/\beast\b/g, 'e')
  .replace(/\bnorth\b/g, 'n')
  .replace(/\bsouth\b/g, 's')
  .replace(/[^a-z0-9]/g, '');

const TOOL_DEFS = [
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
    },
    handler: async (input) => {
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
    },
    handler: async (input) => {
      const shortQ = (input.search || '').split(',')[0].replace(/(gilbert|chandler|mesa|phoenix|scottsdale|maricopa|tempe|casa grande|az|arizona)/gi, '').trim().slice(0, 20);
      const hubRes = await fetch(`https://hub.aloepm.com/api/rentvine/property-lookup?q=${encodeURIComponent(shortQ)}`, {
        headers: { 'x-hub-token': process.env.HUB_INTERNAL_SECRET }
      });
      const hubData = await hubRes.json();
      const hubProps = hubData.properties || [];
      if (!hubProps.length) return JSON.stringify({ error: `Property not found: ${input.search}` });
      const hubProp = hubProps[0];
      const propID = hubProp.propertyId;
      const propData = await rvFetch(`/properties/${propID}`);
      const prop = propData.property || propData;
      let unitData = null;
      if (prop.propertyID) {
        try {
          const units = await rvFetch('/properties/units/export', { pageSize: 50, page: 1, propertyID: prop.propertyID });
          const arr = Array.isArray(units) ? units : (units.data || []);
          if (arr.length) unitData = arr[0].unit;
        } catch(e) {}
      }
      let leaseInfo = null;
      if (unitData?.leaseID) {
        try {
          const lease = await rvFetch(`/leases/${unitData.leaseID}`);
          leaseInfo = { endDate: lease.endDate, startDate: lease.startDate, status: lease.primaryLeaseStatusID };
        } catch(e) {}
      }
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
    },
    handler: async (input) => {
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
    },
    handler: async (input) => {
      const searchTerm = normalizeAddr(input.search);
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
        const addr = normalizeAddr(u.unit?.address || '');
        return addr.includes(searchTerm.slice(0, 14)) || searchTerm.includes(addr.slice(0, 14));
      });
      if (rvMatch) rvUnitId = String(rvMatch.unit?.unitID);
      if (!rvUnitId) return JSON.stringify({ error: `Property not found in Rentvine: ${input.search}` });
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
  },
  {
    name: 'get_showing_history',
    description: 'Get showing history for a property — all prospects who toured or scheduled a tour, with timestamps, outcomes (attended/no-show/cancelled/rescheduled), and current stage. Use when asked about showings, tours, or who has visited a property.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Property address to search for showing history' }
      },
      required: ['search']
    },
    handler: async (input) => {
      const searchTerm = (input.search || '').toLowerCase();
      let allCards = [];
      for (let pg = 0; pg < 15; pg++) {
        const r = await fetch(`https://core-api.getaptly.com/api/board/4EMDSYKirhQaNdQKz?page=${pg}&pageSize=50`, {
          headers: { 'x-token': process.env.APTLY_TOKEN }
        });
        if (!r.ok) break;
        const data = await r.json();
        const arr = data.data || [];
        if (!arr.length) break;
        allCards = allCards.concat(arr);
      }
      const matches = allCards.filter(c => {
        const cardName = (c.name || '').toLowerCase();
        const unitName = (c.unit?.[0]?.name || '').toLowerCase();
        const propMatch = cardName.includes(searchTerm.slice(0, 12)) || unitName.includes(searchTerm.slice(0, 12));
        const hadShowing = (c.stageHistory || []).some(s => ['Scheduled Tour', 'Tour Completed'].includes(s.stage)) || ['Scheduled Tour', 'Tour Completed'].includes(c.stage);
        return propMatch && hadShowing;
      });
      return JSON.stringify({
        property: input.search,
        totalShowings: matches.length,
        showings: matches.map(c => ({
          prospect: c.name,
          currentStage: c.stage,
          stageHistory: c.stageHistory || [],
          lastAction: c.lastAction,
          contact: c.contact,
          cardId: c.cardId || c._id
        }))
      });
    }
  },
  {
    name: 'get_leads_by_property',
    description: 'Get all active leads (prospects) for a property from the Aptly Renter Leads board. Shows prospect name, current stage, last action, and contact info. Use to see who is interested in a property or to identify who to follow up with.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Property address to find leads for' },
        stage: { type: 'string', description: 'Optional stage filter: Nurturing, Engaged, Scheduled Tour, Tour Completed, Applied' }
      },
      required: ['search']
    },
    handler: async (input) => {
      const searchTerm = (input.search || '').toLowerCase();
      const stageFilter = input.stage?.toLowerCase();
      let allCards = [];
      for (let pg = 0; pg < 15; pg++) {
        const r = await fetch(`https://core-api.getaptly.com/api/board/4EMDSYKirhQaNdQKz?page=${pg}&pageSize=50`, {
          headers: { 'x-token': process.env.APTLY_TOKEN }
        });
        if (!r.ok) break;
        const data = await r.json();
        const arr = data.data || [];
        if (!arr.length) break;
        allCards = allCards.concat(arr);
      }
      const matches = allCards.filter(c => {
        const cardName = (c.name || '').toLowerCase();
        const unitName = (c.unit?.[0]?.name || '').toLowerCase();
        const propMatch = cardName.includes(searchTerm.slice(0, 12)) || unitName.includes(searchTerm.slice(0, 12));
        const stageMatch = !stageFilter || (c.stage || '').toLowerCase().includes(stageFilter);
        return propMatch && stageMatch && !c.archived;
      });
      return JSON.stringify({
        property: input.search,
        totalLeads: matches.length,
        leads: matches.map(c => ({
          prospect: c.name,
          stage: c.stage,
          lastAction: c.lastAction,
          contact: c.contact,
          stageUpdatedAt: c.stageUpdatedAt,
          cardId: c.cardId || c._id
        }))
      });
    }
  },
  {
    name: 'send_followup_sms',
    description: 'Send a follow-up SMS to a prospect via Quo. Use after showings, to re-engage cold leads, or when staff asks Ivy to reach out. Always confirm the message content before sending.',
    input_schema: {
      type: 'object',
      properties: {
        to: { type: 'string', description: 'Phone number to send to' },
        message: { type: 'string', description: 'SMS message content' }
      },
      required: ['to', 'message']
    },
    handler: async (input) => {
      const r = await fetch('https://hub.aloepm.com/api/quo/send-sms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-hub-token': process.env.HUB_INTERNAL_SECRET },
        body: JSON.stringify({ to: input.to, message: input.message, from: 'PNRRARIpQO' })
      });
      const result = await r.json();
      if (!r.ok) return JSON.stringify({ error: `SMS failed: ${r.status}`, detail: result });
      return JSON.stringify({ success: true, to: input.to, message: input.message });
    }
  },
  {
    name: 'get_listing_pipeline_status',
    description: 'Get the owner-listing pipeline status for a property from the Aptly List Property board — whether it is off market, being prepped, or on market, along with market rent, listed/off-market dates, showing start date, and rent-ready status. Use this when someone asks whether a property is listed yet, when it went on market, or what stage the listing prep is at.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Property address to search for' }
      },
      required: ['search']
    },
    handler: async (input) => {
      const searchTerm = (input.search || '').toLowerCase();
      let allCards = [];
      for (let pg = 0; pg < 8; pg++) {
        const r = await fetch(`https://core-api.getaptly.com/api/board/qfBzBxfooJtfTQncd?page=${pg}&pageSize=50`, {
          headers: { 'x-token': process.env.APTLY_TOKEN }
        });
        if (!r.ok) break;
        const data = await r.json();
        const arr = data.data || [];
        if (!arr.length) break;
        allCards = allCards.concat(arr);
        if (arr.length < 50) break;
      }
      const matches = allCards.filter(c => {
        const cardName = (c.name || '').toLowerCase();
        const unitName = (c.unit?.[0]?.name || '').toLowerCase();
        return cardName.includes(searchTerm.slice(0, 12)) || unitName.includes(searchTerm.slice(0, 12));
      });
      if (!matches.length) return JSON.stringify({ error: `No listing pipeline record found for: ${input.search}` });
      return JSON.stringify({
        property: input.search,
        matches: matches.map(c => ({
          stage: c.stage,
          marketRent: c['AgEYTgLjY4SSd9x6u']?.amount,
          availableDate: c['37tRxzPGRBodPhCXC'] || null,
          dateListed: c['NaCZn5p5gqyZqcYcu'] || null,
          dateOffMarket: c['3TE2fzAtSSoDGGTHy'] || null,
          showingStartDate: c['RtFD6xG89sAFHDeT2'] || null,
          rentReady: c['RZXto58TQ5JPmQQdZ'] ?? null,
          publishedForRent: c['76ohtkqNZdnT3mWS7'] ?? null,
          assignee: c.assignee,
          cardId: c.cardId || c._id
        }))
      });
    }
  },
  {
    name: 'get_published_rentals',
    description: 'Get properties currently published and marketed for rent, sourced from Aptly Units (the actual public listing status), not Rentvine occupancy flags. Use this — not search_vacant_units — when someone asks what is actually available/listed/on the market for rent, since a property can be published for rent while still occupied (upcoming vacancy) or vacant but not yet published.',
    input_schema: {
      type: 'object',
      properties: {
        city: { type: 'string', description: 'Optional city filter' },
        maxRent: { type: 'number', description: 'Optional maximum rent filter' }
      }
    },
    handler: async (input) => {
      let allUnits = [];
      for (let pg = 0; pg < 20; pg++) {
        const r = await fetch(`https://core-api.getaptly.com/api/board/unit?page=${pg}&pageSize=50`, {
          headers: { 'x-token': process.env.APTLY_TOKEN }
        });
        if (!r.ok) break;
        const data = await r.json();
        const arr = data.data || [];
        if (!arr.length) break;
        allUnits = allUnits.concat(arr);
        if (arr.length < 50) break;
      }
      let results = allUnits.filter(u => {
        if (u.publishedForRent !== true) return false;
        if (input.city) {
          const city = (u.city || '').toLowerCase();
          const addr = (u.street || '').toLowerCase();
          if (!city.includes(input.city.toLowerCase()) && !addr.includes(input.city.toLowerCase())) return false;
        }
        if (input.maxRent && parseFloat(u.marketRent?.amount) > input.maxRent) return false;
        return true;
      });
      return JSON.stringify({
        count: results.length,
        published: results.slice(0, 25).map(u => ({
          address: u.street,
          city: u.city,
          rent: u.marketRent?.amount,
          beds: u.beds,
          baths: u.baths,
          availableDate: u.availableDate,
          stage: u.stage
        }))
      });
    }
  },
  {
    name: 'get_lockbox_info',
    description: 'Get the lockbox/access info for a property from Aptly Units — the lockbox type, and CodeBox serial number if applicable. Use this when someone (vendor, tenant, applicant) asks how to access a property or what kind of lockbox is on the door.',
    input_schema: {
      type: 'object',
      properties: {
        search: { type: 'string', description: 'Property address or name to search for' }
      },
      required: ['search']
    },
    handler: async (input) => {
      const searchTerm2 = normalizeAddr(input.search);
      let match = null;
      for (let pg = 0; pg < 20; pg++) {
        const r = await fetch(`https://core-api.getaptly.com/api/board/unit?page=${pg}&pageSize=50`, {
          headers: { 'x-token': process.env.APTLY_TOKEN }
        });
        if (!r.ok) break;
        const data = await r.json();
        const arr = data.data || [];
        if (!arr.length) break;
        match = arr.find(u => {
          const addr = normalizeAddr(u.street || u.marketingName || '');
          return addr.includes(searchTerm2.slice(0, 14)) || searchTerm2.includes(addr.slice(0, 14));
        });
        if (match) break;
        if (arr.length < 50) break;
      }
      if (!match) return JSON.stringify({ error: `Property not found in Aptly: ${input.search}` });
      const lockboxType = match['e3BWJFyzqxxkZJACN'] || null;
      const codeboxSerial = match['j7rvky7itbqrpJH4A'] || null;
      return JSON.stringify({
        address: match.street,
        lockboxType,
        isCodebox: lockboxType === 'Codebox',
        codeboxSerialNumber: lockboxType === 'Codebox' ? codeboxSerial : null,
        aptlyUnitId: match._id || match.id
      });
    }
  }
];

const IVY_TOOLS = TOOL_DEFS.map(({ name, description, input_schema }) => ({ name, description, input_schema }));

async function executeIvyTool(name, input) {
  const tool = TOOL_DEFS.find(t => t.name === name);
  if (!tool) return JSON.stringify({ error: `Unknown tool: ${name}` });
  return await tool.handler(input);
}

module.exports = { IVY_TOOLS, executeIvyTool, TOOL_DEFS };
