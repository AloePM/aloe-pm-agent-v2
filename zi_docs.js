require('dotenv').config({ path: '/home/randi/aloe-agents/.env' });
const axios = require('axios');
const ZI = axios.create({ baseURL: 'https://portfolio.zinspector.com', headers: { 'x-api-key': process.env.ZINSPECTOR_API_KEY, 'Origin': 'http://localhost' } });

async function main() {
  const res = await ZI.get('/api/documents/', { params: { Property: 1339176, page_size: 50 } });
  const docs = res.data?.results || [];
  console.log(`\nDocuments found: ${docs.length}\n`);
  docs.forEach(d => {
    console.log(`  ${d.Title || d.title || 'Untitled'}`);
    console.log(`    Activity : ${d.Activity || d.activity || 'n/a'}`);
    console.log(`    Date     : ${d.Date || d.date || 'n/a'}`);
    console.log(`    Status   : ${d.Status || d.status || 'n/a'}`);
    console.log(`    PDF      : ${d.PdfUrl || d.pdf_url || d.ReportUrl || 'n/a'}`);
    console.log('');
  });
}
main().catch(e => console.error(e.message));
