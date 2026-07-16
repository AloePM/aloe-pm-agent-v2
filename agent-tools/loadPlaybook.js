async function loadPlaybook(agentId, fallback) {
  let prompt = fallback;

  // Only use GCS playbook if it's bigger than the local fallback
  try {
    // Read directly from GCS using gsutil
    const { execSync } = require('child_process');
    let gcsText = '';
    try {
      gcsText = execSync(`gsutil cat gs://aloe-hub-data-496300/playbooks/${agentId}.md`, { timeout: 10000 }).toString();
    } catch(e) { gcsText = ''; }
    if (gcsText && gcsText.length > fallback.length) {
      console.log(`[${agentId}] GCS playbook loaded (${gcsText.length} chars > local ${fallback.length} chars)`);
      return gcsText;
    }
    // Hub fetch disabled - using gsutil above
  } catch (err) {
    console.error(`[${agentId}] Playbook fetch failed:`, err.message);
  }

  // Inject shared knowledge
  try {
    const r = await fetch(`http://localhost:3002/api/agents/knowledge/shared`);
    const data = await r.json();
    if (data.exists && data.content.trim()) {
      prompt += '\n\n---\n## CURRENT KNOWLEDGE\n' + data.content;
      console.log(`[${agentId}] Shared knowledge injected (${data.content.length} chars)`);
    }
  } catch (err) {
    console.error(`[${agentId}] Shared knowledge fetch failed:`, err.message);
  }

  // Inject agent-specific knowledge
  try {
    const r = await fetch(`http://localhost:3002/api/agents/knowledge/${agentId}`);
    const data = await r.json();
    if (data.exists && data.content.trim()) {
      prompt += '\n\n## AGENT-SPECIFIC KNOWLEDGE\n' + data.content;
      console.log(`[${agentId}] Agent knowledge injected (${data.content.length} chars)`);
    }
  } catch (err) {
    console.error(`[${agentId}] Agent knowledge fetch failed:`, err.message);
  }

  return prompt;
}

module.exports = { loadPlaybook };

async function savePlaybook(agentId, content) {
  try {
    await fetch(`http://localhost:3002/api/agents/playbook-save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-agent-key': 'aloe-internal' },
      body: JSON.stringify({ agentId, content })
    });
    console.log(`[${agentId}] Full prompt saved to GCS (${content.length} chars)`);
  } catch (err) {
    console.error(`[${agentId}] GCS save failed:`, err.message);
  }
}

module.exports = { loadPlaybook, savePlaybook };
