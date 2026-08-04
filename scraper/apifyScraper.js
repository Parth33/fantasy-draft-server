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
  const authHeaders = {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ' + apiKey
  };

  // Start the actor run
  const runRes = await fetch('https://api.apify.com/v2/acts/apidojo~tweet-scraper/runs', {
    method: 'POST',
    headers: authHeaders,
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

  if (!runRes.ok) {
    const body = await runRes.text();
    console.error('Apify run start failed:', runRes.status, body);
    throw new Error(`Apify run start failed with ${runRes.status}: ${body}`);
  }

  const run = await runRes.json();
  const runId = run.data.id;

  // Poll until finished (max 10 minutes)
  let status = 'RUNNING';
  let attempts = 0;
  while (status === 'RUNNING' || status === 'READY') {
    await new Promise(r => setTimeout(r, 15000)); // wait 15 seconds between polls
    attempts++;
    if (attempts > 40) throw new Error('Apify run timed out');
    const statusRes = await fetch(`https://api.apify.com/v2/acts/apidojo~tweet-scraper/runs/${runId}`, {
      headers: authHeaders
    });
    if (!statusRes.ok) {
      const body = await statusRes.text();
      console.error('Apify run status check failed:', statusRes.status, body);
      throw new Error(`Apify run status check failed with ${statusRes.status}: ${body}`);
    }
    const statusData = await statusRes.json();
    status = statusData.data.status;
  }

  if (status !== 'SUCCEEDED') throw new Error('Apify run failed with status: ' + status);

  // Fetch results from dataset
  const datasetRes = await fetch(`https://api.apify.com/v2/acts/apidojo~tweet-scraper/runs/${runId}/dataset/items?limit=2000`, {
    headers: authHeaders
  });
  if (!datasetRes.ok) {
    const body = await datasetRes.text();
    console.error('Apify dataset fetch failed:', datasetRes.status, body);
    throw new Error(`Apify dataset fetch failed with ${datasetRes.status}: ${body}`);
  }
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
