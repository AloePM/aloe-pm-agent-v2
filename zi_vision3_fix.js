// Post-process: extract pool from general notes if Claude missed it
function postProcess(results) {
  if (!results) return results;
  const notes = (results.general_notes || '').toLowerCase();
  const exterior = (results.exterior_notes || '').toLowerCase();
  if (results.pool_present === null) {
    if (notes.includes('pool') || exterior.includes('pool')) results.pool_present = true;
    if (notes.includes('spa') || exterior.includes('spa')) results.spa_present = true;
  }
  return results;
}
console.log(JSON.stringify(postProcess(require('/tmp/zi_analysis.json')), null, 2));
