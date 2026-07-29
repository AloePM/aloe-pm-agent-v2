require('dotenv').config({ path: '/home/randi/aloe-agents/.env' });
const axios = require('axios');
const fs = require('fs');
const ZI_KEY = process.env.ZINSPECTOR_API_KEY;
if (!ZI_KEY) { console.error('❌ Missing ZINSPECTOR_API_KEY in .env'); process.exit(1); }
const ZI = axios.create({ baseURL: 'https://portfolio.zinspector.com', headers: { 'x-api-key': ZI_KEY, 'Origin': 'http://localhost' } });
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
async function main() {
  console.log('\n🔍 Zinspector Probe — 35 West 10th Ave');
  console.log('1️⃣  Searching for property...');
  let property;
  try {
    const res = await ZI.get('/api/propertiesCursor/', { params: { search: '35 West 10th', page_size: 5 } });
    const results = res.data?.results || res.data;
    console.log(`   Found ${Array.isArray(results) ? results.length : '?'} result(s)`);
    if (Array.isArray(results) && results.length > 0) {
      property = results[0];
      console.log(`   ✅ Property: ${property.Name || property.name || property.Address || property.address}`);
      console.log(`   ID: ${property.id || property.ID}`);
      console.log(`   Full: ${JSON.stringify(property).slice(0, 400)}`);
    } else {
      const res2 = await ZI.get('/api/propertiesCursor/', { params: { search: '10th', page_size: 10 } });
      console.log(`   Raw: ${JSON.stringify(res2.data).slice(0, 500)}`);
    }
  } catch (e) { console.error(`   ❌ ${e.response?.status} — ${JSON.stringify(e.response?.data).slice(0,300)}`); return; }
  if (!property) return;
  const propId = property.id || property.ID;
  console.log('\n2️⃣  Fetching all media...');
  try {
    const res = await ZI.get('/api/media/', { params: { Property: propId, page_size: 50 } });
    const media = res.data?.results || res.data || [];
    const count = res.data?.count || (Array.isArray(media) ? media.length : '?');
    console.log(`   Total media: ${count}`);
    if (Array.isArray(media) && media.length > 0) {
      console.log(`   Sample: ${JSON.stringify(media[0], null, 2).slice(0, 500)}`);
      const byArea = {};
      media.forEach(m => { const a = m.area || m.Area || 'Unknown'; if (!byArea[a]) byArea[a] = []; byArea[a].push(m); });
      console.log('\n   Photos by area:');
      Object.entries(byArea).forEach(([area, items]) => console.log(`     ${area}: ${items.length}`));
      fs.writeFileSync('/tmp/zi_media.json', JSON.stringify(media, null, 2));
      console.log('\n   💾 Saved to /tmp/zi_media.json');
    }
  } catch (e) { console.error(`   ❌ ${e.response?.status} — ${JSON.stringify(e.response?.data).slice(0,300)}`); }
  await sleep(500);
  console.log('\n3️⃣  Fetching pool-tagged media...');
  try {
    const res = await ZI.get('/api/media/', { params: { Property: propId, area: 'Pool', page_size: 20 } });
    const media = res.data?.results || res.data || [];
    console.log(`   Pool photos: ${Array.isArray(media) ? media.length : res.data?.count || '?'}`);
    if (Array.isArray(media) && media.length > 0) {
      media.forEach(m => {
        const url = m.url || m.URL || m.file || m.image || m.src;
        console.log(`     • ${m.area || ''} / ${m.detail || ''} — ${url?.slice(0,80)}`);
      });
    }
  } catch (e) { console.error(`   ❌ ${e.response?.status} — ${JSON.stringify(e.response?.data).slice(0,300)}`); }
}
main().catch(e => { console.error('Fatal:', e.message); });
