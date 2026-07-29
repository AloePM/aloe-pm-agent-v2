const axios = require('axios');
const key = process.env.ZINSPECTOR_API_KEY;
console.log('Key starts with:', key?.slice(0,10));
const attempts = [
  { label: 'x-api-key only',              headers: { 'x-api-key': key } },
  { label: 'x-api-key + Origin localhost', headers: { 'x-api-key': key, 'Origin': 'http://localhost' } },
  { label: 'x-api-key + Origin aloepm',   headers: { 'x-api-key': key, 'Origin': 'https://aloepm.rentvine.com' } },
  { label: 'Authorization Bearer',         headers: { 'Authorization': `Bearer ${key}` } },
];
async function main() {
  for (const a of attempts) {
    try {
      const res = await axios.get('https://portfolio.zinspector.com/api/propertiesCursor/', {
        headers: a.headers, params: { page_size: 1 }
      });
      console.log(`✅ ${a.label} — HTTP ${res.status}`);
      console.log('   Response:', JSON.stringify(res.data).slice(0,200));
    } catch (e) {
      console.log(`❌ ${a.label} — ${e.response?.status}: ${JSON.stringify(e.response?.data).slice(0,100)}`);
    }
  }
}
main();
