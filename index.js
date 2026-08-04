const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");
const xml2js = require("xml2js");

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// ─── Health check ────────────────────────────────────────────────────────────
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// ─── FantasyPros proxy ────────────────────────────────────────────────────────
app.get("/api/fantasypros/news", async (req, res) => {
  try {
    const response = await fetch("https://api.fantasypros.com/public/v2/json/nfl/news?limit=100&category=null", {
      headers: { "x-api-key": process.env.FANTASYPROS_API_KEY, "Cache-Control": "no-cache" },
    });
    if (!response.ok) throw new Error(`FantasyPros responded with ${response.status}`);
    const data = await response.json();
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    res.json(data);
  } catch (err) {
    console.error("FantasyPros news error:", err.message);
    res.status(500).json({ error: "Failed to fetch FantasyPros news" });
  }
});

app.get("/api/fantasypros/injuries", async (req, res) => {
  try {
    const response = await fetch("https://api.fantasypros.com/public/v2/json/nfl/injuries?include_probabilities=true", {
      headers: { "x-api-key": process.env.FANTASYPROS_API_KEY, "Cache-Control": "no-cache" },
    });
    if (!response.ok) throw new Error(`FantasyPros responded with ${response.status}`);
    const data = await response.json();
    res.set({
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Pragma": "no-cache",
      "Expires": "0",
    });
    res.json(data);
  } catch (err) {
    console.error("FantasyPros injuries error:", err.message);
    res.status(500).json({ error: "Failed to fetch FantasyPros injuries" });
  }
});

// ─── Intel Drop analysis (Anthropic proxy) ────────────────────────────────────
app.post("/api/analyze-camp", async (req, res) => {
  try {
    const { campText } = req.body;
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1500,
        system: "You are a fantasy football analyst. Analyze the following mix of player news, injury reports, and analyst commentary. For each player clearly discussed, output a JSON array where each item has: { name, adjustment (number -5 to +5), tags (array), reason (one short sentence) }. Tags should describe the player's ROLE and analyst SENTIMENT. Valid tags: Workhorse, Committee Back, WR1 Role, Target Hog, Depth Only, Handcuff, Boom/Bust, Analyst Favorite, Analyst Fade, Injury Risk, Breakout, Bounce Back, Rookie Riser, Aging Concern, Situation Change. Apply tags only when the text clearly supports them. Most players get 0-2 tags. Return only the JSON array.",
        messages: [{ role: "user", content: campText }],
      }),
    });
    if (!response.ok) throw new Error(`Anthropic API responded with ${response.status}`);
    const data = await response.json();
    const raw = data.content?.find(b => b.type === "text")?.text || "[]";
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const adjustments = JSON.parse(cleaned);
    res.json({ adjustments });
  } catch (err) {
    console.error("Analyze camp error:", err.message);
    res.status(500).json({ error: "Failed to analyze camp intel" });
  }
});

// ─── Helpers ─────────────────────────────────────────────────────────────────
function cleanText(str) {
  if (!str) return "";
  return str
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

const NFL_TEAMS = [
  "Cardinals","Falcons","Ravens","Bills","Panthers","Bears","Bengals",
  "Browns","Cowboys","Broncos","Lions","Packers","Texans","Colts",
  "Jaguars","Chiefs","Raiders","Chargers","Rams","Dolphins","Vikings",
  "Patriots","Saints","Giants","Jets","Eagles","Steelers","49ers",
  "Seahawks","Buccaneers","Titans","Commanders"
];

const FANTASY_KEYWORDS = [
  "targets","carries","snap","role","starter","backup","injury","limited",
  "practice","camp","return","miss","out","questionable","doubtful",
  "IR","reserve","surgery","healthy","cleared","full","restricted",
  "RB1","WR1","WR2","TE1","starting","depth","competition","featured",
  "workhorse","committee","split","lead","primary","secondary","usage",
  "touchdown","receiving","rushing","passing","route","target share"
];

function isRelevantNews(text) {
  if (!text) return false;
  const lower = text.toLowerCase();
  const hasTeam = NFL_TEAMS.some(t => lower.includes(t.toLowerCase()));
  const hasKeyword = FANTASY_KEYWORDS.some(k => lower.includes(k.toLowerCase()));
  return hasTeam && hasKeyword;
}

// ─── Rotowire scrape ──────────────────────────────────────────────────────────
async function fetchRotowire() {
  try {
    const res = await fetch("https://www.rotowire.com/football/news.php", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml",
        "Accept-Language": "en-US,en;q=0.9",
      },
      timeout: 10000,
    });
    const html = await res.text();

    const items = [];
    const articleRegex = /<li[^>]*class="[^"]*news-update[^"]*"[^>]*>([\s\S]*?)<\/li>/gi;
    const nameRegex = /<a[^>]*class="[^"]*player[^"]*"[^>]*>([^<]+)<\/a>/i;
    const textRegex = /<div[^>]*class="[^"]*news-update__news[^"]*"[^>]*>([\s\S]*?)<\/div>/i;
    const analysisRegex = /<div[^>]*class="[^"]*news-update__analysis[^"]*"[^>]*>([\s\S]*?)<\/div>/i;

    let match;
    while ((match = articleRegex.exec(html)) !== null && items.length < 60) {
      const block = match[1];
      const nameMatch = nameRegex.exec(block);
      const textMatch = textRegex.exec(block);
      const analysisMatch = analysisRegex.exec(block);
      if (nameMatch && (textMatch || analysisMatch)) {
        const name = cleanText(nameMatch[1]);
        const text = cleanText(textMatch ? textMatch[1] : "");
        const analysis = cleanText(analysisMatch ? analysisMatch[1] : "");
        const combined = [text, analysis].filter(Boolean).join(" ");
        if (name && combined && isRelevantNews(combined)) {
          items.push(`${name}: ${combined}`);
        }
      }
    }

    if (items.length < 5) {
      const altRegex = /<div[^>]*class="[^"]*player-news[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
      while ((match = altRegex.exec(html)) !== null && items.length < 60) {
        const text = cleanText(match[1]);
        if (text.length > 40 && isRelevantNews(text)) {
          items.push(text.slice(0, 300));
        }
      }
    }

    return items;
  } catch (err) {
    console.error("Rotowire fetch error:", err.message);
    return [];
  }
}

