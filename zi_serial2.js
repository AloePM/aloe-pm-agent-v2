require('dotenv').config({ path: '/home/randi/aloe-agents/.env' });
const axios = require('axios');
const fs = require('fs');
const ZI_KEY = process.env.ZINSPECTOR_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ZI = axios.create({ baseURL: 'https://portfolio.zinspector.com', headers: { 'x-api-key': ZI_KEY, 'Origin': 'http://localhost' } });
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchB64(url) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
    const ct = res.headers['content-type'] || 'image/jpeg';
    const b64 = Buffer.from(res.data).toString('base64');
    // Skip if too large (over 4MB base64 = ~3MB image)
    if (b64.length > 4000000) { console.log(' [too large, skip]'); return null; }
    return { b64, mediaType: ct.includes('png') ? 'image/png' : 'image/jpeg' };
  } catch(e) { return null; }
}

async function analyzeWithClaude(images, address, batchNum) {
  const content = [];
  images.forEach((img, i) => {
    content.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.b64 } });
    content.push({ type: 'text', text: `Photo ${i+1} | Detail: ${img.detail} | Area: ${img.area}` });
  });
  content.push({ type: 'text', text: `Move-in photos (batch ${batchNum}) from: ${address}

Look carefully at ALL images. Key instructions:
1. If you see a DATA PLATE or STICKER with text — read every character. These are serial/model numbers.
2. Photos are in order — a label photo belongs to the appliance shown just before it.
3. For dishwasher, washer, dryer — report EXTERIOR color (door front), not interior.
4. Brand names appear on the appliance face or on labels.

Respond ONLY with valid JSON. If no appliances found, return {"appliances":[]}:
{
  "appliances": [
    {
      "type": "refrigerator/washer/dryer/dishwasher/microwave/stove/oven/water heater/AC/garbage disposal",
      "brand": "exact brand or null",
      "color": "White/Black/Stainless/Bisque/Slate — exterior only",
      "model_number": "exact from label or null",
      "serial_number": "exact from label or null",
      "notes": "any label text visible"
    }
  ]
}` });

  const res = await axios.post('https://api.anthropic.com/v1/messages', {
    model: 'claude-sonnet-4-6', max_tokens: 1000,
    messages: [{ role: 'user', content }]
  }, { headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } });

  return JSON.parse(res.data.content[0].text.replace(/```json|```/g,'').trim());
}

async function main() {
  const propId = 1339176;
  const address = '35 West 10th Avenue, Mesa, AZ 85210';
  console.log('\n🏠  Serial Number Extraction v2 — 3 photos per batch');
  console.log('━'.repeat(55));

  let items = [], page = 1;
  while (true) {
    const res = await ZI.get('/api/media/', { params: { Property: propId, page_size: 100, page, ordering: 'Date' } });
    items.push(...(res.data?.results || []));
    if (!res.data?.next) break;
    page++; await sleep(300);
  }

  // Get Move In photos in order
  const moveInPhotos = [];
  items.forEach(item => {
    const name = (item.name || '').toLowerCase();
    if (!name.includes('move in') && !name.includes('movein')) return;
    (item.actions || []).forEach(a => {
      if (!a.URL) return;
      moveInPhotos.push({
        url: a.URL,
        detail: a.Detail || 'None',
        area: a.AreaName || 'Unknown',
        datetime: a.TakenDateTime || a.DateTime || ''
      });
    });
  });

  moveInPhotos.sort((a,b) => a.datetime.localeCompare(b.datetime));
  console.log(`\n📸  ${moveInPhotos.length} Move In photos (3 per batch)`);

  const allAppliances = [];
  const BATCH = 3;

  for (let i = 0; i < Math.min(moveInPhotos.length, 60); i += BATCH) {
    const batch = moveInPhotos.slice(i, i + BATCH);
    process.stdout.write(`\nBatch ${Math.floor(i/BATCH)+1} [${batch.map(p=>p.detail).join(', ')}] `);

    const images = [];
    for (const p of batch) {
      const img = await fetchB64(p.url);
      if (img) { images.push({...img, detail:p.detail, area:p.area}); process.stdout.write('✓'); }
      else process.stdout.write('✗');
      await sleep(150);
    }
    if (!images.length) continue;

    try {
      const result = await analyzeWithClaude(images, address, Math.floor(i/BATCH)+1);
      if (result.appliances?.length) {
        const withData = result.appliances.filter(a => a.model_number || a.serial_number || a.brand);
        if (withData.length) {
          process.stdout.write(` → Found: ${withData.map(a=>`${a.type}(M:${a.model_number||'-'} S:${a.serial_number||'-'})`).join(', ')}`);
          allAppliances.push(...result.appliances);
        }
      }
    } catch(e) {
      process.stdout.write(` ❌ ${e.response?.status||e.message}`);
    }
    await sleep(400);
  }

  console.log('\n');

  // Deduplicate — keep best data per type
  const byType = {};
  allAppliances.forEach(a => {
    if (!a.type) return;
    const existing = byType[a.type];
    if (!existing) { byType[a.type] = a; return; }
    const score = o => (o.serial_number?3:0)+(o.model_number?2:0)+(o.brand?1:0);
    if (score(a) > score(existing)) byType[a.type] = a;
  });

  const final = { property: address, analyzed_at: new Date().toISOString(), appliances: Object.values(byType) };
  fs.writeFileSync('/tmp/zi_serial.json', JSON.stringify(final, null, 2));

  console.log('✅  Results:');
  final.appliances.forEach(a => {
    console.log(`\n  ${a.type.toUpperCase()}: ${a.brand||'?'} | ${a.color||'?'}`);
    console.log(`    Model  : ${a.model_number||'not found'}`);
    console.log(`    Serial : ${a.serial_number||'not found'}`);
    if (a.notes) console.log(`    Notes  : ${a.notes.slice(0,120)}`);
  });
  console.log('\n💾  Saved to /tmp/zi_serial.json');
}
main().catch(e => { console.error('Fatal:', e.message); });
