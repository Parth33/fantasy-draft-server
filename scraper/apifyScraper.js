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

  // Run the actor synchronously and get dataset items directly — no polling needed
  const runRes = await fetch('https://api.apify.com/v2/acts/apidojo~tweet-scraper/run-sync-get-dataset-items?timeout=300', {
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
    }),
    signal: AbortSignal.timeout(310000)
  });

  if (!runRes.ok) {
    const body = await runRes.text();
    console.error('Apify run-sync failed:', runRes.status, body);
    throw new Error(`Apify run-sync failed with ${runRes.status}: ${body}`);
  }

  const tweets = await runRes.json();

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
