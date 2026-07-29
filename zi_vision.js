require('dotenv').config({ path: '/home/randi/aloe-agents/.env' });
const axios = require('axios');
const fs = require('fs');
const ZI_KEY = process.env.ZINSPECTOR_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
if (!ZI_KEY) { console.error('❌ Missing ZINSPECTOR_API_KEY'); process.exit(1); }
if (!ANTHROPIC_KEY) { console.error('❌ Missing ANTHROPIC_API_KEY'); process.exit(1); }
const ZI = axios.create({ baseURL: 'https://portfolio.zinspector.com', headers: { 'x-api-key': ZI_KEY, 'Origin': 'http://localhost' } });
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function extractUrls(item) {
  const urls = [];
  if (item.actions && Array.isArray(item.actions)) {
    item.actions.forEach(a => { if (a.URL) urls.push({ url: a.URL, area: item.name || item.area || 'Unknown' }); });
  }
  return urls;
}
async function fetchImageBase64(url) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    const b64 = Buffer.from(res.data).toString('base64');
    const ct = res.headers['content-type'] || 'image/jpeg';
    return { b64, mediaType: ct.includes('png') ? 'image/png' : 'image/jpeg' };
  } catch (e) { console.log(`   ⚠️  Could not fetch: ${e.message}`); return null; }
}
async function analyzePhotos(photos, address) {
  console.log(`\n🤖  Sending ${Math.min(photos.length, 5)} photos to Claude Vision...`);
  const images = [];
  for (const p of photos.slice(0, 5)) {
    console.log(`   Fetching: ${p.url.slice(0, 70)}...`);
    const img = await fetchImageBase64(p.url);
    if (img) images.push({ ...img, area: p.area });
    await sleep(500);
  }
  if (!images.length) { console.log('   ❌ No images fetched'); return null; }
  const content = [];
  images.forEach((img, i) => {
    content.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.b64 } });
    content.push({ type: 'text', text: `Image ${i+1} (area: ${img.area})` });
  });
  content.push({ type: 'text', text: `Inspection photos from: ${address}\n\nAnalyze ALL images and respond ONLY with valid JSON:\n{\n  "pool_present": true/false/null,\n  "spa_present": true/false/null,\n  "appliances_visible": [{"type":"","brand":"","color":"","model_number":"","serial_number":"","notes":""}],\n  "washer_included": true/false/null,\n  "dryer_included": true/false/null,\n  "refrigerator_included": true/false/null,\n  "paint_colors_visible": "description or null",\n  "flooring_visible": "description or null",\n  "general_notes": "any other details"\n}` });
  try {
    const res = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-6', max_tokens: 1500,
      messages: [{ role: 'user', content }]
    }, { headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } });
    const text = res.data.content[0].text;
    return JSON.parse(text.replace(/```json|```/g, '').trim());
  } catch (e) { console.error('   ❌ Claude error:', e.response?.data?.error?.message || e.message); return null; }
}
async function main() {
  const propId = 1339176;
  const address = '35 West 10th Avenue, Mesa, AZ 85210';
  console.log('\n🏠  Zinspector Vision Analysis');
  console.log(`    ${address}`);
  console.log('━'.repeat(55));
  const res = await ZI.get('/api/media/', { params: { Property: propId, page_size: 100 } });
  const items = res.data?.results || [];
  console.log(`\n📸  Found ${items.length} media items`);
  const photos = [];
  items.forEach(item => photos.push(...extractUrls(item)));
  console.log(`    Extracted ${photos.length} photo URLs`);
  photos.slice(0, 3).forEach((p, i) => console.log(`    ${i+1}. ${p.url.slice(0, 80)}`));
  const analysis = await analyzePhotos(photos, address);
  if (analysis) {
    console.log('\n✅  Results:');
    console.log(JSON.stringify(analysis, null, 2));
    fs.writeFileSync('/tmp/zi_analysis.json', JSON.stringify(analysis, null, 2));
    console.log('\n💾  Saved to /tmp/zi_analysis.json');
  }
}
main().catch(e => { console.error('Fatal:', e.message); });
