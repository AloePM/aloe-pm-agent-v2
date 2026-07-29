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
    return { b64: Buffer.from(res.data).toString('base64'), mediaType: ct.includes('png') ? 'image/png' : 'image/jpeg' };
  } catch(e) { return null; }
}

async function main() {
  const propId = 1339176;
  const address = '35 West 10th Avenue, Mesa, AZ 85210';
  console.log('\n🏠  Serial Number Extraction — Move In Photos');
  console.log(`    ${address}`);
  console.log('━'.repeat(55));

  // Fetch all media, get Move In activity photos in chronological order
  let items = [], page = 1;
  while (true) {
    const res = await ZI.get('/api/media/', { params: { Property: propId, page_size: 100, page, ordering: 'Date' } });
    items.push(...(res.data?.results || []));
    if (!res.data?.next) break;
    page++; await sleep(300);
  }

  // Get Move In activity photos only, sorted by date/time
  const moveInPhotos = [];
  items.forEach(item => {
    const name = (item.name || '').toLowerCase();
    if (!name.includes('move in') && !name.includes('movein')) return;
    (item.actions || []).forEach(a => {
      if (!a.URL) return;
      moveInPhotos.push({
        url: a.URL,
        activity: item.name,
        detail: a.Detail || 'None',
        area: a.AreaName || 'Unknown',
        datetime: a.TakenDateTime || a.DateTime || '',
        comments: a.Comments || ''
      });
    });
  });

  // Sort by datetime so sticker photos follow their appliance
  moveInPhotos.sort((a,b) => a.datetime.localeCompare(b.datetime));

  console.log(`\n📸  Move In photos: ${moveInPhotos.length} (sorted chronologically)`);
  console.log('\n   Detail tags found:');
  const detailCounts = {};
  moveInPhotos.forEach(p => { detailCounts[p.detail] = (detailCounts[p.detail]||0) + 1; });
  Object.entries(detailCounts).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => console.log(`     ${String(v).padStart(3)}x  ${k}`));

  // Send in batches of 10, chronologically
  // This way sticker photos immediately follow the appliance photos they belong to
  const BATCH = 10;
  const allAppliances = [];

  for (let i = 0; i < Math.min(moveInPhotos.length, 80); i += BATCH) {
    const batch = moveInPhotos.slice(i, i + BATCH);
    console.log(`\n🤖  Batch ${Math.floor(i/BATCH)+1}: photos ${i+1}–${i+batch.length}...`);

    const images = [];
    for (const p of batch) {
      process.stdout.write(`   [${p.detail}]...`);
      const img = await fetchB64(p.url);
      if (img) { images.push({...img, detail: p.detail, area: p.area, comments: p.comments}); console.log('✓'); }
      else console.log('✗');
      await sleep(200);
    }
    if (!images.length) continue;

    const content = [];
    images.forEach((img, i) => {
      content.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.b64 } });
      content.push({ type: 'text', text: `Photo ${i+1} | Detail: ${img.detail} | Area: ${img.area}${img.comments ? ' | Note: '+img.comments : ''}` });
    });

    content.push({ type: 'text', text: `Move-in inspection photos from: ${address}

Photos are in chronological order. A sticker/label photo will appear right after the appliance it belongs to.

IMPORTANT INSTRUCTIONS:
1. If you see a DATA PLATE, LABEL, or STICKER — read EVERY character carefully. These contain model and serial numbers.
2. Serial numbers often start with letters followed by numbers (e.g. XY1234567)
3. Model numbers are usually shorter than serial numbers
4. The appliance in the photo BEFORE the sticker tells you which appliance the sticker belongs to
5. Check EXTERIOR color of dishwasher, washer, dryer — not interior
6. Look for brand names printed on the appliance face/door

For each appliance found, extract ALL visible text from labels.
Respond ONLY with valid JSON:
{
  "appliances": [
    {
      "type": "refrigerator/washer/dryer/dishwasher/microwave/stove/oven/water heater/AC/garbage disposal",
      "brand": "brand name",
      "color": "White/Black/Stainless/Bisque/Slate — EXTERIOR color only",
      "model_number": "EXACT text from label or null",
      "serial_number": "EXACT text from label or null",
      "condition": "Good/Fair/Poor",
      "notes": "any label text, specs, or other details visible"
    }
  ]
}` });

    try {
      const res = await axios.post('https://api.anthropic.com/v1/messages', {
        model: 'claude-sonnet-4-6', max_tokens: 2000,
        messages: [{ role: 'user', content }]
      }, { headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } });

      const parsed = JSON.parse(res.data.content[0].text.replace(/```json|```/g,'').trim());
      if (parsed.appliances?.length) {
        console.log(`   Found ${parsed.appliances.length} appliance(s) in this batch`);
        parsed.appliances.forEach(a => {
          if (a.model_number || a.serial_number) {
            console.log(`   ✅ ${a.type}: Model=${a.model_number||'n/a'} Serial=${a.serial_number||'n/a'}`);
          }
        });
        allAppliances.push(...parsed.appliances);
      }
    } catch(e) { console.error('   Claude error:', e.message); }
    await sleep(500);
  }

  // Deduplicate — keep entry with most data for each type
  const byType = {};
  allAppliances.forEach(a => {
    const existing = byType[a.type];
    if (!existing) { byType[a.type] = a; return; }
    // Keep the one with more data
    const score = o => (o.serial_number?2:0) + (o.model_number?2:0) + (o.brand?1:0);
    if (score(a) > score(existing)) byType[a.type] = a;
  });

  const final = {
    property: address,
    analyzed_at: new Date().toISOString(),
    appliances: Object.values(byType)
  };

  fs.writeFileSync('/tmp/zi_serial.json', JSON.stringify(final, null, 2));
  console.log('\n✅  Final Appliance Data:');
  final.appliances.forEach(a => {
    console.log(`\n  ${a.type.toUpperCase()}`);
    console.log(`    Brand  : ${a.brand || 'not found'}`);
    console.log(`    Color  : ${a.color || 'not found'}`);
    console.log(`    Model  : ${a.model_number || 'not found'}`);
    console.log(`    Serial : ${a.serial_number || 'not found'}`);
    if (a.notes) console.log(`    Notes  : ${a.notes.slice(0,100)}`);
  });
  console.log('\n💾  Saved to /tmp/zi_serial.json');
}
main().catch(e => { console.error('Fatal:', e.message); });
