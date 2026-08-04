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

  const response = await fetch('https://api.apify.com/v2/acts/xquik~x-tweet-scraper/run-sync-get-dataset-items?timeout=300', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer ' + apiKey
    },
    body: JSON.stringify({
      twitterHandles: HANDLES,
      maxItems: 2000,
      queryType: 'Latest',
      outputPreset: 'flat',
      outputVariant: 'rich',
      fieldStyle: 'camelCase',
      includeSearchTerms: false
    }),
    signal: AbortSignal.timeout(310000)
  });

  if (!response.ok) {
    const errText = await response.text();
    console.error('Apify error response:', response.status, errText);
    throw new Error('Apify request failed: ' + response.status + ' ' + errText);
  }

  const tweets = await response.json();
  console.log('Apify total results:', tweets.length);
  if (tweets.length > 0) console.log('Apify raw sample:', JSON.stringify(tweets.slice(0, 2), null, 2));

  const cutoff = startDate ? new Date(startDate) : new Date('2026-07-21');

  return tweets
    .filter(t => t.resultType !== 'diagnostic')
    .filter(t => {
      if (!t.createdAt) return true;
      return new Date(t.createdAt) >= cutoff;
    })
    .map(t => ({
      handle: t.authorUsername || t.author?.username || 'unknown',
      text: t.text || '',
      timestamp: t.createdAt || '',
      url: t.url || t.tweetUrl || ''
    }))
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

module.exports = { scrapeXAccounts };
