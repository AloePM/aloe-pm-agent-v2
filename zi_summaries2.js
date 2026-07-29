require('dotenv').config({ path: '/home/randi/aloe-agents/.env' });
const axios = require('axios');
const ZI = axios.create({ baseURL: 'https://portfolio.zinspector.com', headers: { 'x-api-key': process.env.ZINSPECTOR_API_KEY, 'Origin': 'http://localhost' } });

async function main() {
  // Try fetching summaries different ways
  const docIds = [3454458, 3439947, 2720397, 2452265];
  const docUUIDs = ['2175105262424945317','3175010201724264300','3172512923992248740','3171609229685826147'];

  // Try 1: by document ID
  console.log('\n--- Try by document field ---');
  try {
    const res = await ZI.get('/api/document/summary/', { params: { document: 2720397, page_size: 5 } });
    console.log(JSON.stringify(res.data, null, 2).slice(0, 1000));
  } catch(e) { console.log('Error:', e.response?.status, JSON.stringify(e.response?.data)); }

  // Try 2: get all summaries unfiltered
  console.log('\n--- All summaries page 1 ---');
  try {
    const res = await ZI.get('/api/document/summary/', { params: { page_size: 5 } });
    const results = res.data?.results || [];
    console.log(`Total summaries: ${res.data?.count}`);
    results.forEach(s => {
      const text = (s.summary||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
      console.log(`\nDoc: ${s.document} | Type: ${s.summary_type}`);
      console.log(text.slice(0, 400));
    });
  } catch(e) { console.log('Error:', e.response?.status, JSON.stringify(e.response?.data)); }

  // Try 3: get individual document detail which may include summary
  console.log('\n--- Individual document detail ---');
  try {
    const res = await ZI.get('/api/documents/2720397/');
    console.log(JSON.stringify(res.data, null, 2).slice(0, 2000));
  } catch(e) { console.log('Error:', e.response?.status, JSON.stringify(e.response?.data)); }

  // Try 4: document activity panel
  console.log('\n--- Document activity panel ---');
  try {
    const res = await ZI.get('/api/documents/2720397/activity-panel/');
    console.log(JSON.stringify(res.data, null, 2).slice(0, 2000));
  } catch(e) { console.log('Error:', e.response?.status, JSON.stringify(e.response?.data)); }
}
main().catch(e => console.error(e.message));
