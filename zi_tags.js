require('dotenv').config({ path: '/home/randi/aloe-agents/.env' });
const axios = require('axios');
const ZI = axios.create({ baseURL: 'https://portfolio.zinspector.com', headers: { 'x-api-key': process.env.ZINSPECTOR_API_KEY, 'Origin': 'http://localhost' } });

async function main() {
  const res = await ZI.get('/api/media/', { params: { Property: 1339176, page_size: 500 } });
  const items = res.data?.results || [];
  console.log(`\nTotal media items: ${items.length}`);

  // Show every unique area + detail combination across all actions
  const tags = new Map();
  items.forEach(item => {
    (item.actions || []).forEach(a => {
      const area = a.area || a.Area || item.name || 'Unknown';
      const detail = a.detail || a.Detail || a.name || '';
      const key = `${area} → ${detail}`;
      if (!tags.has(key)) tags.set(key, { area, detail, sample: a.URL, count: 0 });
      tags.get(key).count++;
    });
  });

  console.log(`\nUnique area/detail combinations (${tags.size} total):\n`);
  [...tags.entries()]
    .sort((a,b) => b[1].count - a[1].count)
    .forEach(([key, val]) => {
      console.log(`  ${String(val.count).padStart(3)}x  ${key}`);
    });

  // Also show raw structure of first action with detail
  const withDetail = items.flatMap(i => (i.actions||[]).filter(a => a.detail || a.Detail)).slice(0,3);
  if (withDetail.length) {
    console.log('\nSample action with detail:');
    console.log(JSON.stringify(withDetail[0], null, 2));
  }
}
main().catch(e => console.error(e.message));
