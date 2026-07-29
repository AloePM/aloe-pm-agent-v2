require('dotenv').config({ path: '/home/randi/aloe-agents/.env' });
const axios = require('axios');
const fs = require('fs');
const ZI_KEY = process.env.ZINSPECTOR_API_KEY;
const ANTHROPIC_KEY = process.env.ANTHROPIC_API_KEY;
const ZI = axios.create({ baseURL: 'https://portfolio.zinspector.com', headers: { 'x-api-key': ZI_KEY, 'Origin': 'http://localhost' } });
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// Target these detail tags — most likely to have serial/model stickers
const APPLIANCE_DETAILS = [
  'refrigerator','oven','oven/microwave','microwave','dishwasher',
  'washer','dryer','washing machine','water heater','hvac','ac',
  'garbage disposal','appliance'
];
// Target these activity types for appliance photos
const GOOD_ACTIVITIES = ['move in','inspection','tenant move in','tenant inspection'];

function selectPhotos(items) {
  const targeted = [];   // photos with appliance detail tags
  const inspection = []; // general inspection photos (may have sticker shots)
  const marketing = [];  // marketing photos (pool/exterior)

  items.forEach(item => {
    const activity = (item.name || '').toLowerCase();
    const isInspection = GOOD_ACTIVITIES.some(a => activity.includes(a));
    const isMarketing = activity.includes('marketing') || activity.includes('listing');

    (item.actions || []).forEach(a => {
      if (!a.URL) return;
      const detail = (a.Detail || '').toLowerCase();
      const photo = {
        url: a.URL,
        activity: item.name || 'Unknown',
        detail: a.Detail || 'None',
        area: a.AreaName || 'Unknown',
        date: a.DateTime || '',
        comments: a.Comments || ''
      };

      if (isMarketing) {
        marketing.push(photo);
      } else if (APPLIANCE_DETAILS.some(d => detail.includes(d))) {
        targeted.push(photo);
      } else if (isInspection) {
        inspection.push(photo);
      }
    });
  });

  console.log(`\n   Targeted appliance photos : ${targeted.length}`);
  console.log(`   General inspection photos : ${inspection.length}`);
  console.log(`   Marketing photos          : ${marketing.length}`);

  // Show what targeted photos we found
  if (targeted.length) {
    console.log('\n   Targeted appliance tags found:');
    const seen = new Set();
    targeted.forEach(p => {
      const key = `${p.activity} → ${p.detail}`;
      if (!seen.has(key)) { seen.add(key); console.log(`     • ${key}`); }
    });
  }

  // Spread across inspection photos to catch sticker shots
  const step = Math.max(1, Math.floor(inspection.length / 15));
  const inspectionSample = inspection.filter((_,i) => i % step === 0).slice(0, 15);

  return {
    targeted,
    inspectionSample,
    marketing: marketing.slice(0, 5)
  };
}

async function fetchB64(url) {
  try {
    const res = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
    const ct = res.headers['content-type'] || 'image/jpeg';
    return { b64: Buffer.from(res.data).toString('base64'), mediaType: ct.includes('png') ? 'image/png' : 'image/jpeg' };
  } catch(e) { return null; }
}

