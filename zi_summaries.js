require('dotenv').config({ path: '/home/randi/aloe-agents/.env' });
const axios = require('axios');
const ZI = axios.create({ baseURL: 'https://portfolio.zinspector.com', headers: { 'x-api-key': process.env.ZINSPECTOR_API_KEY, 'Origin': 'http://localhost' } });

async function main() {
  // Get document IDs for this property first
  console.log('\n=== Documents for 35 West 10th ===');
  const docsRes = await ZI.get('/api/documents/', { params: { Property: 1339176, page_size: 20, completed: true } });
  const docs = docsRes.data?.results || [];
  console.log(`Found ${docs.length} documents`);
  docs.forEach(d => console.log(`  ID:${d.id} UUID:${d.UUID} ${d.Title} | ${d.Activity} | ${d.Date?.slice(0,10)}`));

  // Get summaries for each document
  console.log('\n=== Summaries ===');
  for (const doc of docs) {
    try {
      const res = await ZI.get('/api/document/summary/', { params: { uuid: doc.UUID, page_size: 5 } });
      const summaries = res.data?.results || [];
      if (summaries.length) {
        console.log(`\n--- ${doc.Title} (${doc.Activity}) ---`);
        summaries.forEach(s => {
          // Strip HTML tags for readability
          const text = (s.summary || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
          console.log(text.slice(0, 800));
        });
      }
    } catch(e) { console.log(`  Error for doc ${doc.id}: ${e.response?.status}`); }
  }
}
main().catch(e => console.error(e.message));