// ─── NFL.com RSS ──────────────────────────────────────────────────────────────
async function fetchNflRss() {
  try {
    const feeds = [
      "https://www.nfl.com/rss/rsslanding?searchString=player+news",
      "https://www.rotoworld.com/rss/feed/football/nfl",
    ];

    const items = [];
    for (const url of feeds) {
      try {
        const res = await fetch(url, {
          headers: { "User-Agent": "Mozilla/5.0", "Accept": "application/rss+xml, application/xml" },
          timeout: 8000,
        });
        const xml = await res.text();
        const parsed = await xml2js.parseStringPromise(xml, { explicitArray: false });
        const channel = parsed?.rss?.channel;
        if (!channel) continue;
        const feedItems = Array.isArray(channel.item) ? channel.item : channel.item ? [channel.item] : [];
        feedItems.slice(0, 30).forEach(item => {
          const title = cleanText(item.title || "");
          const desc = cleanText(item.description || "");
          const combined = `${title}. ${desc}`.trim();
          if (combined.length > 30 && isRelevantNews(combined)) {
            items.push(combined.slice(0, 400));
          }
        });
      } catch (feedErr) {
        console.error(`Feed error ${url}:`, feedErr.message);
      }
    }
    return items;
  } catch (err) {
    console.error("NFL RSS error:", err.message);
    return [];
  }
}

// ─── The Athletic scrape (free preview content) ───────────────────────────────
async function fetchAthletic() {
  try {
    const urls = [
      "https://theathletic.com/nfl/",
      "https://theathletic.com/fantasy-football/",
    ];
    const items = [];
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
            "Accept": "text/html",
          },
          timeout: 8000,
        });
        const html = await res.text();
        const headlineRegex = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
        let match;
        while ((match = headlineRegex.exec(html)) !== null && items.length < 20) {
          const text = cleanText(match[1]);
          if (text.length > 20 && isRelevantNews(text)) {
            items.push(text.slice(0, 300));
          }
        }
      } catch (e) {
        console.error(`Athletic fetch ${url}:`, e.message);
      }
    }
    return items;
  } catch (err) {
    console.error("Athletic error:", err.message);
    return [];
  }
}

// ─── Camp news endpoint ───────────────────────────────────────────────────────
app.get("/api/camp-news", async (req, res) => {
  try {
    console.log("Fetching camp news...");
    const [rotowire, nfl, athletic] = await Promise.all([
      fetchRotowire(),
      fetchNflRss(),
      fetchAthletic(),
    ]);

    const allItems = [...rotowire, ...nfl, ...athletic];
    const unique = [...new Set(allItems)].filter(Boolean);

    const grouped = {};
    unique.forEach(item => {
      const firstWord = item.split(":")[0].trim();
      if (!grouped[firstWord]) grouped[firstWord] = item;
    });

    const deduped = Object.values(grouped).slice(0, 120);

    console.log(`Fetched: ${rotowire.length} Rotowire, ${nfl.length} NFL RSS, ${athletic.length} Athletic`);

    res.json({
      success: true,
      count: deduped.length,
      sources: {
        rotowire: rotowire.length,
        nfl: nfl.length,
        athletic: athletic.length,
      },
      notes: deduped,
      fetchedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error("Camp news error:", err);
    res.status(500).json({ success: false, error: err.message, notes: [] });
  }
});

// ─── X handles reference ─────────────────────────────────────────────────────
app.get("/api/x-handles", (req, res) => {
  res.json({
    leagueWide: [
      { handle: "@RapSheet", name: "Ian Rapoport", focus: "Breaking news, injuries" },
      { handle: "@AdamSchefter", name: "Adam Schefter", focus: "Breaking news, trades" },
      { handle: "@TomPelissero", name: "Tom Pelissero", focus: "Contracts, injuries" },
      { handle: "@FieldYates", name: "Field Yates", focus: "Fantasy, roster moves" },
      { handle: "@MathewBerryTMR", name: "Matthew Berry", focus: "Fantasy analysis" },
      { handle: "@Scott_Pianowski", name: "Scott Pianowski", focus: "Fantasy, Yahoo" },
      { handle: "@DaltonDelDon", name: "Dalton Del Don", focus: "Fantasy, Yahoo" },
      { handle: "@PFF_Fantasy", name: "PFF Fantasy", focus: "Grades, analytics" },
      { handle: "@establishtherun", name: "Establish The Run", focus: "RB analytics, camp" },
    ],
    byPosition: {
      QB: ["@RapSheet", "@AdamSchefter", "@PFF_Fantasy"],
      RB: ["@establishtherun", "@PFF_Fantasy", "@FieldYates"],
      WR: ["@FieldYates", "@PFF_Fantasy", "@DaltonDelDon"],
      TE: ["@FieldYates", "@PFF_Fantasy", "@Scott_Pianowski"],
    },
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Fantasy draft server running on port ${PORT}`);
});
