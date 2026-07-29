require('dotenv').config({ path: '/home/randi/aloe-agents/.env' });
const axios = require('axios');
const RV = axios.create({ baseURL: 'https://aloepm.rentvine.com/api/manager', auth: { username: process.env.RENTVINE_API_KEY, password: process.env.RENTVINE_API_SECRET } });
const PROPERTY_ID = 577, PROPERTY_TYPE_ID = 5;
const DRY_RUN = process.argv.includes('--dry-run');
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
const EXTRACTED = {
  'refrigerator included?': true, 'refrigerator brand': 'Whirlpool', 'refrigerator color': 'Stainless',
  'washer included': true, 'dryer included': true, 'dryer type': 'Electric',
  'dishwasher color': 'Stainless', 'microwave type': 'Over-range',
  'range/stove type': 'Electric', 'range/stove color': 'Stainless',
  'pool present?': false, 'spa / hot tub present?': false,
  'carpet color': 'Dark gray/brown',
  'interior painting colors (notes)': 'Light gray/greige walls throughout, white trim and baseboards',
  'carpet comments': 'Dark gray/brown carpet in bedrooms, needs cleaning at move-out per inspection 2026-07-03',
  'other flooring comments': 'Tile in living areas, hallway, kitchen, bathrooms. Garage concrete stained.',
};
async function main() {
  console.log('\n🏠  35433 West San Alvarez Avenue (ID:', PROPERTY_ID, ') —', DRY_RUN ? 'DRY RUN' : 'LIVE');
  const res = await RV.get(`/custom-fields/values/${PROPERTY_TYPE_ID}/${PROPERTY_ID}`);
  const fieldMap = {};
  (res.data||[]).forEach(cat => {
    (cat.fields||[]).forEach(f => {
      fieldMap[f.name.trim().toLowerCase()] = { fieldId: f.customFieldID, categoryId: cat.customFieldCategoryID, name: f.name };
    });
  });
  console.log(`   ${Object.keys(fieldMap).length} fields mapped`);
  const byCategory = {};
  let matched = 0, unmatched = 0;
  for (const [fieldName, value] of Object.entries(EXTRACTED)) {
    if (value === null || value === undefined) continue;
    const field = fieldMap[fieldName.toLowerCase()];
    if (!field) { console.log(`   ⚠️  No match: "${fieldName}"`); unmatched++; continue; }
    if (!byCategory[field.categoryId]) byCategory[field.categoryId] = {};
    byCategory[field.categoryId][field.fieldId] = value;
    console.log(`   ✓  ${field.name} = ${value}`);
    matched++;
  }
  console.log(`\n   ${matched} matched, ${unmatched} unmatched, ${Object.keys(byCategory).length} categories`);
  let written = 0, failed = 0;
  for (const [categoryId, fieldValues] of Object.entries(byCategory)) {
    if (DRY_RUN) { console.log(`   [DRY RUN] Cat ${categoryId}:`, JSON.stringify(fieldValues)); written++; continue; }
    try {
      await RV.post(`/custom-fields/values/${PROPERTY_TYPE_ID}/${PROPERTY_ID}`, { customFieldCategoryID: String(categoryId), ...fieldValues });
      console.log(`   ✅  Category ${categoryId} — ${Object.keys(fieldValues).length} field(s) written`);
      written++; await sleep(300);
    } catch(e) { console.error(`   ❌  Category ${categoryId}:`, e.response?.data?.message||e.message); failed++; }
  }
  console.log(`\nDone: ${written} written, ${failed} failed`);
}
main().catch(e => { console.error('Fatal:', e.response?.data||e.message); process.exit(1); });
