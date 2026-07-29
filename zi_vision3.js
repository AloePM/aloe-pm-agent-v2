require('dotenv').config({ path: '/home/randi/aloe-agents/.env' });
const axios = require('axios');
const fs = require('fs');
const ZI_KEY = process.env.ZINSPECTOR_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
if (!ZI_KEY) { console.error('❌ Missing ZINSPECTOR_API_KEY'); process.exit(1); }
if (!ANTHROPIC_KEY) { console.error('❌ Missing ANTHROPIC_API_KEY'); process.exit(1); }
const ZI = axios.create({ baseURL: 'https://portfolio.zinspector.com', headers: { 'x-api-key': ZI_KEY, 'Origin': 'http://localhost' } });
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Activity types that have useful photos
const MARKETING_TYPES = ['marketing','listing','leasing','move in ready','vacant'];
const MOVEIN_TYPES = ['move in','move-in','movein','move_in','initial','onboarding','setup'];

function selectPhotos(items) {
  const marketing = [], moveIn = [], other = [];
  items.forEach(item => {
    if (!item.actions) return;
    const name = (item.name || '').toLowerCase();
    const isMarketing = MARKETING_TYPES.some(t => name.includes(t));
    const isMoveIn = MOVEIN_TYPES.some(t => name.includes(t));
    item.actions.forEach(a => {
      if (!a.URL) return;
      const photo = { url: a.URL, area: item.name || 'Unknown', date: item.Date || '' };
      if (isMarketing) marketing.push(photo);
      else if (isMoveIn) moveIn.push(photo);
      else other.push(photo);
    });
  });
  console.log(`\n   Activity breakdown:`);
  console.log(`     Marketing/Listing : ${marketing.length} photos`);
  console.log(`     Move In           : ${moveIn.length} photos`);
  console.log(`     Other             : ${other.length} photos`);
  // Show all activity names found
  const names = [...new Set(items.map(i => i.name).filter(Boolean))];
  console.log(`\n   Activity types in this property: ${names.join(', ')}`);
  // Select: up to 5 marketing (for pool/exterior), up to 5 move-in (for appliances/serials)
  const spread = (arr, n) => { if (arr.length <= n) return arr; const step = Math.floor(arr.length/n); return Array.from({length:n}, (_,i) => arr[i*step]); }; return { marketing: marketing.slice(0,5), moveIn: spread(moveIn, 10), other: other.slice(0,3) };
}

async function fetchB64(url) {
  try {
    const res = await axios.get(url, { responseType:'arraybuffer', timeout:20000 });
    const ct = res.headers['content-type']||'image/jpeg';
    return { b64: Buffer.from(res.data).toString('base64'), mediaType: ct.includes('png')?'image/png':'image/jpeg' };
  } catch(e) { return null; }
}

