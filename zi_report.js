require('dotenv').config({ path: '/home/randi/aloe-agents/.env' });
const axios = require('axios');
const ZI = axios.create({ baseURL: 'https://portfolio.zinspector.com', headers: { 'x-api-key': process.env.ZINSPECTOR_API_KEY, 'Origin': 'http://localhost' } });
const fs = require('fs');

async function main() {
  // Fetch all 4 reports for 35 West 10th
  const reports = [
    { title: 'Tenant Move In', url: 'https://portfolio.zinspector.com/api/document/getShareReport/9LdjqV4zxn57qzGbtDnE1XaK0WAYpPo6' },
  ];

  // Also get the other doc shareable URLs
  console.log('\nFetching all documents for share URLs...');
  const docsRes = await ZI.get('/api/documents/', { params: { Property: 1339176, page_size: 20 } });
  const docs = docsRes.data?.results || [];
  docs.forEach(d => {
    console.log(`${d.Title}: ${d.shareable_raw_html_url}`);
    if (d.shareable_raw_html_url) reports.push({ title: d.Title, url: d.shareable_raw_html_url });
  });

  // Fetch and extract text from each report
  for (const report of reports) {
    console.log(`\n=== ${report.title} ===`);
    try {
      const res = await axios.get(report.url, { timeout: 15000 });
      const html = res.data;
      // Strip HTML tags and extract readable text
      const text = html
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/&amp;/g, '&')
        .replace(/\s+/g, ' ')
        .trim();
      
      // Save full text
      fs.writeFileSync(`/tmp/report_${report.title.replace(/\s+/g,'_')}.txt`, text);
      console.log(`Saved ${text.length} chars`);
      
      // Look for appliance keywords
      const lower = text.toLowerCase();
      const keywords = ['refrigerator','washer','dryer','dishwasher','microwave','stove','oven','ac unit','water heater','pool','serial','model'];
      keywords.forEach(kw => {
        const idx = lower.indexOf(kw);
        if (idx !== -1) {
          console.log(`\n  Found "${kw}" at pos ${idx}:`);
          console.log('  ' + text.slice(Math.max(0, idx-50), idx+150));
        }
      });
    } catch(e) { console.log('Error:', e.message); }
  }
}
main().catch(e => console.error(e.message));
