require('dotenv').config({ path: '/home/randi/aloe-agents/.env' });
const express = require('express');
const https = require('https');
const app = express();
app.use(express.json());

const APTLY_TOKEN = 'oSWZZYDMlRZjUmnp6qb4yCr3EW3yKRO9Atns2VCANso=';
const HUB_SECRET = process.env.HUB_INTERNAL_SECRET || 'aloe-hub-ari-2026';

const auth = (req, res, next) => {
  const t = req.headers['x-hub-token'] || req.headers['x-agent-key'];
  if (t !== HUB_SECRET) return res.status(401).json({ error: 'Unauthorized' });
  next();
};

function aptlyPost(path, body) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify(body);
    const req = https.request({
      hostname: 'core-api.getaptly.com',
      path, method: 'POST',
      headers: { 'x-token': APTLY_TOKEN, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
    }, r => { let d=''; r.on('data', c=>d+=c); r.on('end', ()=>resolve(JSON.parse(d))); });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

function aptlyGet(path) {
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'core-api.getaptly.com',
      path, method: 'GET',
      headers: { 'x-token': APTLY_TOKEN }
    }, r => { let d=''; r.on('data', c=>d+=c); r.on('end', ()=>resolve(JSON.parse(d))); });
    req.on('error', reject);
    req.end();
  });
}

