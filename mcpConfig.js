const { Buffer } = require('buffer');

function getMcpServers() {
  const rvToken = 'Basic ' + Buffer.from(
    process.env.RENTVINE_API_KEY + ':' + process.env.RENTVINE_API_SECRET
  ).toString('base64');
  return [
    {
      type: 'url',
      url: 'https://mcp.rentvine.ai/mcp',
      name: 'rentvine',
      authorization_token: rvToken
    }
  ];
}

module.exports = { getMcpServers };
