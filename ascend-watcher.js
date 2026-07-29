require('dotenv').config({ path: '.env' });
const SLACK_TOKEN = process.env.SLACK_TOKEN;
const SLACK_CHANNEL = process.env.SLACK_CHANNEL || 'C07CY9SSF7D';

const REPOS = [
  'noogalabs/ascendops',
  'noogalabs/ascendops-agent-pack',
  'noogalabs/procedure-ops',
];

async function checkRepo(repo) {
  const since = new Date();
  since.setDate(since.getDate() - 7);
  const sinceStr = since.toISOString();

  const headers = { 'Accept': 'application/vnd.github.v3+json', 'User-Agent': 'AloeAI' };

  // Get commits
  const commitsResp = await fetch(`https://api.github.com/repos/${repo}/commits?since=${sinceStr}&per_page=10`, { headers });
  const commits = commitsResp.ok ? await commitsResp.json() : [];

  // Get releases
  const releasesResp = await fetch(`https://api.github.com/repos/${repo}/releases?per_page=5`, { headers });
  const releases = releasesResp.ok ? await releasesResp.json() : [];
  const newReleases = releases.filter(r => new Date(r.published_at) > since);

  return {
    repo,
    commits: Array.isArray(commits) ? commits.slice(0, 5).map(c => ({
      sha: c.sha?.slice(0, 7),
      message: (c.commit?.message || '').split('\n')[0].slice(0, 80),
      author: c.commit?.author?.name || '',
      date: (c.commit?.author?.date || '').slice(0, 10)
    })) : [],
    releases: newReleases.map(r => ({ name: r.name || r.tag_name, date: r.published_at?.slice(0, 10), url: r.html_url }))
  };
}

async function runAscendWatcher() {
  console.log('Ascend watcher: checking repos...');
  const results = await Promise.all(REPOS.map(checkRepo));

  const hasUpdates = results.some(r => r.commits.length > 0 || r.releases.length > 0);

  if (!hasUpdates) {
    console.log('Ascend watcher: no updates this week');
    return;
  }

  let msg = `*🔭 AscendOps Weekly Update — ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}*\n`;
  msg += `_Checking noogalabs repos for new activity this week_\n\n`;

  for (const r of results) {
    if (r.commits.length === 0 && r.releases.length === 0) continue;

    msg += `*📦 ${r.repo}*\n`;

    if (r.releases.length > 0) {
      msg += `  🚀 *New Releases:*\n`;
      r.releases.forEach(rel => {
        msg += `    • <${rel.url}|${rel.name}> — ${rel.date}\n`;
      });
    }

    if (r.commits.length > 0) {
      msg += `  📝 *Recent Commits (${r.commits.length}):*\n`;
      r.commits.forEach(c => {
        msg += `    • \`${c.sha}\` ${c.message} — ${c.author} (${c.date})\n`;
      });
    }
    msg += '\n';
  }

  msg += `_View full activity: <https://github.com/noogalabs|github.com/noogalabs>_`;

  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: { 'Authorization': 'Bearer ' + SLACK_TOKEN, 'Content-Type': 'application/json' },
    body: JSON.stringify({ channel: SLACK_CHANNEL, text: msg })
  });

  console.log('Ascend watcher: Slack update sent');
}

// Schedule weekly Monday 8am AZ
function msUntilNextMonday8am() {
  const now = new Date();
  const az = new Date(now.toLocaleString('en-US', { timeZone: 'America/Phoenix' }));
  const next = new Date(az);
  const daysUntilMonday = (1 - az.getDay() + 7) % 7 || 7;
  next.setDate(az.getDate() + daysUntilMonday);
  next.setHours(8, 0, 0, 0);
  return next - az;
}

runAscendWatcher().then(() => {
  setTimeout(function tick() {
    runAscendWatcher().catch(e => console.error('Ascend watcher error:', e.message));
    setTimeout(tick, 7 * 24 * 60 * 60 * 1000);
  }, msUntilNextMonday8am());
  console.log('Ascend watcher: scheduled weekly Monday 8am AZ');
});