async function analyzeSet(photos, address, purpose) {
  if (!photos.length) { console.log(`   No ${purpose} photos to analyze`); return null; }
  console.log(`\n🤖  Analyzing ${photos.length} ${purpose} photos...`);
  const images = [];
  for (const p of photos) {
    process.stdout.write(`   [${p.area}] ...`);
    const img = await fetchB64(p.url);
    if (img) { images.push({...img, area:p.area}); console.log('✓'); }
    else console.log('✗');
    await sleep(300);
  }
  if (!images.length) return null;
  const content = [];
  images.forEach((img,i) => {
    content.push({ type:'image', source:{ type:'base64', media_type:img.mediaType, data:img.b64 } });
    content.push({ type:'text', text:`Photo ${i+1} (${img.area})` });
  });

  const prompt = purpose === 'marketing'
    ? `These are MARKETING/LISTING photos of rental property: ${address}\nLook for: pool, spa, exterior features, flooring, paint colors, general condition.\nRespond ONLY with valid JSON:\n{"pool_present":true/false/null,"spa_present":true/false/null,"pool_type":"Chlorine/Salt water/Mineral or null","flooring_type":"Tile/Wood/LVP/Carpet/Concrete or null","flooring_color":"","carpet_present":true/false/null,"paint_colors_visible":"describe colors seen or null","exterior_notes":"describe exterior features","general_notes":""}`
    : `These are MOVE-IN inspection photos of rental property: ${address}\nLook for: appliance brands, colors, model numbers, serial numbers on labels. Check inside laundry areas, kitchen, garage.\nRespond ONLY with valid JSON:\n{"appliances_visible":[{"type":"refrigerator/washer/dryer/dishwasher/microwave/stove/oven/AC unit/water heater/garbage disposal","brand":"exact brand or null","color":"White/Black/Stainless/Bisque/Slate or null","model_number":"exact if visible or null","serial_number":"exact if visible on label or null","condition":"Good/Fair/Poor","notes":""}],"washer_included":true/false/null,"dryer_included":true/false/null,"refrigerator_included":true/false/null,"general_notes":""}`;

  content.push({ type:'text', text: prompt });
  try {
    const res = await axios.post('https://api.anthropic.com/v1/messages', {
      model:'claude-sonnet-4-6', max_tokens:2000,
      messages:[{ role:'user', content }]
    }, { headers:{ 'x-api-key':ANTHROPIC_KEY, 'anthropic-version':'2023-06-01', 'content-type':'application/json' } });
    return JSON.parse(res.data.content[0].text.replace(/```json|```/g,'').trim());
  } catch(e) { console.error('Claude error:', e.response?.data?.error?.message||e.message); return null; }
}

async function main() {
  const propId = 1339176;
  const address = '35 West 10th Avenue, Mesa, AZ 85210';
  console.log('\n🏠  Smart Vision Analysis —', address);
  console.log('━'.repeat(55));

  // Fetch all media
  let items = [], page = 1;
  while (true) {
    const res = await ZI.get('/api/media/', { params:{ Property:propId, page_size:100, page } });
    items.push(...(res.data?.results||[]));
    if (!res.data?.next) break;
    page++; await sleep(300);
  }
  console.log(`\n📸  ${items.length} total media items`);

  const { marketing, moveIn, other } = selectPhotos(items);

  // Analyze marketing photos for pool/exterior
  const marketingResults = await analyzeSet(marketing, address, 'marketing');

  // Analyze move-in photos for appliances/serials
  const moveInResults = await analyzeSet(moveIn, address, 'move-in');

  // If neither found, try other
  const otherResults = (!marketing.length && !moveIn.length)
    ? await analyzeSet(other, address, 'other')
    : null;

  // Combine results
  const combined = {
    property: address,
    ...(marketingResults || {}),
    ...(moveInResults || {}),
    ...(otherResults || {}),
  };

  console.log('\n✅  Combined Results:');
  console.log(JSON.stringify(combined, null, 2));
  fs.writeFileSync('/tmp/zi_analysis.json', JSON.stringify(combined, null, 2));
  console.log('\n💾  Saved to /tmp/zi_analysis.json');

  console.log('\n📋  Summary:');
  console.log(`    Pool: ${combined.pool_present ?? 'unknown'} | Spa: ${combined.spa_present ?? 'unknown'}`);
  console.log(`    Washer: ${combined.washer_included ?? 'unknown'} | Dryer: ${combined.dryer_included ?? 'unknown'} | Fridge: ${combined.refrigerator_included ?? 'unknown'}`);
  console.log(`    Flooring: ${combined.flooring_type ?? 'unknown'} — ${combined.flooring_color ?? ''}`);
  (combined.appliances_visible||[]).forEach(a =>
    console.log(`    • ${a.type}: ${a.brand||'?'} | ${a.color||'?'} | Model: ${a.model_number||'n/a'} | Serial: ${a.serial_number||'n/a'}`)
  );
}
main().catch(e => { console.error('Fatal:', e.message); });
