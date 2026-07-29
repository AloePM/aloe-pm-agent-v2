require('dotenv').config({ path: '/home/randi/aloe-agents/.env' });
const axios = require('axios');
const ZI = axios.create({ baseURL: 'https://portfolio.zinspector.com', headers: { 'x-api-key': process.env.ZINSPECTOR_API_KEY, 'Origin': 'http://localhost' } });
async function main() {
  console.log('\n=== zData for 35 West 10th ===');
  try {
    const res = await ZI.get('/api/zdata/1339176/');
    console.log(JSON.stringify(res.data, null, 2));
  } catch(e) { console.log('zData error:', e.response?.status, JSON.stringify(e.response?.data)); }
  console.log('\n=== Document Summaries ===');
  try {
    const res = await ZI.get('/api/document/summary/', { params: { page_size: 10 } });
    console.log(JSON.stringify(res.data, null, 2).slice(0, 2000));
  } catch(e) { console.log('Summary error:', e.response?.status, JSON.stringify(e.response?.data)); }
  console.log('\n=== Property With Areas + zData ===');
  try {
    const res = await ZI.get('/api/propertiesWithAreas/1339176/');
    console.log(JSON.stringify(res.data, null, 2).slice(0, 3000));
  } catch(e) { console.log('Areas error:', e.response?.status, JSON.stringify(e.response?.data)); }
}
main().catch(e => console.error(e.message));
