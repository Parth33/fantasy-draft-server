const fetch = require('node-fetch');

const HANDLES = [
  'DBro_FFB', 'MBFantasyLife', 'FF_Wheeler', 'jac3600', 'daltondeldon',
  'NickZylakFFA', 'ScottBarrettDFB', 'FieldYates', 'rotoworld_fb',
  'scott_pianowski', 'andybehrens', 'PFF_Fantasy', 'justinboone',
  'ChrisRaybon', 'Ihartitz', 'JoshNorris', 'HaydenWinks', 'UnderdogNFL',
  'The_Oddsmaker', 'MattHarmon_BYB', 'MatthewBerryTMR'
];

async function scrapeXAccounts(startDate) {
  const apiKey = process.env.APIFY_API_KEY;

  // Start the actor run
  const runRes = await fetch('https://api.apify.com/v2/acts/apidojo~tweet-scraper/runs?token=' + apiKey, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      twitterHandles: HANDLES,
      maxItems: 2000,
      sort: 'Latest',
      tweetLanguage: 'en',
      onlyImage: false,
      onlyVideo: false,
      onlyQuote: false,
      onlyVerifiedUsers: false,
      onlyTwitterBlue: false,
      includeSearchTerms: false,
      customMapFunction: '(object) => { return {...object} }'
    })
  });

  const run = await runRes.json();
  const runId = run.data.id;

  // Poll until finished (max 10 minutes)
  let status = 'RUNNING';
  let attempts = 0;
  while (status === 'RUNNING' || status === 'READY') {
    await new Promise(r => setTimeout(r, 15000)); // wait 15 seconds between polls
    attempts++;
    if (attempts > 40) throw new Error('Apify run timed out');
    const statusRes = await fetch(`https://api.apify.com/v2/acts/apidojo~tweet-scraper/runs/${runId}?token=${apiKey}`);
    const statusData = await statusRes.json();
    status = statusData.data.status;
  }

  if (status !== 'SUCCEEDED') throw new Error('Apify run failed with status: ' + status);

  // Fetch results from dataset
  const datasetRes = await fetch(`https://api.apify.com/v2/acts/apidojo~tweet-scraper/runs/${runId}/dataset/items?token=${apiKey}&limit=2000`);
  const tweets = await datasetRes.json();

  // Filter to startDate if provided, format results
  const cutoff = startDate ? new Date(startDate) : new Date('2026-07-21');
  return tweets
    .filter(t => t.createdAt && new Date(t.createdAt) >= cutoff)
    .map(t => ({
      handle: t.author?.userName || t.user?.screen_name || 'unknown',
      text: t.text || t.full_text || '',
      timestamp: t.createdAt || t.created_at || '',
      url: t.url || ''
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

module.exports = { scrapeXAccounts };
