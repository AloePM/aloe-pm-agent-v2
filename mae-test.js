/**
 * mae-test.js — one-shot harness to exercise Mae's exact live-Rentvine path.
 * Mirrors mae.js (same env, same MCP client, same Claude tool loop) without Slack.
 * Usage: node mae-test.js "what's our cash flow this month?"
 */
require('dotenv').config({ path: '.env.mae' });
const Anthropic = require('@anthropic-ai/sdk');
const { Client } = require('@modelcontextprotocol/sdk/client/index.js');
const { StreamableHTTPClientTransport } = require('@modelcontextprotocol/sdk/client/streamableHttp.js');

// Import the REAL skill code + system prompt from mae.js (it only auto-starts
// Slack when run directly, so requiring it here is side-effect-free).
const { runDepositBreakdown, DEPOSIT_TOOL, SYSTEM_PROMPT } = require('./mae.js');

const MAE_MCP_URL = process.env.MAE_MCP_URL || 'http://127.0.0.1:3099/mcp';
const SECRET = process.env.MAE_PROXY_SECRET || '';
const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

function sanitizeSchema(s) {
  const out = (s && typeof s === 'object') ? { ...s } : {};
  delete out.$schema;
  if (out.type !== 'object') out.type = 'object';
  if (!out.properties || typeof out.properties !== 'object') out.properties = {};
  return out;
}
function textOf(resp) {
  return (resp.content || []).filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
}
function stripReportNoise(t) {
  if (typeof t !== 'string') return t;
  return t.replace(/\n*-{3,}\s*\n\*\*Download:\*\*[\s\S]*$/i, '').trimEnd();
}
function mcpResultToText(r) {
  if (!r) return '';
  if (typeof r.content === 'string') return stripReportNoise(r.content).slice(0, 12000);
  if (Array.isArray(r.content)) return stripReportNoise(r.content.map(c => c.type === 'text' ? c.text : JSON.stringify(c)).join('\n')).slice(0, 12000);
  return JSON.stringify(r).slice(0, 12000);
}

(async () => {
  const question = process.argv[2] || "what's our cash flow this month?";
  const transport = new StreamableHTTPClientTransport(new URL(MAE_MCP_URL), {
    requestInit: { headers: { Authorization: `Bearer ${SECRET}` } },
  });
  const client = new Client({ name: 'mae-test', version: '1.0.0' }, { capabilities: {} });
  await client.connect(transport);
  const list = await client.listTools();
  const tools = (list.tools || []).map(t => ({
    name: t.name, description: (t.description || '').slice(0, 1000), input_schema: sanitizeSchema(t.inputSchema),
  })).concat(DEPOSIT_TOOL);  // same MCP tools + local deposit skill Mae uses
  console.error(`[connected — ${tools.length} tools] today is ${new Date().toISOString().slice(0,10)}`);

  const convo = [{ role: 'user', content: question }];
  for (let i = 0; i < 8; i++) {
    const resp = await anthropic.messages.create({
      model: 'claude-sonnet-4-6', max_tokens: 1500, system: SYSTEM_PROMPT, messages: convo, tools,
    });
    if (resp.stop_reason !== 'tool_use') { console.log('\n=== MAE ANSWER ===\n' + (textOf(resp) || '(empty)')); break; }
    convo.push({ role: 'assistant', content: resp.content });
    const results = [];
    for (const b of resp.content) {
      if (b.type !== 'tool_use') continue;
      console.error(`[tool] ${b.name} ${JSON.stringify(b.input)}`);
      try {
        if (b.name === 'deposit_breakdown') {
          const data = await runDepositBreakdown(client, b.input || {});
          results.push({ type: 'tool_result', tool_use_id: b.id, content: JSON.stringify(data), is_error: false });
        } else {
          const r = await client.callTool({ name: b.name, arguments: b.input || {} });
          results.push({ type: 'tool_result', tool_use_id: b.id, content: mcpResultToText(r), is_error: !!r.isError });
        }
      } catch (e) {
        console.error(`[tool error] ${e.message}`);
        results.push({ type: 'tool_result', tool_use_id: b.id, content: `Tool error: ${e.message}`, is_error: true });
      }
    }
    convo.push({ role: 'user', content: results });
  }
  await client.close();
  process.exit(0);
})().catch(e => { console.error('FAILED:', e.message); process.exit(1); });