async function analyzeWithClaude(photos, address, purpose) {
  if (!photos.length) { console.log(`   No ${purpose} photos`); return null; }
  console.log(`\n🤖  Analyzing ${photos.length} ${purpose} photos...`);

  const images = [];
  for (const p of photos) {
    process.stdout.write(`   [${p.detail}] ${p.activity}...`);
    const img = await fetchB64(p.url);
    if (img) { images.push({ ...img, detail: p.detail, activity: p.activity, comments: p.comments }); console.log(' ✓'); }
    else console.log(' ✗');
    await sleep(250);
  }
  if (!images.length) return null;

  const content = [];
  images.forEach((img, i) => {
    content.push({ type: 'image', source: { type: 'base64', media_type: img.mediaType, data: img.b64 } });
    content.push({ type: 'text', text: `Photo ${i+1} | Activity: ${img.activity} | Detail tag: ${img.detail}${img.comments ? ' | Inspector note: ' + img.comments : ''}` });
  });

  const prompt = purpose === 'appliances'
    ? `These are inspection photos from rental property: ${address}

IMPORTANT: Look very carefully at ANY labels, stickers, or data plates on appliances. Serial numbers and model numbers are often on:
- Inside the refrigerator door frame
- Back or bottom of dishwasher door
- Inside the washing machine drum or lid
- Back panel of dryers
- Side panels of water heaters
- Label on AC units
- Inside microwave door

For EACH appliance visible, extract everything you can see. If you see a sticker or label, zoom in mentally and read every character.

Respond ONLY with valid JSON:
{
  "appliances": [
    {
      "type": "refrigerator/washer/dryer/dishwasher/microwave/stove/oven/water heater/AC unit/garbage disposal",
      "brand": "exact brand name from label or visible on appliance",
      "color": "White/Black/Stainless/Bisque/Slate",
      "model_number": "EXACT model number from label — copy every character",
      "serial_number": "EXACT serial number from label — copy every character",
      "condition": "Good/Fair/Poor",
      "notes": "any other details, inspector comments, or what you see on labels"
    }
  ],
  "washer_included": true/false/null,
  "dryer_included": true/false/null,
  "refrigerator_included": true/false/null
}`
    : `These are marketing/listing photos from rental property: ${address}
Look for pool, spa, exterior features.
Respond ONLY with valid JSON:
{
  "pool_present": true/false/null,
  "spa_present": true/false/null,
  "pool_type": "Chlorine/Salt water/Mineral or null",
  "flooring_type": "Tile/Wood/LVP/Carpet/Concrete or null",
  "flooring_color": "description or null",
  "carpet_present": true/false/null,
  "paint_colors_visible": "description or null",
  "general_notes": ""
}`;

  content.push({ type: 'text', text: prompt });

  try {
    const res = await axios.post('https://api.anthropic.com/v1/messages', {
      model: 'claude-sonnet-4-6', max_tokens: 2000,
      messages: [{ role: 'user', content }]
    }, { headers: { 'x-api-key': ANTHROPIC_KEY, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' } });
    return JSON.parse(res.data.content[0].text.replace(/```json|```/g, '').trim());
  } catch(e) { console.error('Claude error:', e.response?.data?.error?.message || e.message); return null; }
}

async function main() {
  const propId = 1339176;
  const address = '35 West 10th Avenue, Mesa, AZ 85210';
  console.log('\n🏠  Appliance + Serial Number Vision Analysis');
  console.log(`    ${address}`);
  console.log('━'.repeat(55));

  // Fetch all media pages
  let items = [], page = 1;
  while (true) {
    const res = await ZI.get('/api/media/', { params: { Property: propId, page_size: 100, page } });
    items.push(...(res.data?.results || []));
    if (!res.data?.next) break;
    page++; await sleep(300);
  }
  console.log(`\n📸  ${items.length} media items total`);

  const { targeted, inspectionSample, marketing } = selectPhotos(items);

  // Run targeted appliance analysis
  const applianceResults = await analyzeWithClaude(targeted, address, 'appliances');

  // Run inspection sample for any sticker shots we might have missed
  const inspectionResults = targeted.length < 5
    ? await analyzeWithClaude(inspectionSample.slice(0, 10), address, 'appliances')
    : null;

  // Run marketing for pool/exterior
  const marketingResults = await analyzeWithClaude(marketing, address, 'marketing');

  // Merge appliance results
  const allAppliances = [
    ...(applianceResults?.appliances || []),
    ...(inspectionResults?.appliances || [])
  ];

  // Deduplicate by type
  const byType = {};
  allAppliances.forEach(a => {
    if (!byType[a.type] || (a.serial_number && !byType[a.type].serial_number)) {
      byType[a.type] = a;
    }
  });

  const combined = {
    property: address,
    analyzed_at: new Date().toISOString(),
    pool_present: marketingResults?.pool_present ?? null,
    spa_present: marketingResults?.spa_present ?? null,
    pool_type: marketingResults?.pool_type ?? null,
    flooring_type: marketingResults?.flooring_type ?? null,
    flooring_color: marketingResults?.flooring_color ?? null,
    carpet_present: marketingResults?.carpet_present ?? null,
    paint_colors_visible: marketingResults?.paint_colors_visible ?? null,
    washer_included: applianceResults?.washer_included ?? inspectionResults?.washer_included ?? null,
    dryer_included: applianceResults?.dryer_included ?? inspectionResults?.dryer_included ?? null,
    refrigerator_included: applianceResults?.refrigerator_included ?? inspectionResults?.refrigerator_included ?? null,
    appliances: Object.values(byType)
  };

  console.log('\n✅  Final Results:');
  console.log(JSON.stringify(combined, null, 2));
  fs.writeFileSync('/tmp/zi_appliances.json', JSON.stringify(combined, null, 2));
  console.log('\n💾  Saved to /tmp/zi_appliances.json');

  console.log('\n📋  Appliance Summary:');
  combined.appliances.forEach(a => {
    console.log(`\n  ${a.type.toUpperCase()}`);
    console.log(`    Brand  : ${a.brand || 'not found'}`);
    console.log(`    Color  : ${a.color || 'not found'}`);
    console.log(`    Model  : ${a.model_number || 'not found'}`);
    console.log(`    Serial : ${a.serial_number || 'not found'}`);
    if (a.notes) console.log(`    Notes  : ${a.notes}`);
  });
}
main().catch(e => { console.error('Fatal:', e.message); });