// Search cards
app.get('/api/aptly/cards/search', auth, async (req, res) => {
  try {
    const q = req.query.query || '';
    const stage = req.query.stage || '';
    const d = await aptlyGet(`/api/board/workOrder?page=0&pageSize=50&search=${encodeURIComponent(q)}&name=${encodeURIComponent(q)}`);
    const cards = Array.isArray(d) ? d : (d.data||[]);
    const items = cards
      .filter(c => !stage || c.stage === stage)
      .map(c => ({
        id: c._id, title: c.name||'', stage: c.stage||'', priority: c.priority||'',
        address: c.unit?.[0]?.name||c.location?.[0]?.name||'', description: c.description||''
      }));
    res.json({ items });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Get card
app.get('/api/aptly/cards/:id', auth, async (req, res) => {
  try {
    const d = await aptlyGet(`/api/board/workOrder/${req.params.id}`);
    const c = d.data || d;
    res.json({ id: c._id, title: c.name||'', stage: c.stage||'', priority: c.priority||'',
      description: c.description||'', unit: c.unit, location: c.location,
      vendor: c.vendor, issueType: c.nfEujqs3ujMNgMFom,
      maintenanceNotes: c.F26dyKdxBuz56YTPA||'',
      homeWarranty: c['3PvcEJoFBQLnjHnd6']||'',
      rentvineStatus: c.rentvineStatus||'' });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Update card
app.post('/api/aptly/cards/:id', auth, async (req, res) => {
  try {
    const { field_name, value } = req.body;
    const fieldMap = { 'issue type': 'nfEujqs3ujMNgMFom', 'maintenance category': 'nfEujqs3ujMNgMFom',
      'home warranty': '3PvcEJoFBQLnjHnd6', 'stage': 'stage', 'priority': 'priority' };
    const key = fieldMap[field_name?.toLowerCase()] || field_name;
    const body = { _id: req.params.id };
    body[key] = value;
    const d = await aptlyPost('/api/board/workOrder', body);
    res.json({ success: true, data: d });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Add comment
app.post('/api/aptly/cards/:id/comment', auth, async (req, res) => {
  try {
    const d = await aptlyPost(`/api/board/workOrder/${req.params.id}/comment`, { content: req.body.content });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Vendor search
app.get('/api/aptly/vendor-search', auth, async (req, res) => {
  try {
    const name = req.query.name || '';
    let all = [];
    for (let pg = 0; pg < 50; pg++) {
      const d = await aptlyGet(`/api/contacts?page=${pg}&pageSize=200`);
      const items = Array.isArray(d) ? d : (d.data||[]);
      if (!items.length) break;
      all = all.concat(items.filter(c => (c.contactType||'').toLowerCase().includes('vendor')));
      if (items.length < 200) break;
    }
    const contacts = all.filter(c => (c.fullname||'').toLowerCase().includes(name.toLowerCase()));
    const extractPhone = c => Array.isArray(c.phone) ? c.phone.map(p=>p.number||p).join(', ') : (c.phone||'');
    res.json({ contacts: contacts.map(c => ({ _id: c._id, name: c.fullname, type: c.contactType, phone: extractPhone(c), email: Array.isArray(c.email)?c.email[0]:c.email })) });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Aptlet lookup
app.get('/api/aptly/aptlet-lookup', auth, async (req, res) => {
  try {
    const q = req.query.q || '';
    const houseNum = q.trim().split(' ')[0];
    let found = null;
    for (let pg = 0; pg < 10 && !found; pg++) {
      const d = await aptlyGet(`/api/board/workOrder?page=${pg}&pageSize=100`);
      const cards = Array.isArray(d) ? d : (d.data||[]);
      if (!cards.length) break;
      for (const c of cards) {
        if ((c.name||'').includes(houseNum) && c.unit?.[0]?._id) {
          const bldgId = c.location?.[0]?._id;
          let portfolioId=null, portfolioName=null, portfolioDuogram=null, owners=[];
          if (bldgId) {
            const b = await aptlyGet(`/api/board/location/${bldgId}`);
            const bldg = b.data||b;
            portfolioId = bldg.portfolio?.[0]?._id;
            portfolioName = bldg.portfolio?.[0]?.name;
            portfolioDuogram = bldg.portfolio?.[0]?.duogram;
            owners = bldg.owners||[];
          }
          found = { unit_aptly_id: c.unit[0]._id, unit_aptly_name: c.unit[0].name, unit_aptly_duogram: c.unit[0].duogram,
            building_aptly_id: bldgId, building_aptly_name: c.location?.[0]?.name, building_aptly_duogram: c.location?.[0]?.duogram,
            portfolio_aptly_id: portfolioId, portfolio_aptly_name: portfolioName, portfolio_aptly_duogram: portfolioDuogram, owners };
          break;
        }
      }
    }
    res.json(found || { unit_aptly_id: null, building_aptly_id: null });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Create WO
app.post('/api/ari/create-work-order', auth, async (req, res) => {
  try {
    const b = req.body;
    const cardBody = { name: b.unitName||b.locationName||'New Work Order', description: b.description||'',
      stage: b.stage||'Internal Work Order Request', priority: b.priority||'Med', source: 'Staff',
      isSharedWithTenant: b.isSharedWithTenant||false, isSharedWithOwner: b.isSharedWithOwner||false };
    if (b.unitId) cardBody.unit = [{ _id: b.unitId, name: b.unitName||'', duogram: b.unitDuogram||'' }];
    if (b.locationId) cardBody.location = [{ _id: b.locationId, name: b.locationName||'', duogram: b.locationDuogram||'' }];
    if (b.portfolioId) cardBody.portfolio = [{ _id: b.portfolioId, name: b.portfolioName||'', duogram: b.portfolioDuogram||'' }];
    if (b.ownerContacts?.length) cardBody.ownerContacts = b.ownerContacts;
    const d = await aptlyPost('/api/board/workOrder', cardBody);
    const cardId = d.data?._id || d._id;
    res.json({ _id: cardId, cardId });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Dispatch vendor
app.post('/api/ari/dispatch-vendor', auth, async (req, res) => {
  try {
    const { cardId, vendorId, homeWarranty='No', isReassign=false } = req.body;
    const body = { _id: cardId, vendor: [{ _id: vendorId }], '3PvcEJoFBQLnjHnd6': homeWarranty };
    if (isReassign) body['39gNjdkmpFpoPLzth'] = true;
    await aptlyPost('/api/board/workOrder', body);
    res.json({ success: true, vendorId });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Property lookup
app.get('/api/rentvine/property-lookup', auth, async (req, res) => {
  try {
    const q = req.query.q || '';
    const houseNum = q.trim().split(' ')[0];
    const RENTVINE_AUTH = Buffer.from('2586bdded08f499bb2057e373fd662f7:81f3aa4cb0434162aab8a27702f089b8').toString('base64');
    const r = await new Promise((resolve, reject) => {
      const req2 = https.request({
        hostname: 'aloepm.rentvine.com', path: `/api/manager/properties?search=${encodeURIComponent(houseNum)}&pageSize=10`,
        headers: { 'Authorization': `Basic ${RENTVINE_AUTH}`, 'X-Rentvine-Account': 'aloepm' }
      }, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>resolve(JSON.parse(d))); });
      req2.on('error', reject); req2.end();
    });
    const items = r.data||[];
    const props = items.map(p => ({ propertyId: p.propertyID, address: p.address, city: p.city, state: p.state, zip: p.zip }));
    res.json({ properties: props });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// SMS
app.post('/api/quo/send-sms', auth, async (req, res) => {
  try {
    const { to, content, message } = req.body;
    const QUO_TOKEN = process.env.QUO_API_KEY || '';
    const r = await new Promise((resolve, reject) => {
      const data = JSON.stringify({ to: Array.isArray(to)?to:[to], content: content||message, phoneNumberId: 'PNRRARIpQO' });
      const req2 = https.request({
        hostname: 'api.quo.com', path: '/v1/messages', method: 'POST',
        headers: { 'Authorization': `Bearer ${QUO_TOKEN}`, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) }
      }, r => { let d=''; r.on('data',c=>d+=c); r.on('end',()=>resolve(JSON.parse(d))); });
      req2.on('error', reject); req2.write(data); req2.end();
    });
    res.json({ success: true });
  } catch(e) { res.status(500).json({ error: e.message }); }
});

// Kat building lookup
app.get('/api/kat/building-lookup', auth, async (req, res) => {
  try {
    const q = req.query.q || '';
    const houseNum = q.trim().split(' ')[0];
    let result = { unit_aptly_id: null, building_aptly_id: null };
    for (let pg = 0; pg < 10 && !result.building_aptly_id; pg++) {
      const d = await aptlyGet(`/api/board/location?page=${pg}&pageSize=100&search=${encodeURIComponent(houseNum)}`);
      const bldgs = Array.isArray(d) ? d : (d.data||[]);
      if (!bldgs.length) break;
      for (const b of bldgs) {
        const addr = (b.address?.address||b.name||'').toLowerCase();
        if (addr.includes(houseNum.toLowerCase())) {
          result = { building_aptly_id: b._id, building_aptly_name: b.address?.formattedAddress||'',
            building_aptly_duogram: b.duogram||'',
            unit_aptly_id: b.units?.[0]?._id||null, unit_aptly_name: b.units?.[0]?.name||'', unit_aptly_duogram: b.units?.[0]?.duogram||'' };
          break;
        }
      }
      if (bldgs.length < 100) break;
    }
    res.json(result);
  } catch(e) { res.status(500).json({ error: e.message }); }
});

app.get('/api/health', (req, res) => res.json({ ok: true, service: 'mini-hub' }));

app.listen(3002, () => console.log('Mini Hub running on port 3002'));

// Knowledge routes - serve from GCS (no auth required)
const { execSync } = require('child_process');
app.get('/api/agents/knowledge/shared', (req, res) => {
  try {
    const text = execSync('gsutil cat gs://aloe-hub-data-496300/knowledge/shared.md', { timeout: 10000 }).toString();
    res.json({ content: text });
  } catch(e) { res.json({ content: '' }); }
});
app.get('/api/agents/knowledge/:agent', (req, res) => { // no auth
  try {
    const text = execSync(`gsutil cat gs://aloe-hub-data-496300/knowledge/${req.params.agent}.md`, { timeout: 10000 }).toString();
    res.json({ content: text });
  } catch(e) { res.json({ content: '' }); }
});
app.post('/api/agents/playbook-save', (req, res) => { res.json({ ok: true }); }); // no auth
