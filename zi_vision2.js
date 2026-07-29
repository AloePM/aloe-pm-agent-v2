require('dotenv').config({ path: '/home/randi/aloe-agents/.env' });
const axios = require('axios');
const fs = require('fs');
const ZI_KEY = process.env.ZINSPECTOR_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
if (!ZI_KEY) { console.error('❌ Missing ZINSPECTOR_API_KEY'); process.exit(1); }
if (!ANTHROPIC_KEY) { console.error('❌ Missing ANTHROPIC_API_KEY'); process.exit(1); }
const ZI = axios.create({ baseURL: 'https://portfolio.zinspector.com', headers: { 'x-api-key': ZI_KEY, 'Origin': 'http://localhost' } });
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
const KEYWORDS = { pool:['pool','spa','hot tub','backyard','patio'], kitchen:['kitchen','refrigerator','fridge','dishwasher','stove','range','oven','microwave','appliance'], laundry:['laundry','washer','dryer'], hvac:['hvac','ac unit','air condition','water heater','furnace'] };
function categorize(items) {
  const cats = { pool:[], kitchen:[], laundry:[], hvac:[], other:[] };
  items.forEach(item => {
    if (!item.actions) return;
    item.actions.forEach(a => {
      if (!a.URL) return;
      const txt = JSON.stringify({...a,...item}).toLowerCase();
      const photo = { url: a.URL, area: item.name||item.area||'Unknown', date: item.Date||'', detail: a.detail||'' };
      let placed = false;
      for (const [cat, kws] of Object.entries(KEYWORDS)) {
        if (kws.some(k => txt.includes(k))) { cats[cat].push(photo); placed = true; break; }
      }
      if (!placed) cats.other.push(photo);
    });
  });
  return cats;
}
async function fetchB64(url) {
  try {
    const res = await axios.get(url, { responseType:'arraybuffer', timeout:20000 });
    const ct = res.headers['content-type']||'image/jpeg';
    return { b64: Buffer.from(res.data).toString('base64'), mediaType: ct.includes('png')?'image/png':'image/jpeg' };
  } catch(e) { return null; }
}
async function analyze(photos, address) {
  console.log(`\n🤖  Analyzing ${photos.length} photos with Claude Vision...`);
  const images = [];
  for (const p of photos) {
    process.stdout.write(`   [${p.area}] Fetching...`);
    const img = await fetchB64(p.url);
    if (img) { images.push({...img, area:p.area}); console.log(' ✓'); }
    else console.log(' ✗');
    await sleep(300);
  }
  if (!images.length) return null;
  const content = [];
  images.forEach((img,i) => {
    content.push({ type:'image', source:{ type:'base64', media_type:img.mediaType, data:img.b64 } });
    content.push({ type:'text', text:`Photo ${i+1} — Area: ${img.area}` });
  });
  content.push({ type:'text', text:`Inspection photos from: ${address}\nAnalyze ALL photos. Respond ONLY with valid JSON:\n{"pool_present":true/false/null,"spa_present":true/false/null,"pool_type":"Chlorine/Salt water/Mineral or null","washer_included":true/false/null,"dryer_included":true/false/null,"refrigerator_included":true/false/null,"appliances_visible":[{"type":"","brand":"","color":"White/Black/Stainless/Bisque or null","model_number":"","serial_number":"","condition":"Good/Fair/Poor","notes":""}],"flooring_type":"Tile/Wood/LVP/Carpet/Concrete or null","flooring_color":"","flooring_condition":"Good/Fair/Poor or null","carpet_present":true/false/null,"paint_colors_visible":"","general_notes":""}` });
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
  let items = [], page = 1;
  while (true) {
    const res = await ZI.get('/api/media/', { params:{ Property:propId, page_size:100, page } });
    items.push(...(res.data?.results||[]));
    if (!res.data?.next) break;
    page++; await sleep(300);
  }
  console.log(`\n📸  ${items.length} media items found`);
  const cats = categorize(items);
  console.log('   By category:', Object.entries(cats).map(([k,v])=>`${k}:${v.length}`).join(', '));
  const selected = [...cats.pool.slice(0,3),...cats.kitchen.slice(0,3),...cats.laundry.slice(0,2),...cats.hvac.slice(0,2),...cats.other.slice(0,2)].slice(0,10);
  console.log(`   Selected ${selected.length} targeted photos`);
  const analysis = await analyze(selected, address);
  if (analysis) {
    console.log('\n✅  Results:');
    console.log(JSON.stringify(analysis, null, 2));
    fs.writeFileSync('/tmp/zi_analysis.json', JSON.stringify(analysis, null, 2));
    console.log('\n📋  Summary:');
    console.log(`    Pool: ${analysis.pool_present} | Spa: ${analysis.spa_present}`);
    console.log(`    Washer: ${analysis.washer_included} | Dryer: ${analysis.dryer_included} | Fridge: ${analysis.refrigerator_included}`);
    console.log(`    Flooring: ${analysis.flooring_type} ${analysis.flooring_color}`);
    (analysis.appliances_visible||[]).forEach(a => console.log(`    • ${a.type}: ${a.brand||'?'} | ${a.color||'?'} | Model: ${a.model_number||'n/a'} | Serial: ${a.serial_number||'n/a'}`));
  }
}
main().catch(e => { console.error('Fatal:', e.message); });
