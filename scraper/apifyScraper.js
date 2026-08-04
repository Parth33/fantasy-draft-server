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

  console.log('Apify total results:', tweets.length);
  console.log('Apify raw sample:', JSON.stringify(tweets.slice(0, 3), null, 2));

  return tweets
    .map(t => ({
      handle: t.author?.userName || t.author?.username || t.user?.screen_name || t.userName || '',
      text: t.text || t.full_text || t.rawContent || '',
      timestamp: t.createdAt || t.created_at || t.date || '',
      url: t.url || ''
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

module.exports = { scrapeXAccounts };
