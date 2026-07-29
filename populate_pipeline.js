require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const axios = require('axios');
const fs = require('fs');
const RV_ACCOUNT = process.env.RENTVINE_ACCOUNT;
const RV_KEY = process.env.RENTVINE_API_KEY;
const RV_SECRET = process.env.RENTVINE_API_SECRET;
const ZI_KEY = process.env.ZINSPECTOR_API_KEY;
const AI_KEY = process.env.ANTHROPIC_API_KEY;
const MISSING = [!RV_ACCOUNT&&'RENTVINE_ACCOUNT',!RV_KEY&&'RENTVINE_API_KEY',!RV_SECRET&&'RENTVINE_API_SECRET',!ZI_KEY&&'ZINSPECTOR_API_KEY',!AI_KEY&&'ANTHROPIC_API_KEY'].filter(Boolean);
if(MISSING.length){console.error('Missing in .env:',MISSING.join(', '));process.exit(1);}
const RV=axios.create({baseURL:`https://${RV_ACCOUNT}.rentvine.com/api/manager`,auth:{username:RV_KEY,password:RV_SECRET}});
const ZI=axios.create({baseURL:'https://portfolio.zinspector.com',headers:{'x-api-key':ZI_KEY,'Origin':'http://localhost'}});
const AI=axios.create({baseURL:'https://api.anthropic.com/v1',headers:{'x-api-key':AI_KEY,'anthropic-version':'2023-06-01','content-type':'application/json'}});
const PROPERTY_TYPE_ID=5,REPLACEMENT_THRESHOLD=300;
const DRY_RUN=process.argv.includes('--dry-run');
const RUN_ALL=process.argv.includes('--all');
const args=process.argv.slice(2);
const PROP_SEARCH=args.includes('--property')?args[args.indexOf('--property')+1]:null;
const PROP_ID_ARG=args.includes('--property-id')?parseInt(args[args.indexOf('--property-id')+1]):null;
function sleep(ms){return new Promise(r=>setTimeout(r,ms));}
function stripHtml(html){return(html||'').replace(/<style[^>]*>[\s\S]*?<\/style>/gi,'').replace(/<script[^>]*>[\s\S]*?<\/script>/gi,'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/&amp;/g,'&').replace(/&ZeroWidthSpace;/g,'').replace(/\s+/g,' ').trim();}
async function getZinspectorReportText(propertyAddress){
  try{
    const propRes=await ZI.get('/api/propertiesCursor/',{params:{search:propertyAddress.split(',')[0],page_size:5}});
    const props=propRes.data?.results||[];
    if(!props.length){console.log('   No property in Zinspector');return null;}
    const ziProp=props[0],ziId=ziProp.id;
    console.log(`   Zinspector: ${ziProp.Name} (ID ${ziId})`);
    const docsRes=await ZI.get('/api/documents/',{params:{Property:ziId,page_size:20}});
    const docs=docsRes.data?.results||[];
    console.log(`   ${docs.length} inspection documents`);
    const priority=['move in','inspection','annual'];
    const sorted=docs.sort((a,b)=>{const as=priority.findIndex(p=>(a.Activity||'').toLowerCase().includes(p));const bs=priority.findIndex(p=>(b.Activity||'').toLowerCase().includes(p));return(as===-1?99:as)-(bs===-1?99:bs);});
    const texts=[];
    for(const doc of sorted.slice(0,3)){
      if(!doc.shareable_raw_html_url)continue;
      try{const res=await axios.get(doc.shareable_raw_html_url,{timeout:15000});const text=stripHtml(res.data);texts.push(`=== ${doc.Title} (${doc.Activity} ${doc.Date?.slice(0,10)}) ===\n${text}`);console.log(`   ${doc.Title}: ${text.length} chars`);await sleep(500);}catch(e){console.log(`   Could not fetch ${doc.Title}`);}
    }
    return{text:texts.join('\n\n'),ziPropId:ziId};
  }catch(e){console.log('   Zinspector error:',e.message);return null;}
}
async function getRentvineData(rvPropertyId){
  const bills=[],workOrders=[];
  try{let page=1;while(true){const res=await RV.get('/accounting/bills',{params:{propertyId:rvPropertyId,page,pageSize:100,includes:'contact,charges'}});const data=res.data?.data||res.data?.bills||[];bills.push(...data);const total=res.data?.pagination?.totalPages||1;if(page>=total||!data.length)break;page++;await sleep(200);}console.log(`   ${bills.length} bills`);}catch(e){console.log('   Bills error:',e.message);}
  try{let page=1;while(true){const res=await RV.get('/maintenance/work-orders',{params:{propertyId:rvPropertyId,page,pageSize:100,includes:'vendor,bills,vendorTrade'}});const data=res.data?.data||res.data?.workOrders||[];workOrders.push(...data);const total=res.data?.pagination?.totalPages||1;if(page>=total||!data.length)break;page++;await sleep(200);}console.log(`   ${workOrders.length} work orders`);}catch(e){console.log('   WO error:',e.message);}
  return{bills,workOrders};
}
async function classifyWithClaude(property,ziData,rvData){
  const{bills,workOrders}=rvData;
  const billsText=bills.slice(0,60).map(b=>`* ${b.date||''} | ${b.contact?.name||''} | $${b.totalAmount||0} | ${b.description||''}`).join('\n');
  const woText=workOrders.slice(0,40).map(wo=>`* ${wo.dateCreated||''} | ${wo.vendorTrade?.name||''} | ${wo.description||''}`).join('\n');
  const prompt=`Analyze property data for: ${property.address}\n\nZINSPECTOR REPORTS:\n${ziData?.text?.slice(0,4000)||'none'}\n\nBILLS:\n${billsText||'none'}\n\nWORK ORDERS:\n${woText||'none'}\n\nRules: Bills over $${REPLACEMENT_THRESHOLD} = probable replacement. "None in house" = not included.\n\nRespond ONLY with valid JSON:\n{"appliances":{"ac_unit_1_replacement_date":null,"ac_unit_2_replacement_date":null,"water_heater_replacement_date":null,"garbage_disposal_replacement_date":null,"washer_date_of_purchase":null,"washer_included":null,"dryer_date_of_purchase":null,"dryer_included":null,"refrigerator_date_purchased":null,"refrigerator_included":null,"dishwasher_date_purchased":null,"microwave_date_purchased":null,"range_stove_date_purchased":null},"appliance_details":{"refrigerator_brand":null,"refrigerator_color":null,"refrigerator_model":null,"refrigerator_serial":null,"washer_brand":null,"dryer_brand":null,"dryer_type":null,"dishwasher_brand":null,"dishwasher_color":null,"microwave_brand":null,"microwave_color":null,"microwave_type":null,"range_brand":null,"range_color":null,"range_type":null},"maintenance":{"carpet_replacement_date":null,"interior_painting_date":null,"exterior_painting_date":null,"roof_replacement_date":null,"front_yard_irrigation_date":null,"backyard_irrigation_date":null,"pool_pump_date_replaced":null,"last_scorpion_treatment_date":null},"property":{"pool_present":null,"spa_present":null,"flooring_type":null,"interior_paint_notes":null},"confidence":{"notes":""}}`;
  const res=await AI.post('/messages',{model:'claude-haiku-4-5',max_tokens:2000,messages:[{role:'user',content:prompt}]});
  return JSON.parse(res.data.content[0].text.replace(/```json|```/g,'').trim());
}
async function getCustomFieldMap(rvPropertyId){
  try{const res=await RV.get(`/custom-fields/values/${PROPERTY_TYPE_ID}/${rvPropertyId}`);const categories=res.data||[];const map={};categories.forEach(cat=>{(cat.fields||[]).forEach(f=>{map[f.name.trim().toLowerCase()]={fieldId:f.customFieldID,categoryId:cat.customFieldCategoryID};});});console.log(`   ${Object.keys(map).length} custom fields mapped`);return map;}catch(e){console.log('   Custom fields error:',e.message);return{};}
}
async function writeToRentvine(rvPropertyId,fieldMap,updates){
  const byCategory={};
  for(const[fieldName,value]of Object.entries(updates)){if(value===null||value===undefined)continue;const field=fieldMap[fieldName.toLowerCase()];if(!field){continue;}if(!byCategory[field.categoryId])byCategory[field.categoryId]={};byCategory[field.categoryId][field.fieldId]=value;}
  let written=0,failed=0;
  for(const[categoryId,fieldValues]of Object.entries(byCategory)){
    if(DRY_RUN){console.log(`   [DRY RUN] Cat ${categoryId}:`,JSON.stringify(fieldValues));written++;continue;}
    try{await RV.post(`/custom-fields/values/${PROPERTY_TYPE_ID}/${rvPropertyId}`,{customFieldCategoryID:String(categoryId),...fieldValues});written++;await sleep(300);}catch(e){console.error(`   Failed cat ${categoryId}:`,e.response?.data?.message||e.message);failed++;}
  }
  return{written,failed};
}
function buildUpdates(c){
  const a=c.appliances||{},ad=c.appliance_details||{},m=c.maintenance||{},p=c.property||{};
  return{'ac unit replacement 1':a.ac_unit_1_replacement_date,'ac unit replacement 2':a.ac_unit_2_replacement_date,'water heater replacement date':a.water_heater_replacement_date,'garbage disposal replacement date':a.garbage_disposal_replacement_date,'washing machine date of purchase':a.washer_date_of_purchase,'dryer date of purchase':a.dryer_date_of_purchase,'refrigerator date purchased':a.refrigerator_date_purchased,'dishwasher date purchased':a.dishwasher_date_purchased,'microwave date purchased':a.microwave_date_purchased,'range/stove date purchased':a.range_stove_date_purchased,'washer included':a.washer_included,'dryer included':a.dryer_included,'refrigerator included?':a.refrigerator_included,'refrigerator brand':ad.refrigerator_brand,'refrigerator color':ad.refrigerator_color,'refrigerator model':ad.refrigerator_model,'refrigerator serial number':ad.refrigerator_serial,'washing machine brand':ad.washer_brand,'dryer brand':ad.dryer_brand,'dryer type':ad.dryer_type,'dishwasher brand':ad.dishwasher_brand,'dishwasher color':ad.dishwasher_color,'microwave brand':ad.microwave_brand,'microwave color':ad.microwave_color,'microwave type':ad.microwave_type,'range/stove brand':ad.range_brand,'range/stove color':ad.range_color,'range/stove type':ad.range_type,'carpet replacement':m.carpet_replacement_date,'interior painting':m.interior_painting_date,'exterior painting':m.exterior_painting_date,'roof replacement date':m.roof_replacement_date,'front yard irrigation':m.front_yard_irrigation_date,'backyard irrigation':m.backyard_irrigation_date,'pool pump date replaced':m.pool_pump_date_replaced,'last scorpion treatment date':m.last_scorpion_treatment_date,'pool present?':p.pool_present,'spa / hot tub present?':p.spa_present,'interior painting colors (notes)':p.interior_paint_notes};
}
async function processProperty(rvProperty){
  const rvId=rvProperty.propertyID||rvProperty.id;
  const address=rvProperty.address||rvProperty.name||`ID ${rvId}`;
  console.log(`\n${'='.repeat(60)}\n${address}\nRentvine ID: ${rvId}\n${'='.repeat(60)}`);
  console.log('\nStep 1 - Zinspector reports...');
  const ziData=await getZinspectorReportText(address);
  console.log('\nStep 2 - Rentvine bills & work orders...');
  const rvData=await getRentvineData(rvId);
  if(!ziData&&!rvData.bills.length&&!rvData.workOrders.length){console.log('No data found - skipping');return;}
  console.log('\nStep 3 - Claude AI classification...');
  let classification;
  try{classification=await classifyWithClaude(rvProperty,ziData,rvData);console.log('Pool:',classification.property?.pool_present,'Washer:',classification.appliances?.washer_included,'Dryer:',classification.appliances?.dryer_included,'Fridge:',classification.appliances?.refrigerator_included);console.log('Notes:',classification.confidence?.notes);}catch(e){console.error('Classification failed:',e.message);return;}
  fs.writeFileSync(`/tmp/classification_${rvId}.json`,JSON.stringify({property:address,rvId,classification},null,2));
  console.log('\nStep 4 - Fetching custom field IDs...');
  const fieldMap=await getCustomFieldMap(rvId);
  if(!Object.keys(fieldMap).length){console.log('No custom fields found');return;}
  const updates=buildUpdates(classification);
  const nonNull=Object.entries(updates).filter(([,v])=>v!==null&&v!==undefined);
  console.log(`\nStep 5 - Writing ${nonNull.length} fields${DRY_RUN?' (DRY RUN)':''}...`);
  nonNull.forEach(([k,v])=>console.log(`  ${k}: ${v}`));
  const{written,failed}=await writeToRentvine(rvId,fieldMap,updates);
  console.log(`Done: ${written} written, ${failed} failed`);
}
async function main(){
  console.log('\nAloe PM - Property Data Population Pipeline');
  console.log(`Account: ${RV_ACCOUNT}.rentvine.com | Mode: ${DRY_RUN?'DRY RUN':'LIVE'}`);
  if(!PROP_SEARCH&&!PROP_ID_ARG&&!RUN_ALL){console.log('Usage:\n  node populate_pipeline.js --property "35 W 10th"\n  node populate_pipeline.js --property-id 1234\n  node populate_pipeline.js --all\n  Add --dry-run to preview');process.exit(0);}
  let properties=[];
  if(PROP_ID_ARG){properties=[{propertyID:PROP_ID_ARG,address:`Property ID ${PROP_ID_ARG}`}];}
  else if(PROP_SEARCH){console.log(`Searching for: ${PROP_SEARCH}`);try{const res=await RV.get('/properties',{params:{search:PROP_SEARCH,pageSize:10}});const raw=res.data?.data||res.data||[];properties=raw.map(r=>r.property||r).filter(Boolean);if(!properties.length){console.error('No properties found');process.exit(1);}console.log(`Found ${properties.length} - using: ${properties[0].address}`);properties=[properties[0]];}catch(e){console.error('Search failed:',e.message);process.exit(1);}}
  else if(RUN_ALL){try{const res=await RV.get('/properties',{params:{pageSize:200}});const raw2=res.data?.data||res.data||[];properties=raw2.map(r=>r.property||r).filter(Boolean);console.log(`Found ${properties.length} properties`);}catch(e){console.error('Failed:',e.message);process.exit(1);}}
  for(const property of properties){await processProperty(property);await sleep(2000);}
  console.log('\nPipeline complete!');
}
main().catch(e=>{console.error('Fatal:',e.message);process.exit(1);});