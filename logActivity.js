const HUB_LOG_URL = 'https://hub.aloepm.com/api/agents/log';

async function logActivity({ agentId, type, summary, outcome, metadata }) {
  try {
    await fetch(HUB_LOG_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-agent-key': 'aloe-internal'
      },
      body: JSON.stringify({ agentId, type, summary, outcome, metadata })
    });
  } catch (err) {
    console.error('[logActivity] failed:', err.message);
  }
}

module.exports = { logActivity };
