async function loadPlaybook(agentId, fallback) {
  let prompt = fallback;

  // Load playbook from GCS
  try {
    const r = await fetch(`https://hub.aloepm.com/api/agents/playbook/${agentId}`);
    const data = await r.json();
    if (data.exists && data.content) {
      console.log(`[${agentId}] Playbook loaded from GCS (${data.content.length} chars)`);
      prompt = data.content;
    }
  } catch (err) {
    console.error(`[${agentId}] Playbook fetch failed:`, err.message);
  }

  // Inject shared knowledge
  try {
    const r = await fetch(`https://hub.aloepm.com/api/agents/knowledge/shared`);
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
    const r = await fetch(`https://hub.aloepm.com/api/agents/knowledge/${agentId}`);
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
