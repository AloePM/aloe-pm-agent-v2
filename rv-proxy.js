/**
 * rv-proxy — local MCP auth-injecting proxy for Rentvine
 *
 * Mae's local MCP client can't send Rentvine's required HTTP Basic auth + the
 * X-Rentvine-Account header (and Anthropic's hosted connector can't either).
 * This tiny proxy sits on localhost, accepts a simple Bearer secret from Mae,
 * and forwards every MCP request to the real Rentvine MCP server with the
 * correct upstream headers swapped in. It streams responses (incl. SSE) back
 * transparently and preserves the Mcp-Session-Id.
 *
 *   Mae ──Bearer MAE_PROXY_SECRET──▶ rv-proxy (127.0.0.1:3099)
 *        ──Basic + X-Rentvine-Account──▶ https://mcp.rentvine.ai/mcp
 *
 * Bound to 127.0.0.1 only — never publicly exposed. Deploy: pm2 start rv-proxy.js --name rv-proxy
 */

require('dotenv').config({ path: '.env.mae' });
const express = require('express');
const { Readable } = require('stream');

const PORT = parseInt(process.env.MAE_PROXY_PORT || '3099', 10);
const SECRET = process.env.MAE_PROXY_SECRET || '';
const UPSTREAM = process.env.RV_MCP_UPSTREAM || 'https://mcp.rentvine.ai/mcp';
const RV_BASIC = process.env.RV_MCP_BASIC || '';
const RV_ACCOUNT = process.env.RV_MCP_ACCOUNT || 'aloepm';

// Headers we pass straight through (both directions) so MCP session/streaming work.
const PASS_REQ = ['accept', 'content-type', 'mcp-session-id', 'mcp-protocol-version', 'last-event-id'];
const PASS_RES = ['content-type', 'mcp-session-id', 'cache-control'];

const app = express();
app.use(express.raw({ type: '*/*', limit: '20mb' }));

app.get('/health', (req, res) => res.json({ ok: true, upstream: UPSTREAM, account: RV_ACCOUNT }));

app.all('/mcp', async (req, res) => {
  if (!SECRET || req.headers['authorization'] !== `Bearer ${SECRET}`) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const headers = { 'Authorization': RV_BASIC, 'X-Rentvine-Account': RV_ACCOUNT };
  for (const h of PASS_REQ) if (req.headers[h]) headers[h] = req.headers[h];

  const init = { method: req.method, headers };
  if (req.method !== 'GET' && req.method !== 'HEAD' && req.body && req.body.length) {
    init.body = req.body;
  }

  let upstream;
  try {
    upstream = await fetch(UPSTREAM, init);
  } catch (e) {
    console.error('rv-proxy upstream error:', e.message);
    return res.status(502).json({ error: 'upstream_fetch_failed', detail: e.message });
  }

  res.status(upstream.status);
  for (const h of PASS_RES) { const v = upstream.headers.get(h); if (v) res.setHeader(h, v); }
  if (upstream.body) Readable.fromWeb(upstream.body).pipe(res);
  else res.end();
});

app.listen(PORT, '127.0.0.1', () => {
  const ok = SECRET && RV_BASIC;
  console.log(`⚡ rv-proxy on http://127.0.0.1:${PORT}/mcp → ${UPSTREAM} (account: ${RV_ACCOUNT})`);
  if (!ok) console.log('⚠️  Missing MAE_PROXY_SECRET or RV_MCP_BASIC in .env.mae — proxy will reject/forward without creds.');
});
