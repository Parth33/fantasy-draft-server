import { useState, useMemo, useCallback, useEffect, useRef, Fragment } from "react";

const SERVER = "https://fantasy-draft-server-production.up.railway.app";

const THEMES = {
  dark: {
    "--bg-app": "#0d1117",
    "--bg-header": "#161b22",
    "--bg-sidebar": "#0d1117",
    "--bg-card": "#161b22",
    "--bg-row": "#1c2128",
    "--bg-row-alt": "#20262e",
    "--bg-row-hover": "#21262d",
    "--bg-row-rec": "#1a2e1a",
    "--bg-row-sel": "#1a2433",
    "--bg-accent-soft": "#1a2e4a",
    "--bg-warn": "#2e1f0a",
    "--bg-danger": "#2e0a0a",
    "--bg-success": "#0a2e0a",
    "--border": "#30363d",
    "--border-accent": "#1f6feb",
    "--text-primary": "#e6edf3",
    "--text-secondary": "#8b949e",
    "--text-muted": "#484f58",
    "--text-accent": "#58a6ff",
    "--text-success": "#3fb950",
    "--text-warning": "#d29922",
    "--text-danger": "#f85149",
    "--tab-active-border": "#58a6ff",
    "--pill-t1": "#1d4ed8",
    "--pill-t2": "#047857",
    "--pill-t3": "#b45309",
    "--pill-t4": "#991b1b",
    "--pos-qb": "#7c3aed",
    "--pos-rb": "#0369a1",
    "--pos-wr": "#0f766e",
    "--pos-te": "#f59e0b",
    "--pos-k": "#4b5563",
    "--pos-def": "#374151",
    "--sig-green": "#34d399",
    "--sig-blue": "#60a5fa",
    "--sig-amber": "#fbbf24",
    "--sig-orange": "#fb923c",
    "--sig-red": "#f87171",
    "--tier-t1": "#1a56db",
    "--tier-t2": "#0e9f6e",
    "--tier-t3": "#c27803",
    "--tier-t4": "#9b1c1c",
    "--bg-needed": "#2e1f0a",
    "--border-needed": "#d29922",
    "--shadow-needed": "0 0 8px rgba(210,153,34,0.5)",
    "--text-needed": "#d29922",
    "--bg-rec-card": "#1a2e4a",
    "--border-rec-card": "#1f6feb",
    "--bg-row-rec-highlight": "#1e3a5f",
    "--border-row-rec-highlight": "#60a5fa",
    "--text-pick-line": "#d29922",
    "--bg-run-banner-start": "#7f1d1d",
    "--bg-run-banner-end": "#c2410c",
    "--border-run-banner": "#fb923c",
    "--text-run-banner": "#ffffff",
  },
  light: {
    "--bg-app": "#f0f4f8",
    "--bg-header": "#ffffff",
    "--bg-sidebar": "#f8fafc",
    "--bg-card": "#ffffff",
    "--bg-row": "#ffffff",
    "--bg-row-alt": "#f6f8fa",
    "--bg-row-hover": "#f1f5f9",
    "--bg-row-rec": "#f0fdf4",
    "--bg-row-sel": "#eff6ff",
    "--bg-accent-soft": "#dbeafe",
    "--bg-warn": "#fefce8",
    "--bg-danger": "#fef2f2",
    "--bg-success": "#f0fdf4",
    "--border": "#e2e8f0",
    "--border-accent": "#3b82f6",
    "--text-primary": "#0f172a",
    "--text-secondary": "#475569",
    "--text-muted": "#94a3b8",
    "--text-accent": "#2563eb",
    "--text-success": "#16a34a",
    "--text-warning": "#d97706",
    "--text-danger": "#dc2626",
    "--tab-active-border": "#2563eb",
    "--pill-t1": "#1d4ed8",
    "--pill-t2": "#047857",
    "--pill-t3": "#b45309",
    "--pill-t4": "#991b1b",
    "--pos-qb": "#7c3aed",
    "--pos-rb": "#0369a1",
    "--pos-wr": "#0f766e",
    "--pos-te": "#b45309",
    "--pos-k": "#6b7280",
    "--pos-def": "#4b5563",
    "--sig-green": "#047857",
    "--sig-blue": "#1d4ed8",
    "--sig-amber": "#b45309",
    "--sig-orange": "#c2410c",
    "--sig-red": "#b91c1c",
    "--tier-t1": "#1a56db",
    "--tier-t2": "#047857",
    "--tier-t3": "#b45309",
    "--tier-t4": "#9b1c1c",
    "--bg-needed": "#fffbeb",
    "--border-needed": "#d97706",
    "--shadow-needed": "none",
    "--text-needed": "#92400e",
    "--bg-rec-card": "#eff6ff",
    "--border-rec-card": "#2563eb",
    "--bg-row-rec-highlight": "#dbeafe",
    "--border-row-rec-highlight": "#2563eb",
    "--text-pick-line": "#b45309",
    "--bg-run-banner-start": "#fee2e2",
    "--bg-run-banner-end": "#ffedd5",
    "--border-run-banner": "#f97316",
    "--text-run-banner": "#9a3412",
  },
};

const POS_COLORS = { QB: "var(--pos-qb)", RB: "var(--pos-rb)", WR: "var(--pos-wr)", TE: "var(--pos-te)", K: "var(--pos-k)", DEF: "var(--pos-def)" };

// Columns: rank, pos, player (name + inline team), bye, o-line, defense, sos, notes (tag chips), actions
const ROW_COLS = "28px 36px 200px 44px 92px 112px 58px 108px 78px";
const ROW_COLS_COMPACT = "22px 28px 210px 40px 72px 88px 46px 90px 76px";

// Valid AI/manual tags — role tags describe usage, sentiment tags describe analyst outlook.
// "[Analyst] LW" tags (e.g. "Boone LW") are dynamic — the AI mints one per analyst who
// calls a player a league winner — so only the generic fallback lives in this static list.
const VALID_TAGS = [
  "Workhorse", "Committee Back", "WR1 Role", "Target Hog", "Depth Only", "Handcuff",
  "Boom/Bust", "Analyst LW", "Analyst Fade", "Injury Risk", "Breakout",
  "Bounce Back", "Rookie Riser", "Aging Concern", "Situation Change",
];

// Matches any dynamic "[Analyst] LW" league-winner tag, e.g. "Boone LW", "Analyst LW".
const LW_TAG_RE = /\bLW$/;

// Consistent color per tag — green for strong role/sentiment, red for risk/fade,
// amber for volatile/uncertain, gold for high-conviction analyst league-winner calls,
// blue for everything else (neutral role notes).
const TAG_COLORS = {
  "Workhorse": "#0e9f6e",
  "WR1 Role": "#0e9f6e",
  "Target Hog": "#0e9f6e",
  "Breakout": "#0e9f6e",
  "Bounce Back": "#0e9f6e",
  "Rookie Riser": "#0e9f6e",
  "Committee Back": "#c27803",
  "Boom/Bust": "#c27803",
  "Situation Change": "#c27803",
  "Depth Only": "#9b1c1c",
  "Analyst Fade": "#9b1c1c",
  "Injury Risk": "#9b1c1c",
  "Aging Concern": "#9b1c1c",
};
const LW_TAG_COLOR = "#B8860B";
function tagColor(tag) { return LW_TAG_RE.test(tag) ? LW_TAG_COLOR : (TAG_COLORS[tag] || "#1a56db"); }

const POSITIONS = ["ALL", "QB", "RB", "WR", "TE", "K", "DEF"];
const TIER_COLORS = { 1: "#1a56db", 2: "#0e9f6e", 3: "#c27803", 4: "#9b1c1c" };
// Theme-aware variant of TIER_COLORS for plain text on card/sidebar backgrounds (badges keep the raw fill above)
const TIER_TEXT_COLORS = { 1: "var(--tier-t1)", 2: "var(--tier-t2)", 3: "var(--tier-t3)", 4: "var(--tier-t4)" };
const TIER_LABELS = {
  QB: { 1: "Elite", 2: "Strong", 3: "Startable", 4: "Streamable" },
  RB: { 1: "Elite", 2: "RB2", 3: "Flex", 4: "Handcuff" },
  WR: { 1: "Elite", 2: "WR2", 3: "Flex", 4: "Depth" },
  TE: { 1: "Elite", 2: "Startable", 3: "Streamable" },
  K: { 1: "All" }, DEF: { 1: "All" },
};

// 2026 PFF O-line rankings. Rank 1-5 Elite, 6-10 Strong, 11-16 Average, 17-22 Below Avg, 23-27 Poor, 28-32 Weak.
const OLINE = {
  DEN:{run:74,pass:76,label:"Elite"},PHI:{run:95,pass:94,label:"Elite"},
  TB:{run:75,pass:78,label:"Elite"},IND:{run:71,pass:72,label:"Elite"},
  CHI:{run:66,pass:64,label:"Elite"},BUF:{run:84,pass:89,label:"Strong"},
  LAC:{run:76,pass:82,label:"Strong"},KC:{run:88,pass:90,label:"Strong"},
  ATL:{run:72,pass:73,label:"Strong"},SF:{run:87,pass:86,label:"Strong"},
  LAR:{run:77,pass:79,label:"Average"},MIN:{run:73,pass:74,label:"Average"},
  NE:{run:64,pass:66,label:"Average"},PIT:{run:74,pass:75,label:"Average"},
  SEA:{run:76,pass:76,label:"Average"},NO:{run:69,pass:63,label:"Average"},
  DAL:{run:78,pass:80,label:"Below Avg"},LV:{run:65,pass:67,label:"Below Avg"},
  DET:{run:93,pass:91,label:"Below Avg"},CIN:{run:82,pass:85,label:"Below Avg"},
  NYJ:{run:63,pass:65,label:"Below Avg"},ARI:{run:62,pass:60,label:"Below Avg"},
  NYG:{run:68,pass:70,label:"Poor"},BAL:{run:92,pass:87,label:"Poor"},
  MIA:{run:80,pass:83,label:"Poor"},CAR:{run:60,pass:62,label:"Poor"},
  HOU:{run:79,pass:81,label:"Poor"},GB:{run:83,pass:82,label:"Weak"},
  TEN:{run:61,pass:61,label:"Weak"},JAX:{run:67,pass:69,label:"Weak"},
  CLE:{run:81,pass:77,label:"Weak"},WAS:{run:70,pass:68,label:"Weak"},
};

const DEF = {
  SF:{rank:1,ppg:14.2,label:"Elite",shootout:false},BAL:{rank:2,ppg:16.1,label:"Elite",shootout:false},
  PHI:{rank:3,ppg:17.4,label:"Elite",shootout:false},KC:{rank:4,ppg:18.2,label:"Strong",shootout:false},
  BUF:{rank:5,ppg:18.8,label:"Strong",shootout:false},CLE:{rank:6,ppg:19.1,label:"Strong",shootout:false},
  MIN:{rank:7,ppg:19.6,label:"Strong",shootout:false},DET:{rank:8,ppg:20.4,label:"Average",shootout:false},
  PIT:{rank:9,ppg:20.8,label:"Average",shootout:false},SEA:{rank:10,ppg:21.2,label:"Average",shootout:false},
  GB:{rank:11,ppg:21.9,label:"Average",shootout:false},IND:{rank:12,ppg:22.1,label:"Average",shootout:false},
  LAR:{rank:13,ppg:22.4,label:"Average",shootout:false},MIA:{rank:14,ppg:22.8,label:"Average",shootout:false},
  DAL:{rank:15,ppg:23.1,label:"Weak",shootout:true},TB:{rank:16,ppg:23.6,label:"Weak",shootout:true},
  HOU:{rank:17,ppg:24.0,label:"Weak",shootout:true},ATL:{rank:18,ppg:24.4,label:"Weak",shootout:true},
  CIN:{rank:19,ppg:24.7,label:"Weak",shootout:true},WAS:{rank:20,ppg:25.1,label:"Weak",shootout:true},
  NO:{rank:21,ppg:25.5,label:"Weak",shootout:true},JAX:{rank:22,ppg:25.8,label:"Very Weak",shootout:true},
  NYG:{rank:23,ppg:26.2,label:"Very Weak",shootout:true},NYJ:{rank:24,ppg:26.6,label:"Very Weak",shootout:true},
  ARI:{rank:25,ppg:27.0,label:"Very Weak",shootout:true},LV:{rank:26,ppg:27.4,label:"Very Weak",shootout:true},
  CHI:{rank:27,ppg:27.8,label:"Very Weak",shootout:true},TEN:{rank:28,ppg:28.2,label:"Very Weak",shootout:true},
  NE:{rank:29,ppg:28.6,label:"Bottom",shootout:true},DEN:{rank:30,ppg:29.0,label:"Bottom",shootout:true},
  LAC:{rank:31,ppg:29.4,label:"Bottom",shootout:true},CAR:{rank:32,ppg:30.2,label:"Bottom",shootout:true},
};

// Buckets mirror the hardcoded DEF table's rank boundaries so defColor/defTextColor keep working unchanged.
function defLabelFromRank(rank) {
  if (rank == null) return "Average";
  if (rank <= 3) return "Elite";
  if (rank <= 7) return "Strong";
  if (rank <= 14) return "Average";
  if (rank <= 21) return "Weak";
  if (rank <= 28) return "Very Weak";
  return "Bottom";
}

// DST draft-value tiers: strong defenses (rank 1-12) tier highest.
function defTierFromRank(rank) {
  if (rank == null) return 5;
  if (rank <= 12) return 1;
  if (rank <= 20) return 2;
  if (rank <= 26) return 3;
  return 4;
}

// Layers imported defense rankings over the hardcoded DEF table, team by team — any team
// missing from the import (or when nothing's been imported) falls back to the hardcoded entry.
function buildEffectiveDefMap(defenseRankings) {
  if (!defenseRankings || !Object.keys(defenseRankings).length) return DEF;
  const map = { ...DEF };
  Object.entries(defenseRankings).forEach(([team, d]) => {
    if (d.rank == null) return;
    map[team] = { rank: d.rank, label: defLabelFromRank(d.rank), shootout: d.rank >= 23, ppg: null };
  });
  return map;
}

// Overrides DEF-position players' tier (and derived risk/safety) using imported defense ranks.
function applyDefenseTiersToPlayers(playersArr, defenseRankings) {
  if (!defenseRankings || !Object.keys(defenseRankings).length) return playersArr;
  return playersArr.map(p => {
    if (p.pos !== "DEF") return p;
    const d = defenseRankings[p.team];
    if (!d || d.rank == null) return p;
    const tier = defTierFromRank(d.rank);
    return { ...p, tier, risk: deriveRisk(tier), safety: deriveSafety(tier) };
  });
}

const SOS = {
  PHI:{e:"A",f:"B",s:92},DET:{e:"B+",f:"B",s:87},KC:{e:"A-",f:"B+",s:89},
  BAL:{e:"B",f:"B-",s:84},BUF:{e:"B+",f:"A-",s:88},DAL:{e:"C+",f:"B",s:72},
  MIA:{e:"B-",f:"B",s:80},CIN:{e:"A-",f:"B+",s:88},GB:{e:"B",f:"C+",s:83},
  SF:{e:"C",f:"B-",s:70},MIN:{e:"B+",f:"B",s:86},LAR:{e:"B-",f:"C+",s:78},
  TB:{e:"B",f:"B+",s:84},SEA:{e:"C+",f:"B-",s:73},PIT:{e:"B-",f:"B",s:80},
  HOU:{e:"A",f:"B+",s:91},ATL:{e:"B+",f:"B",s:87},IND:{e:"B",f:"B-",s:82},
  NYG:{e:"A-",f:"B+",s:88},JAX:{e:"B",f:"C+",s:83},WAS:{e:"B+",f:"B",s:86},
  LV:{e:"C+",f:"B-",s:74},NE:{e:"C",f:"B",s:70},NYJ:{e:"B-",f:"C+",s:79},
  NO:{e:"B",f:"B-",s:83},CAR:{e:"A",f:"B+",s:90},TEN:{e:"B+",f:"B",s:85},
  ARI:{e:"B-",f:"C+",s:78},CHI:{e:"A-",f:"B+",s:88},CLE:{e:"B",f:"B-",s:82},
  LAC:{e:"B+",f:"B",s:85},DEN:{e:"B-",f:"B",s:80},
};

const BASE_PLAYERS = [
  {id:1,name:"Ja'Marr Chase",pos:"WR",team:"CIN",tier:1,rank:1,adp:1.2,bye:7,ppg:24.8,risk:"Low",reward:"High",safety:"Very Safe"},
  {id:2,name:"Justin Jefferson",pos:"WR",team:"MIN",tier:1,rank:2,adp:2.1,bye:6,ppg:23.9,risk:"Low",reward:"High",safety:"Very Safe"},
  {id:3,name:"CeeDee Lamb",pos:"WR",team:"DAL",tier:1,rank:3,adp:3.0,bye:7,ppg:23.2,risk:"Slight",reward:"High",safety:"Safe"},
  {id:4,name:"Bijan Robinson",pos:"RB",team:"ATL",tier:1,rank:4,adp:3.8,bye:12,ppg:22.7,risk:"Low",reward:"High",safety:"Very Safe"},
  {id:5,name:"Breece Hall",pos:"RB",team:"NYJ",tier:1,rank:5,adp:4.2,bye:12,ppg:22.1,risk:"Medium",reward:"High",safety:"Solid"},
  {id:6,name:"Amon-Ra St. Brown",pos:"WR",team:"DET",tier:1,rank:6,adp:5.1,bye:5,ppg:21.8,risk:"Low",reward:"High",safety:"Very Safe"},
  {id:7,name:"Tyreek Hill",pos:"WR",team:"MIA",tier:1,rank:7,adp:5.9,bye:10,ppg:21.4,risk:"Slight",reward:"High",safety:"Safe"},
  {id:8,name:"Puka Nacua",pos:"WR",team:"LAR",tier:1,rank:8,adp:6.4,bye:9,ppg:20.9,risk:"Medium",reward:"High",safety:"Okay"},
  {id:9,name:"Christian McCaffrey",pos:"RB",team:"SF",tier:1,rank:9,adp:7.0,bye:9,ppg:20.6,risk:"High",reward:"High",safety:"Okay"},
  {id:10,name:"Derrick Henry",pos:"RB",team:"BAL",tier:1,rank:10,adp:7.8,bye:14,ppg:20.2,risk:"Medium",reward:"High",safety:"Solid"},
  {id:11,name:"Davante Adams",pos:"WR",team:"LV",tier:2,rank:11,adp:8.5,bye:8,ppg:19.8,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:12,name:"Sam LaPorta",pos:"TE",team:"DET",tier:1,rank:12,adp:9.1,bye:5,ppg:19.4,risk:"Low",reward:"High",safety:"Very Safe"},
  {id:13,name:"Jaylen Waddle",pos:"WR",team:"MIA",tier:2,rank:13,adp:9.7,bye:10,ppg:18.9,risk:"High",reward:"High",safety:"Okay"},
  {id:14,name:"Josh Allen",pos:"QB",team:"BUF",tier:1,rank:14,adp:10.2,bye:9,ppg:31.4,risk:"Low",reward:"High",safety:"Very Safe"},
  {id:15,name:"Lamar Jackson",pos:"QB",team:"BAL",tier:1,rank:15,adp:10.8,bye:14,ppg:30.8,risk:"Low",reward:"High",safety:"Very Safe"},
  {id:16,name:"Stefon Diggs",pos:"WR",team:"HOU",tier:2,rank:16,adp:11.4,bye:14,ppg:18.4,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:17,name:"Tony Pollard",pos:"RB",team:"TEN",tier:2,rank:17,adp:12.0,bye:5,ppg:17.9,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:18,name:"Travis Kelce",pos:"TE",team:"KC",tier:1,rank:18,adp:12.5,bye:12,ppg:17.6,risk:"High",reward:"Solid",safety:"Okay"},
  {id:19,name:"Isiah Pacheco",pos:"RB",team:"KC",tier:2,rank:19,adp:13.1,bye:12,ppg:17.2,risk:"Medium",reward:"Solid",safety:"Solid"},
  {id:20,name:"DeVonta Smith",pos:"WR",team:"PHI",tier:2,rank:20,adp:13.8,bye:5,ppg:16.9,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:21,name:"Nick Chubb",pos:"RB",team:"CLE",tier:2,rank:21,adp:14.4,bye:5,ppg:16.6,risk:"High",reward:"Solid",safety:"Okay"},
  {id:22,name:"Kyren Williams",pos:"RB",team:"LAR",tier:2,rank:22,adp:15.0,bye:9,ppg:16.3,risk:"Medium",reward:"Solid",safety:"Solid"},
  {id:23,name:"A.J. Brown",pos:"WR",team:"PHI",tier:2,rank:23,adp:15.6,bye:5,ppg:16.0,risk:"Medium",reward:"High",safety:"Solid"},
  {id:24,name:"Patrick Mahomes",pos:"QB",team:"KC",tier:1,rank:24,adp:16.2,bye:12,ppg:29.8,risk:"Low",reward:"High",safety:"Very Safe"},
  {id:25,name:"Joe Burrow",pos:"QB",team:"CIN",tier:1,rank:25,adp:17.0,bye:7,ppg:29.2,risk:"Medium",reward:"High",safety:"Solid"},
  {id:26,name:"Raheem Mostert",pos:"RB",team:"MIA",tier:2,rank:26,adp:17.6,bye:10,ppg:15.7,risk:"High",reward:"Solid",safety:"Okay"},
  {id:27,name:"Mike Evans",pos:"WR",team:"TB",tier:2,rank:27,adp:18.2,bye:11,ppg:15.4,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:28,name:"Keenan Allen",pos:"WR",team:"CHI",tier:2,rank:28,adp:18.8,bye:7,ppg:15.1,risk:"Medium",reward:"Solid",safety:"Solid"},
  {id:29,name:"Mark Andrews",pos:"TE",team:"BAL",tier:2,rank:29,adp:19.4,bye:14,ppg:14.8,risk:"High",reward:"Solid",safety:"Okay"},
  {id:30,name:"Tee Higgins",pos:"WR",team:"CIN",tier:2,rank:30,adp:20.0,bye:7,ppg:14.5,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:31,name:"De'Von Achane",pos:"RB",team:"MIA",tier:2,rank:31,adp:20.6,bye:10,ppg:14.2,risk:"High",reward:"High",safety:"Okay"},
  {id:32,name:"Jalen Hurts",pos:"QB",team:"PHI",tier:2,rank:32,adp:21.2,bye:5,ppg:28.6,risk:"Medium",reward:"High",safety:"Solid"},
  {id:33,name:"Dak Prescott",pos:"QB",team:"DAL",tier:2,rank:33,adp:22.0,bye:7,ppg:27.9,risk:"High",reward:"High",safety:"Okay"},
  {id:34,name:"D.J. Moore",pos:"WR",team:"CHI",tier:3,rank:34,adp:22.8,bye:7,ppg:13.9,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:35,name:"Tyler Lockett",pos:"WR",team:"SEA",tier:3,rank:35,adp:23.4,bye:5,ppg:13.6,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:36,name:"James Cook",pos:"RB",team:"BUF",tier:2,rank:36,adp:24.0,bye:9,ppg:13.3,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:37,name:"Zay Flowers",pos:"WR",team:"BAL",tier:3,rank:37,adp:24.6,bye:14,ppg:13.0,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:38,name:"David Njoku",pos:"TE",team:"CLE",tier:2,rank:38,adp:25.2,bye:5,ppg:12.8,risk:"Medium",reward:"Solid",safety:"Solid"},
  {id:39,name:"Jaylen Warren",pos:"RB",team:"PIT",tier:3,rank:39,adp:26.0,bye:9,ppg:12.5,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:40,name:"Evan Engram",pos:"TE",team:"JAX",tier:2,rank:40,adp:26.6,bye:11,ppg:12.2,risk:"Medium",reward:"Solid",safety:"Solid"},
  {id:41,name:"Gus Edwards",pos:"RB",team:"LAC",tier:3,rank:41,adp:27.2,bye:5,ppg:11.9,risk:"Medium",reward:"Solid",safety:"Solid"},
  {id:42,name:"Chris Godwin",pos:"WR",team:"TB",tier:3,rank:42,adp:28.0,bye:11,ppg:11.6,risk:"High",reward:"Solid",safety:"Okay"},
  {id:43,name:"Courtland Sutton",pos:"WR",team:"DEN",tier:3,rank:43,adp:28.6,bye:9,ppg:11.3,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:44,name:"Calvin Ridley",pos:"WR",team:"TEN",tier:3,rank:44,adp:29.2,bye:5,ppg:11.0,risk:"Medium",reward:"Solid",safety:"Solid"},
  {id:45,name:"Jordan Love",pos:"QB",team:"GB",tier:2,rank:45,adp:30.0,bye:10,ppg:27.2,risk:"Slight",reward:"High",safety:"Safe"},
  {id:46,name:"Jake Ferguson",pos:"TE",team:"DAL",tier:2,rank:46,adp:30.6,bye:7,ppg:10.8,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:47,name:"T.J. Hockenson",pos:"TE",team:"MIN",tier:2,rank:47,adp:31.2,bye:6,ppg:10.5,risk:"High",reward:"Solid",safety:"Okay"},
  {id:48,name:"Jonathan Taylor",pos:"RB",team:"IND",tier:3,rank:48,adp:32.0,bye:14,ppg:10.2,risk:"High",reward:"High",safety:"Okay"},
  {id:49,name:"D'Andre Swift",pos:"RB",team:"CHI",tier:3,rank:49,adp:32.8,bye:7,ppg:9.9,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:50,name:"Jared Goff",pos:"QB",team:"DET",tier:2,rank:50,adp:33.4,bye:5,ppg:26.8,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:51,name:"Terry McLaurin",pos:"WR",team:"WAS",tier:3,rank:51,adp:34.0,bye:14,ppg:9.6,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:52,name:"Tank Dell",pos:"WR",team:"HOU",tier:3,rank:52,adp:34.6,bye:14,ppg:9.3,risk:"High",reward:"High",safety:"Okay"},
  {id:53,name:"George Kittle",pos:"TE",team:"SF",tier:2,rank:53,adp:35.2,bye:9,ppg:9.0,risk:"Medium",reward:"High",safety:"Solid"},
  {id:54,name:"Rashee Rice",pos:"WR",team:"KC",tier:3,rank:54,adp:36.0,bye:12,ppg:8.8,risk:"High",reward:"High",safety:"Okay"},
  {id:55,name:"Trey McBride",pos:"TE",team:"ARI",tier:2,rank:55,adp:36.8,bye:11,ppg:8.5,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:56,name:"Jordan Addison",pos:"WR",team:"MIN",tier:3,rank:56,adp:37.4,bye:6,ppg:8.2,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:57,name:"Kenneth Walker III",pos:"RB",team:"SEA",tier:3,rank:57,adp:38.0,bye:5,ppg:7.9,risk:"Medium",reward:"Solid",safety:"Solid"},
  {id:58,name:"Josh Jacobs",pos:"RB",team:"GB",tier:3,rank:58,adp:38.6,bye:10,ppg:7.6,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:59,name:"Drake London",pos:"WR",team:"ATL",tier:3,rank:59,adp:39.2,bye:12,ppg:7.4,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:60,name:"Deebo Samuel",pos:"WR",team:"SF",tier:3,rank:60,adp:40.0,bye:9,ppg:7.2,risk:"High",reward:"Solid",safety:"Okay"},
  {id:61,name:"Rhamondre Stevenson",pos:"RB",team:"NE",tier:3,rank:61,adp:40.8,bye:14,ppg:7.0,risk:"Slight",reward:"Solid",safety:"Safe"},
  {id:62,name:"Romeo Doubs",pos:"WR",team:"GB",tier:4,rank:62,adp:41.4,bye:10,ppg:6.8,risk:"Medium",reward:"Solid",safety:"Solid"},
  {id:63,name:"Cam Akers",pos:"RB",team:"MIN",tier:4,rank:63,adp:42.0,bye:6,ppg:6.6,risk:"High",reward:"Solid",safety:"Okay"},
  {id:64,name:"Jameson Williams",pos:"WR",team:"DET",tier:3,rank:64,adp:42.8,bye:5,ppg:6.4,risk:"High",reward:"High",safety:"Okay"},
  {id:65,name:"Jaylen McTelvin",pos:"WR",team:"BUF",tier:4,rank:65,adp:43.4,bye:9,ppg:6.2,risk:"Medium",reward:"Solid",safety:"Solid"},
  {id:66,name:"Chuba Hubbard",pos:"RB",team:"CAR",tier:3,rank:66,adp:44.0,bye:11,ppg:6.0,risk:"Medium",reward:"Solid",safety:"Solid"},
  {id:67,name:"Justin Tucker",pos:"K",team:"BAL",tier:1,rank:67,adp:120.0,bye:14,ppg:9.2,risk:"Low",reward:"Solid",safety:"Very Safe"},
  {id:68,name:"Evan McPherson",pos:"K",team:"CIN",tier:1,rank:68,adp:122.0,bye:7,ppg:8.9,risk:"Low",reward:"Solid",safety:"Very Safe"},
  {id:69,name:"Harrison Butker",pos:"K",team:"KC",tier:1,rank:69,adp:124.0,bye:12,ppg:8.7,risk:"Low",reward:"Solid",safety:"Very Safe"},
  {id:70,name:"San Francisco 49ers",pos:"DEF",team:"SF",tier:1,rank:70,adp:100.0,bye:9,ppg:10.4,risk:"Low",reward:"High",safety:"Very Safe"},
  {id:71,name:"Dallas Cowboys",pos:"DEF",team:"DAL",tier:1,rank:71,adp:102.0,bye:7,ppg:9.9,risk:"Slight",reward:"High",safety:"Safe"},
  {id:72,name:"Baltimore Ravens",pos:"DEF",team:"BAL",tier:1,rank:72,adp:104.0,bye:14,ppg:9.7,risk:"Low",reward:"High",safety:"Very Safe"},
];

const ROSTER_SLOTS = ["QB","WR","WR","WR","RB","RB","TE","FLEX","K","DEF","BN","BN","BN","BN","BN"];

// Finds the index a drafted player should occupy in a fixed-length (15) roster array:
// exact position slot first, then FLEX for RB/WR/TE, then the first open bench slot.
function assignRosterSlot(roster, pos) {
  let idx = ROSTER_SLOTS.findIndex((slot,i)=>slot===pos&&!roster[i]);
  if (idx===-1 && (pos==="RB"||pos==="WR"||pos==="TE")) {
    idx = ROSTER_SLOTS.findIndex((slot,i)=>slot==="FLEX"&&!roster[i]);
  }
  if (idx===-1) {
    idx = ROSTER_SLOTS.findIndex((slot,i)=>slot==="BN"&&!roster[i]);
  }
  return idx;
}

// "Josh Allen" -> "J. Allen", "Christian McCaffrey" -> "C. McCaffrey"
function formatRosterName(fullName) {
  const parts = fullName.trim().split(" ");
  if (parts.length < 2) return fullName;
  return `${parts[0][0].toUpperCase()}. ${parts[parts.length-1]}`;
}

// 1 -> "1st", 3 -> "3rd", 11 -> "11th"
function ordinal(n) {
  const suffixes = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return `${n}${suffixes[(v - 20) % 10] || suffixes[v] || suffixes[0]}`;
}

function olineGrade(team, pos) {
  const g = OLINE[team]; if (!g) return {score:70,label:"Average"};
  return pos === "RB" ? {score:g.run,label:g.label} : {score:g.pass,label:g.label};
}
function olineColor(l) { return l==="Elite"?"#0e9f6e":l==="Strong"?"#1a56db":l==="Average"?"#c27803":l==="Below Avg"?"#e05a3a":"#9b1c1c"; }
function defColor(l) { return (l==="Elite"||l==="Strong")?"#9b1c1c":l==="Average"?"#c27803":"#0e9f6e"; }
function sosColor(g) { return (g==="A"||g==="A-"||g==="A+")?"#0e9f6e":(g==="B+"||g==="B")?"#1a56db":g==="B-"?"#c27803":"#9b1c1c"; }
// Theme-aware variants of the above for small colored text on rows (badges keep the dimmer fills above since they sit on solid backgrounds with white text)
function olineTextColor(l) { return l==="Elite"?"var(--sig-green)":l==="Strong"?"var(--sig-blue)":l==="Average"?"var(--sig-amber)":l==="Below Avg"?"var(--sig-orange)":"var(--sig-red)"; }
function defTextColor(l) { return (l==="Elite"||l==="Strong")?"var(--sig-red)":l==="Average"?"var(--sig-amber)":"var(--sig-green)"; }
function sosTextColor(g) { return (g==="A"||g==="A-"||g==="A+")?"var(--sig-green)":(g==="B+"||g==="B")?"var(--sig-blue)":g==="B-"?"var(--sig-amber)":"var(--sig-red)"; }
// Camp analysis returns risk/reward/safety as 1-10 numbers instead of category strings.
// Bucket them into the same four tiers for all three bars: 1-3 red, 4-6 amber, 7-8 green, 9-10 bright green.
function scoreTier(v) {
  if (v <= 3) return { label:"Low Risk", color:"#9b1c1c", textColor:"var(--sig-red)" };
  if (v <= 6) return { label:"Moderate", color:"#c27803", textColor:"var(--sig-amber)" };
  if (v <= 8) return { label:"Solid", color:"#0e9f6e", textColor:"var(--sig-green)" };
  return { label:"Elite", color:"#00c853", textColor:"#00c853" };
}
function scoreLabel(v) { return typeof v === "number" ? scoreTier(v).label : v; }
function riskColor(r) { if (typeof r === "number") return scoreTier(r).color; return r==="Low"?"#0e9f6e":r==="Slight"?"#1a56db":r==="Medium"?"#c27803":"#9b1c1c"; }
// Theme-aware readable text variant of riskColor (raw riskColor fill is too dim as text on dark backgrounds)
function riskTextColor(r) { if (typeof r === "number") return scoreTier(r).textColor; return r==="Low"?"var(--sig-green)":r==="Slight"?"var(--sig-blue)":r==="Medium"?"var(--sig-amber)":"var(--sig-red)"; }
function safetyColor(s) { if (typeof s === "number") return scoreTier(s).color; return (s==="Very Safe"||s==="Safe")?"#0e9f6e":s==="Solid"?"#1a56db":s==="Okay"?"#c27803":"#9b1c1c"; }
// Theme-aware variant of safetyColor for plain text on card/row backgrounds (badges keep the raw fill above)
function safetyTextColor(s) { if (typeof s === "number") return scoreTier(s).textColor; return (s==="Very Safe"||s==="Safe")?"var(--sig-green)":s==="Solid"?"var(--sig-blue)":s==="Okay"?"var(--sig-amber)":"var(--sig-red)"; }
function rewardColor(r) { if (typeof r === "number") return scoreTier(r).color; return r==="High"?"#0e9f6e":r==="Solid"?"#1a56db":"#c27803"; }
// Theme-aware readable text variant of rewardColor
function rewardTextColor(r) { if (typeof r === "number") return scoreTier(r).textColor; return r==="High"?"var(--sig-green)":r==="Solid"?"var(--sig-blue)":"var(--sig-amber)"; }
function meterWidth(val) {
  if (typeof val === "number") return Math.max(5, Math.min(100, val*10));
  const map = {"Low":15,"Slight":35,"Medium":60,"High":90,"Very Safe":90,"Safe":72,"Solid":55,"Okay":35,"High reward":90,"Solid reward":65};
  return map[val] || 50;
}
// Overview CSV's 1-5 upside/bust ratings — higher upside is good (green), higher bust risk is bad (red).
function upsideColor(v) {
  if (v == null) return "var(--text-muted)";
  if (v >= 5) return "#00c853";
  if (v === 4) return "var(--sig-green)";
  if (v === 3) return "var(--sig-amber)";
  return "var(--sig-red)";
}
function bustColor(v) {
  if (v == null) return "var(--text-muted)";
  if (v <= 1) return "var(--sig-green)";
  if (v === 2) return "var(--sig-green)";
  if (v === 3) return "var(--sig-amber)";
  return "var(--sig-red)";
}

// ---- FantasyPros CSV import ----

const MAIN_POOL_CAP = 300;

const TEAM_ALIASES = { JAC:"JAX", WSH:"WAS", LVR:"LV", OAK:"LV", SD:"LAC", STL:"LAR", LA:"LAR", NOS:"NO", TBB:"TB", SFO:"SF", GNB:"GB", KAN:"KC", NWE:"NE" };
const TEAM_NICKNAMES = ["49ers","cowboys","ravens","eagles","chiefs","bills","bengals","dolphins","packers","texans","rams","buccaneers","seahawks","steelers","vikings","falcons","colts","giants","jaguars","commanders","raiders","patriots","jets","saints","panthers","titans","cardinals","bears","browns","chargers","broncos","lions"];

// Robust CSV parser: handles quoted fields, escaped quotes, and commas inside quotes.
function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { field += '"'; i++; }
        else inQuotes = false;
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field); field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(field); field = "";
      if (row.some(v => v !== "")) rows.push(row);
      row = [];
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length) {
    row.push(field);
    if (row.some(v => v !== "")) rows.push(row);
  }
  return rows;
}

function headerIndex(headers, name) {
  return headers.findIndex(h => h.trim().toUpperCase() === name);
}
function parseIntSafe(v) {
  const n = parseInt(String(v ?? "").replace(/[^0-9-]/g, ""), 10);
  return Number.isFinite(n) ? n : null;
}
function parseFloatSafe(v) {
  const n = parseFloat(String(v ?? "").replace(/[^0-9.-]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function parseSosStars(v) {
  const m = String(v ?? "").match(/(\d+(\.\d+)?)/);
  if (!m) return null;
  return Math.max(0, Math.min(5, Math.round(parseFloat(m[1]))));
}
function splitPosRank(raw) {
  const m = String(raw ?? "").trim().toUpperCase().match(/^([A-Z]+)(\d+)$/);
  if (!m) return { pos: String(raw ?? "").trim().toUpperCase(), posRank: null };
  return { pos: m[1], posRank: parseInt(m[2], 10) };
}
function normalizeTeam(t) {
  const up = String(t ?? "").trim().toUpperCase();
  return TEAM_ALIASES[up] || up;
}
function normalizeName(n) {
  return String(n ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}
function deriveSafety(tier) {
  const t = tier ?? 5;
  if (t <= 1) return "Very Safe";
  if (t === 2) return "Safe";
  if (t === 3) return "Solid";
  return "Okay";
}
function deriveRisk(tier) {
  const t = tier ?? 5;
  if (t <= 1) return "Low";
  if (t === 2) return "Slight";
  if (t === 3) return "Medium";
  return "High";
}
function deriveReward(sosStars) {
  const s = sosStars ?? 2;
  if (s >= 4) return "High";
  if (s >= 2) return "Solid";
  return "Low";
}
function ecrVsAdpNum(v) {
  if (v == null) return null;
  const s = String(v).trim();
  if (s === "" || s === "-" || s === "—") return null;
  const n = parseFloat(s.replace(/[^0-9.+-]/g, ""));
  return Number.isFinite(n) ? n : null;
}
function ecrVsAdpColor(v) {
  const n = ecrVsAdpNum(v);
  if (n == null) return "var(--text-muted)";
  if (n > 0) return "#22c55e";
  if (n < 0) return "#f59e0b";
  return "var(--text-muted)";
}

// Parses one FantasyPros CSV. forcedPos is null for the main ALL file (POS column present),
// or "K"/"DEF" for the dedicated position files (no POS column).
function parseFantasyProsRows(text, forcedPos) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const headers = rows[0];
  const idx = {
    rk: headerIndex(headers, "RK"),
    tiers: headerIndex(headers, "TIERS"),
    name: headerIndex(headers, "PLAYER NAME"),
    team: headerIndex(headers, "TEAM"),
    pos: headerIndex(headers, "POS"),
    bye: headerIndex(headers, "BYE WEEK"),
    sos: headerIndex(headers, "SOS SEASON"),
    ecr: headerIndex(headers, "ECR VS. ADP"),
    best: headerIndex(headers, "BEST"),
    worst: headerIndex(headers, "WORST"),
    avg: headerIndex(headers, "AVG."),
    stddev: headerIndex(headers, "STD.DEV"),
    notes: headerIndex(headers, "NOTES"),
    upside: headerIndex(headers, "UPSIDE"),
    bust: headerIndex(headers, "BUST"),
  };
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = idx.name >= 0 ? (r[idx.name] || "").trim() : "";
    if (!name) continue;
    const rank = idx.rk >= 0 ? parseIntSafe(r[idx.rk]) : null;
    if (rank == null) continue;
    const tier = idx.tiers >= 0 ? parseIntSafe(r[idx.tiers]) : null;
    const team = normalizeTeam(idx.team >= 0 ? r[idx.team] : "");
    let pos, posRank;
    if (forcedPos) {
      pos = forcedPos;
      posRank = rank;
    } else {
      const split = splitPosRank(idx.pos >= 0 ? r[idx.pos] : "");
      pos = split.pos === "DST" ? "DEF" : split.pos;
      posRank = split.posRank;
    }
    const bye = idx.bye >= 0 ? parseIntSafe(r[idx.bye]) : null;
    const sosStars = idx.sos >= 0 ? parseSosStars(r[idx.sos]) : null;
    const ecrVsAdp = idx.ecr >= 0 ? ((r[idx.ecr] || "").trim() || "-") : "-";
    const best = idx.best >= 0 ? parseFloatSafe(r[idx.best]) : null;
    const worst = idx.worst >= 0 ? parseFloatSafe(r[idx.worst]) : null;
    const avg = idx.avg >= 0 ? parseFloatSafe(r[idx.avg]) : null;
    const stddev = idx.stddev >= 0 ? parseFloatSafe(r[idx.stddev]) : null;
    const notes = idx.notes >= 0 ? (r[idx.notes] || "").trim() : "";
    const upside = idx.upside >= 0 ? parseSosStars(r[idx.upside]) : null;
    const bust = idx.bust >= 0 ? parseSosStars(r[idx.bust]) : null;
    out.push({ rank, tier, name, team, pos, posRank, bye, sosStars, ecrVsAdp, best, worst, avg, stddev, notes, upside, bust });
  }
  return out;
}

// Parses a Notes CSV independent of rank — unlike parseFantasyProsRows, a row isn't dropped
// for lacking an RK column, since Notes files only need to supply name/team/pos/bye/notes.
function parseNotesRows(text) {
  const rows = parseCSV(text);
  if (!rows.length) return [];
  const headers = rows[0];
  const idx = {
    name: headerIndex(headers, "PLAYER NAME"),
    team: headerIndex(headers, "TEAM"),
    pos: headerIndex(headers, "POS"),
    bye: headerIndex(headers, "BYE WEEK"),
    notes: headerIndex(headers, "NOTES"),
  };
  const out = [];
  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    const name = idx.name >= 0 ? (r[idx.name] || "").trim() : "";
    if (!name) continue;
    const team = normalizeTeam(idx.team >= 0 ? r[idx.team] : "");
    const pos = idx.pos >= 0 ? splitPosRank(r[idx.pos]).pos : "";
    const bye = idx.bye >= 0 ? parseIntSafe(r[idx.bye]) : null;
    const notes = idx.notes >= 0 ? (r[idx.notes] || "").trim() : "";
    out.push({ name, team, pos, bye, notes });
  }
  return out;
}

// Identifies a player-data CSV's role from its headers (never from filename).
// Overview and Notes files are checked first since they share most columns with the
// main Rankings file but carry a distinguishing column (UPSIDE/BUST, or NOTES without BEST).
function classifyFileKind(text) {
  const rows = parseCSV(text);
  if (!rows.length) return "unknown";
  const headers = rows[0];
  const has = name => headerIndex(headers, name) >= 0;
  if (has("UPSIDE") && has("BUST")) return "overview";
  if (has("NOTES") && !has("BEST")) return "notes";
  if (has("POS")) return "main";
  const nameIdx = headerIndex(headers, "PLAYER NAME");
  const firstName = (rows[1]?.[nameIdx] || "").toLowerCase();
  if (TEAM_NICKNAMES.some(n => firstName.includes(n))) return "DEF";
  return "K";
}

function toAppPlayer(raw, id) {
  const tier = raw.tier ?? 5;
  return {
    id, name: raw.name, pos: raw.pos, team: raw.team, tier,
    rank: raw.rank, adp: raw.rank, bye: raw.bye,
    posRank: raw.posRank, sosStars: raw.sosStars, ecrVsAdp: raw.ecrVsAdp,
    best: raw.best, worst: raw.worst, avg: raw.avg, stddev: raw.stddev,
    upside: raw.upside ?? null, bust: raw.bust ?? null, notes: raw.notes || "",
    risk: deriveRisk(tier), reward: deriveReward(raw.sosStars), safety: deriveSafety(tier),
  };
}

// Merges the Rankings file with optional Notes, Overview, and dedicated K/DST files — all
// matched by normalized player name, all identified by header shape rather than filename.
// Notes supplies bye (primary) + notes text; Overview supplies bye (fallback), upside, bust,
// and sosStars; dedicated K/DST files override tier/posRank/bye/sosStars/ecrVsAdp for players
// already in the main pool, and supplement any K/DST players missing from the top-N cut.
function buildImportedPlayerData(files) {
  let mainFile = null, kFile = null, defFile = null, notesFile = null, overviewFile = null;
  const fileSummaries = [];
  files.forEach(f => {
    const kind = classifyFileKind(f.text);
    fileSummaries.push({ name: f.name, kind });
    if (kind === "main" && !mainFile) mainFile = f;
    else if (kind === "K" && !kFile) kFile = f;
    else if (kind === "DEF" && !defFile) defFile = f;
    else if (kind === "notes" && !notesFile) notesFile = f;
    else if (kind === "overview" && !overviewFile) overviewFile = f;
  });
  if (!mainFile) throw new Error("No Rankings file found (needs BEST/WORST/AVG./STD.DEV columns).");

  const mainRows = parseFantasyProsRows(mainFile.text, null);
  const sortedMain = [...mainRows].sort((a, b) => a.rank - b.rank).slice(0, MAIN_POOL_CAP);

  const byKey = new Map();
  sortedMain.forEach(p => byKey.set(normalizeName(p.name), p));

  const applyOverride = (file, forcedPos, offset) => {
    if (!file) return;
    parseFantasyProsRows(file.text, forcedPos).forEach(r => {
      const key = normalizeName(r.name);
      const existing = byKey.get(key);
      if (existing) {
        byKey.set(key, {
          ...existing,
          tier: r.tier ?? existing.tier,
          posRank: r.posRank ?? existing.posRank,
          bye: r.bye ?? existing.bye,
          sosStars: r.sosStars ?? existing.sosStars,
          ecrVsAdp: r.ecrVsAdp ?? existing.ecrVsAdp,
          pos: forcedPos,
          team: r.team || existing.team,
        });
      } else {
        byKey.set(key, { ...r, rank: offset + (r.posRank ?? 1) });
      }
    });
  };
  applyOverride(kFile, "K", 900);
  applyOverride(defFile, "DEF", 950);

  // Notes: primary bye source + Intel Drop text. Only touches players already in the pool.
  let notesText = "", notesCount = 0;
  if (notesFile) {
    const notesRows = parseNotesRows(notesFile.text);
    const withNotes = notesRows.filter(r => r.notes);
    notesCount = withNotes.length;
    notesText = withNotes.map(r => `${r.name} (${r.team}, ${r.pos}): ${r.notes}`).join("\n");
    notesRows.forEach(r => {
      const key = normalizeName(r.name);
      const existing = byKey.get(key);
      if (!existing) return;
      byKey.set(key, { ...existing, bye: r.bye ?? existing.bye, notes: r.notes || existing.notes });
    });
  }

  // Overview: upside/bust + sosStars, and bye as a fallback only if Notes didn't already set it.
  let overviewCount = 0;
  if (overviewFile) {
    const overviewRows = parseFantasyProsRows(overviewFile.text, null);
    overviewCount = overviewRows.length;
    overviewRows.forEach(r => {
      const key = normalizeName(r.name);
      const existing = byKey.get(key);
      if (!existing) return;
      byKey.set(key, {
        ...existing,
        bye: existing.bye ?? r.bye,
        sosStars: r.sosStars ?? existing.sosStars,
        upside: r.upside,
        bust: r.bust,
      });
    });
  }

  const merged = Array.from(byKey.values()).sort((a, b) => a.rank - b.rank);
  const players = merged.map((p, i) => toAppPlayer(p, i + 1));
  return { players, fileSummaries, notesText, notesCount, overviewCount };
}

function getRecs(available, roster, round, defMap = DEF) {
  const counts = {QB:0,RB:0,WR:0,TE:0,K:0,DEF:0};
  roster.forEach(p => { if(p&&counts[p.pos]!==undefined) counts[p.pos]++; });
  return available.map(p => {
    let score = (150 - p.rank) * 2;
    const ol = olineGrade(p.team, p.pos);
    const d = defMap[p.team]; const s = SOS[p.team];
    score += (ol.score - 70) * 0.4;
    if (d?.shootout && (p.pos==="WR"||p.pos==="QB")) score += 6;
    if (s) score += (s.s - 80) * 0.25;
    if (p.safety==="Very Safe") score += 8; else if (p.safety==="Safe") score += 4;
    if (p.reward==="High") score += 6;
    if (p.risk==="High") score -= 5;
    if (round<=6) {
      if (counts.RB<2&&p.pos==="RB") score+=14;
      if (counts.WR<3&&p.pos==="WR") score+=12;
      if (counts.QB===0&&p.pos==="QB") score+=9;
      if (counts.TE===0&&p.pos==="TE") score+=8;
    } else if (round<=10) {
      if (counts.TE===0&&p.pos==="TE") score+=16;
      if (counts.QB===0&&p.pos==="QB") score+=13;
    } else {
      if ((p.pos==="K"||p.pos==="DEF")&&round>=13) score+=22;
    }
    return {...p, recScore:score};
  }).sort((a,b)=>b.recScore-a.recScore).slice(0,3);
}

function getReason(p, roster, round, defMap = DEF) {
  const counts={QB:0,RB:0,WR:0,TE:0}; roster.forEach(r=>{if(r&&counts[r.pos]!==undefined)counts[r.pos]++;});
  const ol=olineGrade(p.team,p.pos); const d=defMap[p.team]; const s=SOS[p.team];
  const parts=[];
  if (p.tier===1) parts.push("Tier 1 on board");
  if (p.safety==="Very Safe") parts.push("Very safe pick");
  if (ol.label==="Elite"&&p.pos==="RB") parts.push("Elite run-blocking line");
  if (ol.label==="Elite"&&(p.pos==="WR"||p.pos==="QB")) parts.push("Elite pass protection");
  if (d?.shootout&&(p.pos==="WR"||p.pos==="QB")) parts.push("Weak D drives volume");
  if (s&&(s.e==="A"||s.e==="A-")) parts.push("Great early schedule");
  if (counts.RB<2&&p.pos==="RB") parts.push("Need RB depth");
  if (counts.TE===0&&p.pos==="TE") parts.push("No TE yet");
  if (counts.QB===0&&p.pos==="QB") parts.push("No QB yet");
  return parts.slice(0,2).join(" · ") || "Solid value at ADP";
}

// Rule-based draft strategy engine — half-PPR, roster QB/RB×2/WR×3/TE/FLEX/K/DEF/BN×5.
// `currentRound` is derived independently per league from that league's own pick count
// (drafted.length / teams), not the shared round/pick state, so League 1 and League 2
// each get advice matched to their own draft progress even when interleaved.
function getStrategyRecommendations({ currentRound, picksIntoRound, teams, roster, bestAvailableByPos, scarcity, tiersByPos, runAlert }) {
  const counts = {QB:0,RB:0,WR:0,TE:0,K:0,DEF:0};
  roster.forEach(p => { if (p && counts[p.pos]!==undefined) counts[p.pos]++; });

  const bestOf = (pos) => {
    const p = bestAvailableByPos[pos];
    return p ? ` ${p.name}, #${p.rank} is the best available.` : "";
  };

  const items = [];
  const push = (icon, text) => items.push(`${icon} ${text}`);

  // --- Zero-starter urgency ---
  if (currentRound>=3 && currentRound<=5 && counts.RB===0) {
    push("🚨", `No RB yet — prioritize RB this pick, scarcity is real.${bestOf("RB")}`);
  }
  if (currentRound>=3 && currentRound<=5 && counts.WR===0) {
    push("🚨", `No WR yet — WR depth exists but you need a starter.${bestOf("WR")}`);
  }
  if (currentRound>=12 && counts.QB===0) {
    push("⚠", `Draft a QB this pick — running out of rounds.${bestOf("QB")}`);
  }

  // --- Positional run momentum (already tracked via recent picks) ---
  if (runAlert?.pos==="RB") push("🔥", "RB run happening — consider joining or you may be left behind at RB.");
  if (runAlert?.pos==="QB") push("🔥", "QB run — decide now if you want one before they're gone.");
  if (runAlert?.pos==="WR") push("📊", "WR run happening — plenty of WR depth, stay patient unless a value is there.");

  // --- Balance rules ---
  if (currentRound>=5 && counts.WR>=3 && counts.RB===0) {
    push("⚖", `Heavy WR, no RB — pivot to RB now or commit to Zero-RB and target volume backs rounds 5-8.${bestOf("RB")}`);
  }
  if (currentRound>=5 && counts.RB>=3 && counts.WR===0) {
    push("⚖", `Heavy RB, no WR — grab a WR starter this pick.${bestOf("WR")}`);
  }

  // --- Early elite RB tier warning (round 2, ending soon) ---
  if (currentRound===2 && picksIntoRound>=Math.ceil(teams/2) && counts.RB===0) {
    const n = (scarcity.RB?.[1]||0) + (scarcity.RB?.[2]||0);
    push("⚠", `Secure an elite RB — only ${n} tier-1/2 RBs remain. Missing early RB tiers means chasing all season.${bestOf("RB")}`);
  }

  // --- Elite TE window ---
  if (currentRound>=5 && counts.TE===0) {
    const eliteTe = (tiersByPos.TE?.[1]||[])[0];
    if (eliteTe) push("💎", `Elite TE available — grab now, scarce position. ${eliteTe.name}, #${eliteTe.rank} is the best available.`);
  }

  // --- Complete starting lineup (RB2, WR2, WR3) ---
  if (currentRound>=5 && currentRound<=8 && (counts.RB<2 || counts.WR<3)) {
    const missing=[];
    for (let i=counts.RB+1;i<=2;i++) missing.push(`RB${i}`);
    for (let i=counts.WR+1;i<=3;i++) missing.push(`WR${i}`);
    push("📋", `Complete your starting lineup — ${missing.join(", ")} still needed before round 8.`);
  }

  // --- K/DEF drafted too early ---
  if (currentRound<12 && (counts.K>0 || counts.DEF>0)) {
    push("⚠", "K/DEF too early — these are streamable, wait until round 13+.");
  }

  // --- QB value window (rounds 9-11) ---
  if (currentRound>=9 && currentRound<=11 && counts.QB===0) {
    push("✅", `Good — QB window is now. Target rounds 9-12 for QB value.${bestOf("QB")}`);
  }

  // --- K/DEF territory opens up ---
  if (currentRound>=13 && (counts.K===0 || counts.DEF===0)) {
    push("✅", "K/DEF territory — safe to draft kicker or defense now.");
  }

  // --- Filler: best-available-over-need in the mid rounds when nothing urgent applies ---
  if (items.length<3 && currentRound>=4 && currentRound<=8) {
    push("📈", "No urgent need — take the best player available and stay flexible this round.");
  }

  return items.slice(0,3);
}

// Shared by the search box's Overall rankings filter and the By tier panel's match highlight,
// so both stay in lockstep as the user types.
function matchesSearch(p, search) {
  const q = search.trim().toLowerCase();
  if (!q) return true;
  return p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q);
}

const LEAGUES = [{id:0,name:"League 1",teams:12},{id:1,name:"League 2",teams:10}];

const LS_KEYS = {
  players:"fdc_players", drafted:"fdc_drafted", rosters:"fdc_rosters",
  round:"fdc_round", pick:"fdc_pick", draftPos:"fdc_draftpos", league:"fdc_league",
  customRankings:"fdc_custom_rankings", playerNotes:"fdc_player_notes",
  defenseRankings:"fdc_defense_rankings",
  rankingsImportedAt:"fdc_rankings_imported_at",
};

// Date.now() -> "Mon Aug 4, 2026 at 9:14 PM"
function formatImportTimestamp(ms) {
  if (!ms) return "";
  const d = new Date(ms);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const month = d.toLocaleDateString("en-US", { month: "short" });
  let hours = d.getHours();
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  hours = hours % 12 || 12;
  return `${weekday} ${month} ${d.getDate()}, ${d.getFullYear()} at ${hours}:${minutes} ${ampm}`;
}

function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function saveLS(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

// Snake draft pick numbers for a given slot across `rounds` rounds. Round r (1-indexed):
// odd rounds go S, N+S, 2N+S...; even rounds reverse to N-S+1, 2N+(N-S+1)...
// e.g. slot 8, 12 teams -> 8, 17, 32, 41, 56, 65, 80, 89, 104, 113, 128, 137, 152, 161, 176
function computeSnakePicks(slot, teamsCount, rounds = 15) {
  const picks = [];
  for (let r = 1; r <= rounds; r++) {
    const p = r % 2 === 1 ? (r - 1) * teamsCount + slot : (r - 1) * teamsCount + (teamsCount - slot + 1);
    picks.push(p);
  }
  return picks;
}

// Horizontal divider marking where one of the user's upcoming snake-draft picks falls in the
// rankings list. The immediate next pick is a bold gold bar; picks after that fade to a
// thinner blue dashed line so the list stays readable further down.
function PickMarkerRow({ marker }) {
  const { pickNum, picksAway, isNext } = marker;
  const color = isNext ? "var(--text-pick-line)" : "var(--text-accent)";
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,padding:isNext?"7px 12px":"4px 12px",background:isNext?"rgba(210,153,34,0.16)":"transparent"}}>
      <div style={{flex:1,height:isNext?2:1,background:color,opacity:isNext?1:0.55,borderRadius:1}}/>
      <span style={{fontSize:isNext?11:9,fontWeight:800,color,whiteSpace:"nowrap",letterSpacing:"0.03em"}}>
        {isNext ? `⬇ YOUR PICK #${pickNum} — ${picksAway} pick${picksAway===1?"":"s"} away` : `YOUR PICK #${pickNum}`}
      </span>
      <div style={{flex:1,height:isNext?2:1,background:color,opacity:isNext?1:0.55,borderRadius:1}}/>
    </div>
  );
}

export default function App() {
  const [league, setLeague] = useState(() => loadLS(LS_KEYS.league, 0));
  const [draftedIds, setDraftedIds] = useState(() => loadLS(LS_KEYS.drafted, [[],[]]));
  const [rosters, setRosters] = useState(() => loadLS(LS_KEYS.rosters, [Array(15).fill(null), Array(15).fill(null)]));
  const [players, setPlayers] = useState(() => loadLS(LS_KEYS.players, BASE_PLAYERS));
  const [posFilter, setPosFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [showDrafted, setShowDrafted] = useState(false);
  const [quickDraftMode, setQuickDraftMode] = useState(false);
  const [selected, setSelected] = useState(null);
  const [round, setRound] = useState(() => loadLS(LS_KEYS.round, 1));
  const [pick, setPick] = useState(() => loadLS(LS_KEYS.pick, 1));
  const [draftPosByLeague, setDraftPosByLeague] = useState(() => loadLS(LS_KEYS.draftPos, [8,null]));
  const draftPos = draftPosByLeague[league];
  const setDraftPos = useCallback((val) => {
    setDraftPosByLeague(prev => { const n=[...prev]; n[league]=val; return n; });
  }, [league]);
  const [hasCustomRankings, setHasCustomRankings] = useState(() => loadLS(LS_KEYS.customRankings, false));
  const [rankingsImportedAt, setRankingsImportedAt] = useState(() => loadLS(LS_KEYS.rankingsImportedAt, null));
  const [showRankingsTooltip, setShowRankingsTooltip] = useState(false);
  const [activeTab, setActiveTab] = useState("board");
  const [campText, setCampText] = useState("");
  const [campStatus, setCampStatus] = useState("idle");
  const [campResults, setCampResults] = useState([]);
  const [campLastRun, setCampLastRun] = useState(null);
  const [recentPicksByLeague, setRecentPicksByLeague] = useState([[], []]);
  const [theme, setTheme] = useState("dark");
  const [playerDataImportInfo, setPlayerDataImportInfo] = useState(null);
  const [playerDataImportError, setPlayerDataImportError] = useState(null);
  const [defImportInfo, setDefImportInfo] = useState(null);
  const [defImportError, setDefImportError] = useState(null);
  const [slotMsg, setSlotMsg] = useState(null);
  const [playerNotes, setPlayerNotes] = useState(() => loadLS(LS_KEYS.playerNotes, {}));
  const [defenseRankings, setDefenseRankings] = useState(() => loadLS(LS_KEYS.defenseRankings, {}));
  const [tagPick, setTagPick] = useState("");
  const [notePick, setNotePick] = useState("");
  const sidebarRef = useRef(null);
  const playerDataInputRef = useRef(null);
  const defenseFileInputRef = useRef(null);

  useEffect(() => {
    if (sidebarRef.current) sidebarRef.current.scrollTop = 0;
  }, []);

  // Persist draft state + rankings pool to localStorage so a refresh doesn't lose progress.
  useEffect(() => { saveLS(LS_KEYS.players, players); }, [players]);
  useEffect(() => { saveLS(LS_KEYS.drafted, draftedIds); }, [draftedIds]);
  useEffect(() => { saveLS(LS_KEYS.rosters, rosters); }, [rosters]);
  useEffect(() => { saveLS(LS_KEYS.round, round); }, [round]);
  useEffect(() => { saveLS(LS_KEYS.pick, pick); }, [pick]);
  useEffect(() => { saveLS(LS_KEYS.draftPos, draftPosByLeague); }, [draftPosByLeague]);
  useEffect(() => { saveLS(LS_KEYS.league, league); }, [league]);
  useEffect(() => { saveLS(LS_KEYS.customRankings, hasCustomRankings); }, [hasCustomRankings]);
  useEffect(() => { saveLS(LS_KEYS.rankingsImportedAt, rankingsImportedAt); }, [rankingsImportedAt]);
  useEffect(() => { saveLS(LS_KEYS.playerNotes, playerNotes); }, [playerNotes]);
  useEffect(() => { saveLS(LS_KEYS.defenseRankings, defenseRankings); }, [defenseRankings]);

  // Re-tiers DEF-position players whenever the defense CSV is (re)imported, in case it happens
  // after the main rankings pool is already loaded.
  useEffect(() => {
    if (!Object.keys(defenseRankings).length) return;
    setPlayers(prev => applyDefenseTiersToPlayers(prev, defenseRankings));
  }, [defenseRankings]);

  const effectiveDefMap = useMemo(() => buildEffectiveDefMap(defenseRankings), [defenseRankings]);

  useEffect(() => { setTagPick(""); setNotePick(""); }, [selected?.id]);

  useEffect(() => {
    const t = THEMES[theme];
    Object.entries(t).forEach(([k,v]) => document.documentElement.style.setProperty(k, v));
    document.documentElement.style.setProperty("color-scheme", theme);
  }, [theme]);

  useEffect(() => {
    if (!slotMsg) return;
    const t = setTimeout(() => setSlotMsg(null), 2500);
    return () => clearTimeout(t);
  }, [slotMsg]);

  const drafted = draftedIds[league];
  const roster = rosters[league];
  const recentPicks = recentPicksByLeague[league];
  const rosterCount = useMemo(() => roster.filter(p => p !== null).length, [roster]);
  const teams = LEAGUES[league].teams;

  const available = useMemo(() => players.filter(p => !drafted.includes(p.id)), [players, drafted]);

  const filtered = useMemo(() => (showDrafted ? players : available).filter(p => {
    const pm = posFilter==="ALL" || p.pos===posFilter;
    return pm && matchesSearch(p, search);
  }), [showDrafted, players, available, posFilter, search]);

  const sorted = useMemo(() => [...filtered].sort((a,b)=>a.rank-b.rank), [filtered]);

  // The user's full snake-draft pick sequence for their slot, and which of those are still ahead.
  const myPicks = useMemo(() => draftPos==null ? [] : computeSnakePicks(draftPos, teams, 15), [draftPos, teams]);
  const currentOverallPick = drafted.length;
  const upcomingMyPicks = useMemo(() => (
    myPicks.filter(p => p > currentOverallPick).slice(0, 4).map((p, idx) => ({
      pickNum: p, picksAway: p - currentOverallPick - 1, isNext: idx === 0,
    }))
  ), [myPicks, currentOverallPick]);
  const nextPick = upcomingMyPicks[0] || null;

  // Maps a position in the rendered `sorted` list to the pick markers that belong right after it,
  // counting only non-drafted players — matches "N available players from the top" from the spec.
  // Key -1 holds markers that land before the very first row (picksAway === 0).
  const pickMarkersAfterIndex = useMemo(() => {
    const map = new Map();
    if (!upcomingMyPicks.length) return map;
    const queue = [...upcomingMyPicks];
    const push = (key, marker) => map.set(key, [...(map.get(key) || []), marker]);
    while (queue.length && queue[0].picksAway === 0) push(-1, queue.shift());
    let availableCount = 0;
    sorted.forEach((p, i) => {
      if (drafted.includes(p.id)) return;
      availableCount++;
      while (queue.length && queue[0].picksAway === availableCount) push(i, queue.shift());
    });
    return map;
  }, [sorted, drafted, upcomingMyPicks]);

  const recs = useMemo(() => getRecs(available, roster, round, effectiveDefMap), [available, roster, round, effectiveDefMap]);

  const isMyTurn = useMemo(() => {
    if (draftPos==null) return false;
    const inRound = ((pick-1)%teams)+1;
    const snake = round%2===0 ? teams-draftPos+1 : draftPos;
    return inRound===snake;
  }, [pick, round, teams, draftPos]);

  // Scarcity data
  const scarcity = useMemo(() => {
    const data={};
    ["QB","RB","WR","TE"].forEach(pos=>{
      data[pos]={};
      [1,2,3,4].forEach(tier=>{
        const count = available.filter(p=>p.pos===pos&&p.tier===tier).length;
        if(count>=0) data[pos][tier]=count;
      });
    });
    return data;
  }, [available]);

  // Run detection: how many of each pos in last 6 picks
  const runAlert = useMemo(() => {
    if (recentPicks.length < 3) return null;
    const last6 = recentPicks.slice(-6);
    const posCounts={};
    last6.forEach(p=>{posCounts[p]=(posCounts[p]||0)+1;});
    const maxPos = Object.entries(posCounts).sort((a,b)=>b[1]-a[1])[0];
    if (maxPos && maxPos[1]>=3) return {pos:maxPos[0], count:maxPos[1]};
    return null;
  }, [recentPicks]);

  // Tier drain alerts
  const tierAlerts = useMemo(() => {
    const alerts=[];
    Object.entries(scarcity).forEach(([pos,tiers])=>{
      if (tiers[1]<=1) alerts.push({pos, tier:1, count:tiers[1]||0, urgent:true});
      else if (tiers[2]<=2) alerts.push({pos, tier:2, count:tiers[2]||0, urgent:false});
    });
    return alerts;
  }, [scarcity]);

  // Group currently-available players by position+tier — backs both the cliff warning and the "last in tier" badge.
  const tiersByPos = useMemo(() => {
    const byPos={};
    ["QB","RB","WR","TE"].forEach(pos=>{
      const byTier={};
      available.filter(p=>p.pos===pos).forEach(p=>{(byTier[p.tier] ||= []).push(p);});
      Object.values(byTier).forEach(list=>list.sort((a,b)=>a.rank-b.rank));
      byPos[pos]=byTier;
    });
    return byPos;
  }, [available]);

  // How many total picks (across all teams) happen between now and my next turn — snake draft always
  // gives me exactly one pick per round, so my next turn is always in round+1.
  const picksUntilNextTurn = useMemo(() => {
    if (draftPos==null) return null;
    const nextRound = round+1;
    const nextSlot = nextRound%2===0 ? teams-draftPos+1 : draftPos;
    const nextPickNum = (nextRound-1)*teams+nextSlot;
    return Math.max(1, nextPickNum-pick);
  }, [round, pick, teams, draftPos]);

  // Tier cliff warning: the current (best available) tier for a position is down to its last 1-2 players,
  // the next tier is either a real rank gap away or a full tier further out (a tier was drafted through),
  // AND — based on how often this position has actually been drafted recently — those last players are
  // likely to be gone before my next turn comes around. Without that last check, a naturally small elite
  // tier (e.g. only 2 top TEs) would falsely trigger at pick 1 even though nothing has been drafted yet.
  const cliffAlerts = useMemo(() => {
    const alerts=[];
    if (recentPicks.length<3 || picksUntilNextTurn==null) return alerts;
    const posCounts={};
    recentPicks.forEach(p=>{posCounts[p]=(posCounts[p]||0)+1;});
    ["QB","RB","WR","TE"].forEach(pos=>{
      const byTier=tiersByPos[pos];
      const tiersPresent=Object.keys(byTier).map(Number).sort((a,b)=>a-b);
      if (!tiersPresent.length) return;
      const currentTier=tiersPresent[0];
      const currentList=byTier[currentTier];
      if (currentList.length>2) return;
      const nextTier=tiersPresent.find(t=>t>currentTier);
      if (nextTier==null) return;
      const nextList=byTier[nextTier];
      const lastRank=currentList[currentList.length-1].rank;
      const nextRank=nextList[0].rank;
      const gap=nextRank-lastRank;
      if (gap<6 && (nextTier-currentTier)<2) return;
      const posRate=(posCounts[pos]||0)/recentPicks.length;
      const expectedDraws=posRate*picksUntilNextTurn;
      if (expectedDraws<currentList.length) return;
      alerts.push({pos, tier:currentTier, count:currentList.length, players:currentList, nextTier, gap, picksUntilNextTurn});
    });
    return alerts;
  }, [tiersByPos, recentPicks, picksUntilNextTurn]);

  // Players who are the sole remaining option in their position's current tier — drives the "LAST IN TIER" row badge.
  const lastInTierIds = useMemo(() => {
    const s=new Set();
    Object.values(tiersByPos).forEach(byTier=>{
      Object.values(byTier).forEach(list=>{ if(list.length===1) s.add(list[0].id); });
    });
    return s;
  }, [tiersByPos]);

  // Bye week tracking on my roster (any position) — drives both the per-player clustering
  // warning ("3rd player on Bye 7") and the overall stack summary shown on the roster panels.
  const rosterByeCounts = useMemo(() => {
    const m={};
    roster.forEach(p=>{ if(!p) return; m[p.bye]=(m[p.bye]||0)+1; });
    return m;
  }, [roster]);

  const byeStackSummary = useMemo(() => (
    Object.entries(rosterByeCounts).filter(([wk,c])=>c>=2).sort((a,b)=>b[1]-a[1]).map(([wk,c])=>`Wk${wk} x${c}`)
  ), [rosterByeCounts]);

  // Best remaining player at each position — feeds the always-visible "Best available" strip.
  const bestAvailableByPos = useMemo(() => {
    const m={};
    ["QB","RB","WR","TE","K","DEF"].forEach(pos=>{
      const list = available.filter(p=>p.pos===pos);
      if (list.length) m[pos] = list.reduce((best,p)=>p.rank<best.rank?p:best);
    });
    return m;
  }, [available]);

  // Round derived from this league's own total picks made (not the shared round/pick state),
  // so the strategy engine below tracks League 1 and League 2 independently.
  const currentRound = useMemo(() => Math.floor(drafted.length / teams) + 1, [drafted.length, teams]);
  const picksIntoRound = useMemo(() => drafted.length % teams, [drafted.length, teams]);

  const strategyRecs = useMemo(() => getStrategyRecommendations({
    currentRound, picksIntoRound, teams, roster, bestAvailableByPos, scarcity, tiersByPos, runAlert,
  }), [currentRound, picksIntoRound, teams, roster, bestAvailableByPos, scarcity, tiersByPos, runAlert]);

  const [strategyOpen, setStrategyOpen] = useState(true);
  const [coachAdvice, setCoachAdvice] = useState(null);
  const [coachStatus, setCoachStatus] = useState("idle");

  const askCoach = useCallback(async () => {
    setCoachStatus("loading");
    setCoachAdvice(null);
    try {
      const topAvailable = [...available].sort((a,b)=>a.rank-b.rank).slice(0,10)
        .map(p=>({name:p.name, pos:p.pos, rank:p.rank}));
      const rosterSoFar = roster.filter(Boolean).map(p=>({name:p.name, pos:p.pos}));
      const recentOtherTeams = drafted.slice(-12)
        .map(id=>players.find(pl=>pl.id===id)).filter(Boolean)
        .filter(p=>!roster.some(r=>r&&r.id===p.id))
        .slice(-6).map(p=>`${p.name} (${p.pos})`);
      const positionsNeeded = ROSTER_SLOTS.reduce((acc,slot,i)=>{
        if (slot!=="BN" && !roster[i] && !acc.includes(slot)) acc.push(slot);
        return acc;
      }, []);
      const res = await fetch(`${SERVER}/api/draft-coach`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          teams,
          round: currentRound,
          pickSlot: draftPos ?? null,
          roster: rosterSoFar,
          topAvailable,
          recentPicks: recentOtherTeams,
          positionsNeeded,
        }),
      });
      if (!res.ok) throw new Error(`Server responded ${res.status}`);
      const data = await res.json();
      setCoachAdvice(data.advice || "No advice returned.");
      setCoachStatus("idle");
    } catch (err) {
      console.error("Ask coach error:", err);
      setCoachAdvice("Couldn't reach the draft coach — try again.");
      setCoachStatus("error");
    }
  }, [available, roster, drafted, players, teams, currentRound, draftPos]);

  // Coach advice is a snapshot of one league's state — clear it when switching leagues.
  useEffect(() => { setCoachAdvice(null); setCoachStatus("idle"); }, [league]);

  const markDrafted = useCallback((player, isMine) => {
    if (isMine) {
      const currentCount = roster.filter(p => p !== null).length;
      const slotIdx = assignRosterSlot(roster, player.pos);
      if (currentCount >= 15 || slotIdx === -1) {
        setSlotMsg(`No slot available for ${player.pos}`);
        return;
      }
    }
    setDraftedIds(prev=>{const n=[...prev];n[league]=[...n[league],player.id];return n;});
    if(isMine) setRosters(prev=>{
      const n=[...prev];
      const teamRoster=[...n[league]];
      const idx=assignRosterSlot(teamRoster, player.pos);
      if(idx!==-1) teamRoster[idx]=player;
      n[league]=teamRoster;
      return n;
    });
    setRecentPicksByLeague(prev=>{const n=[...prev];n[league]=[...n[league].slice(-9), player.pos];return n;});
    const inRound=((pick-1)%teams)+1;
    if(inRound===teams) setRound(r=>r+1);
    setPick(p=>p+1);
    setSelected(null);
  }, [league, pick, teams, roster]);

  // Undoes the most recent mark for the current league — whether it was sent to My Team or just
  // marked Drafted — popping draftedIds like a stack and, if it had been added to the roster,
  // clearing that roster slot too so the two stay in sync.
  const lastDraftedId = drafted[drafted.length - 1] ?? null;
  const lastDraftedPlayer = lastDraftedId != null ? players.find(pl => pl.id === lastDraftedId) : null;
  const undoLast = () => {
    if (lastDraftedId == null) return;
    const wasMine = roster.some(r => r && r.id === lastDraftedId);
    setDraftedIds(prev=>{const n=[...prev];n[league]=n[league].slice(0,-1);return n;});
    if (wasMine) {
      setRosters(prev=>{
        const n=[...prev];
        const teamRoster=[...n[league]];
        const idx = teamRoster.findIndex(r => r && r.id === lastDraftedId);
        if (idx !== -1) teamRoster[idx] = null;
        n[league]=teamRoster;
        return n;
      });
    }
    setPick(p=>{
      const newPick = Math.max(1,p-1);
      setRound(Math.floor((newPick-1)/teams)+1);
      return newPick;
    });
    setRecentPicksByLeague(prev=>{const n=[...prev];n[league]=n[league].slice(0,-1);return n;});
  };

  // Cmd+Z (Mac) / Ctrl+Z (Windows) triggers the same undo as the button, everywhere except while
  // typing in a text input/textarea (search, Intel Drop, notes, etc). A ref holds the latest
  // undoLast so the listener can be attached once instead of re-subscribing on every render.
  const undoLastRef = useRef(undoLast);
  useEffect(() => { undoLastRef.current = undoLast; });
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key.toLowerCase() !== "z" || !(e.metaKey || e.ctrlKey) || e.shiftKey) return;
      const target = e.target;
      const isTyping = target?.tagName === "INPUT" || target?.tagName === "TEXTAREA" || target?.isContentEditable;
      if (isTyping) return;
      e.preventDefault();
      undoLastRef.current();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Clears drafted/roster/pick progress but keeps the current (possibly imported) player pool.
  const resetDraft = () => {
    if (!confirm("Reset the draft? This clears all picks and rosters but keeps your imported rankings.")) return;
    setDraftedIds([[], []]);
    setRosters([Array(15).fill(null), Array(15).fill(null)]);
    setPick(1);
    setRound(1);
    setRecentPicksByLeague([[], []]);
    setSelected(null);
  };

  // Clears everything, including the player pool, back to defaults.
  const clearAll = () => {
    if (!confirm("Clear everything? This resets rankings, picks, and rosters to defaults.")) return;
    setPlayers(BASE_PLAYERS);
    setDraftedIds([[], []]);
    setRosters([Array(15).fill(null), Array(15).fill(null)]);
    setPick(1);
    setRound(1);
    setDraftPosByLeague([8, null]);
    setLeague(0);
    setRecentPicksByLeague([[], []]);
    setSelected(null);
    setCampResults([]);
    setCampStatus("idle");
    setCampLastRun(null);
    setPlayerDataImportError(null);
    setPlayerDataImportInfo(null);
    setHasCustomRankings(false);
    setRankingsImportedAt(null);
    setDefenseRankings({});
    setDefImportInfo(null);
    setDefImportError(null);
  };

  // Wipes only player tags/notes (fdc_player_notes) — leaves rankings, picks, and rosters intact.
  const clearAllTags = () => {
    if (!confirm("This will remove all player tags and notes. Continue?")) return;
    localStorage.removeItem(LS_KEYS.playerNotes);
    window.location.reload();
  };

  // Single multi-file picker for the Rankings, Notes, and Overview CSVs (plus optional
  // dedicated K/DST files) — each file's role is detected from its column headers, not its
  // filename or picker order, so files can be selected in any order.
  const handleImportPlayerData = async (e) => {
    const fileList = Array.from(e.target.files || []);
    if (!fileList.length) return;
    try {
      const files = await Promise.all(fileList.map(async f => ({ name: f.name, text: await f.text() })));
      const { players: imported, fileSummaries, notesText, notesCount, overviewCount } = buildImportedPlayerData(files);
      setPlayers(applyDefenseTiersToPlayers(imported, defenseRankings));
      setDraftedIds([[], []]);
      setRosters([Array(15).fill(null), Array(15).fill(null)]);
      setPick(1);
      setRound(1);
      setRecentPicksByLeague([[], []]);
      setSelected(null);
      setCampResults([]);
      setCampStatus("idle");
      setCampLastRun(null);
      if (notesText) setCampText(notesText);
      setPlayerDataImportError(null);
      setPlayerDataImportInfo({
        count: imported.length, timestamp: new Date(), files: fileSummaries,
        hasNotes: notesCount > 0, hasOverview: overviewCount > 0,
      });
      setHasCustomRankings(true);
      setRankingsImportedAt(Date.now());
    } catch (err) {
      setPlayerDataImportError(err.message || "Failed to import player data CSVs");
    } finally {
      e.target.value = "";
    }
  };

  const handleImportDefenseFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const rows = parseFantasyProsRows(text, "DEF");
      const map = {};
      rows.forEach(r => {
        if (!r.team) return;
        map[r.team] = { rank: r.rank, tier: r.tier, name: r.name, bye: r.bye, sosStars: r.sosStars };
      });
      setDefenseRankings(map);
      setDefImportError(null);
      setDefImportInfo({ count: Object.keys(map).length, timestamp: new Date() });
    } catch (err) {
      setDefImportError(err.message || "Failed to import defense CSV");
    } finally {
      e.target.value = "";
    }
  };

  // Adds tags to a player's persistent note entry, deduplicating against what's already there.
  const addTagsToPlayer = (name, tags) => {
    if (!name || !tags || !tags.length) return;
    setPlayerNotes(prev => {
      const entry = prev[name] || { tags: [], notes: [] };
      const mergedTags = Array.from(new Set([...entry.tags, ...tags]));
      return { ...prev, [name]: { ...entry, tags: mergedTags } };
    });
  };

  const addNoteToPlayer = (name, note) => {
    if (!name || !note || !note.trim()) return;
    setPlayerNotes(prev => {
      const entry = prev[name] || { tags: [], notes: [] };
      return { ...prev, [name]: { ...entry, notes: [...entry.notes, note.trim()] } };
    });
  };

  const removeTagFromPlayer = (name, tag) => {
    setPlayerNotes(prev => {
      const entry = prev[name];
      if (!entry) return prev;
      return { ...prev, [name]: { ...entry, tags: entry.tags.filter(t => t !== tag) } };
    });
  };

  const removeNoteFromPlayer = (name, idx) => {
    setPlayerNotes(prev => {
      const entry = prev[name];
      if (!entry) return prev;
      return { ...prev, [name]: { ...entry, notes: entry.notes.filter((_, i) => i !== idx) } };
    });
  };

  const clearPlayerNotes = (name) => {
    setPlayerNotes(prev => {
      if (!prev[name]) return prev;
      const next = { ...prev };
      delete next[name];
      return next;
    });
  };

  const runCampAnalysis = async () => {
    console.log("Analyze clicked, campText:", campText);
    if (!campText.trim()) {
      console.log("Analyze aborted — campText is empty");
      return;
    }
    setCampStatus("loading");
    try {
      const res = await fetch(`${SERVER}/api/analyze-camp`, {
        method:"POST",
        headers:{"Content-Type":"application/json"},
        body:JSON.stringify({ campText })
      });
      if (!res.ok) throw new Error(`analyze-camp responded with ${res.status}`);
      const data = await res.json();
      const results = data.results || [];
      console.log("[Intel Drop analysis] raw results from /api/analyze-camp:", results);
      setPlayerNotes(prev => {
        const next = { ...prev };
        results.forEach(r => {
          if (!r.name) return;
          const entry = next[r.name] || { tags: [], notes: [] };
          const mergedTags = Array.from(new Set([...entry.tags, ...(r.tags || [])]));
          const mergedNotes = r.reason ? [...entry.notes, `AI: ${r.reason}`] : entry.notes;
          next[r.name] = { tags: mergedTags, notes: mergedNotes };
        });
        return next;
      });
      setCampResults(results);
      setCampStatus("done");
      setCampLastRun(new Date());
    } catch(e) {
      setCampStatus("error");
    }
  };

  const col = s => s==="var(--text-muted)"?"var(--text-muted)":s;

  const MeterBar = ({label, value, colorFn, textColorFn}) => (
    <div style={{marginBottom:5}}>
      <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
        <span style={{fontSize:11,color:"var(--text-secondary)"}}>{label}</span>
        <span style={{fontSize:11,fontWeight:600,color:(textColorFn||colorFn)(value)}}>{scoreLabel(value)}</span>
      </div>
      <div style={{height:5,borderRadius:3,background:"var(--border)",overflow:"hidden"}}>
        <div style={{width:`${meterWidth(value)}%`,height:"100%",background:colorFn(value),borderRadius:3}}></div>
      </div>
    </div>
  );

  // 1-5 dot rating for Overview CSV's upside/bust scores.
  const DotRating = ({label, value, colorFn}) => (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:5}}>
      <span style={{fontSize:11,color:"var(--text-secondary)"}}>{label}</span>
      <div style={{display:"flex",alignItems:"center",gap:5}}>
        <div style={{display:"flex",gap:2}}>
          {[1,2,3,4,5].map(i=>(
            <span key={i} style={{width:7,height:7,borderRadius:"50%",background:value!=null&&i<=value?colorFn(value):"var(--border)",display:"inline-block"}}/>
          ))}
        </div>
        <span style={{fontSize:11,fontWeight:600,color:colorFn(value)}}>{value!=null?`${value}/5`:"-"}</span>
      </div>
    </div>
  );

  const PlayerRow = ({p, compact, index=0}) => {
    const ol = (p.pos==="RB"||p.pos==="WR"||p.pos==="QB") ? olineGrade(p.team,p.pos) : null;
    const d = effectiveDefMap[p.team]; const s = SOS[p.team];
    const isRec = recs.some(r=>r.id===p.id);
    const isSel = selected?.id===p.id;
    const zebra = index%2===1 ? "var(--bg-row-alt)" : "var(--bg-row)";
    const isLastInTier = lastInTierIds.has(p.id);
    const isDrafted = drafted.includes(p.id);
    const rosterByeCount = rosterByeCounts[p.bye] || 0;
    const hasByeConflict = !isDrafted && rosterByeCount >= 2;
    const showBadgeRow = isLastInTier || hasByeConflict;
    const rosterFull = rosterCount >= 15;
    const noSlot = !rosterFull && assignRosterSlot(roster, p.pos) === -1;
    const mineBlocked = rosterFull || noSlot;
    const [hoverMine, setHoverMine] = useState(false);
    const [hoverGone, setHoverGone] = useState(false);
    // Quick-mark flash: shows a brief colored confirmation on the row, then commits the actual
    // mark once the flash has had time to be seen (green = drafted by someone, blue = my team).
    const [flash, setFlash] = useState(null);
    useEffect(() => {
      if (!flash) return;
      const t = setTimeout(() => setFlash(null), 300);
      return () => clearTimeout(t);
    }, [flash]);
    const quickMark = (isMine) => {
      if (flash || isDrafted) return;
      setFlash(isMine ? "blue" : "green");
      setTimeout(() => markDrafted(p, isMine), 300);
    };
    const rowBg = flash==="green" ? "#22c55e4d" : flash==="blue" ? "#3b82f64d" : (isSel?"var(--bg-row-sel)":isRec?"var(--bg-row-rec-highlight)":zebra);
    return (
      <div
        onClick={()=>{
          if (isDrafted) { setSelected(p); return; }
          if (quickDraftMode) { quickMark(false); return; }
          setSelected(p);
        }}
        className="player-row"
        style={{background:rowBg,boxShadow:isSel?"inset 0 0 0 1px var(--border-accent)":"none",borderBottom:"1px solid var(--border)",borderLeft:isRec?"3px solid var(--border-row-rec-highlight)":`4px solid ${POS_COLORS[p.pos]||"#555"}`,cursor:"pointer",transition:"background 0.15s, filter 0.1s",opacity:isDrafted?0.45:1}}>
        <div style={{display:"grid",gridTemplateColumns:compact?ROW_COLS_COMPACT:ROW_COLS,gap:compact?3:8,alignItems:"center",padding:compact?"6px 6px":"8px 12px",fontSize:compact?11:12}}>
          <span style={{color:"var(--text-secondary)",fontWeight:700,textAlign:"right"}}>{p.rank}</span>
          <span
            onClick={e=>{e.stopPropagation();if(isDrafted)return;if(mineBlocked){markDrafted(p,true);return;}quickMark(true);}}
            title={isDrafted?p.pos:mineBlocked?(rosterFull?"Roster full (15/15)":`No slot available for ${p.pos}`):"Click to add to My Team"}
            style={{fontSize:compact?9:10,fontWeight:800,padding:"2px 5px",borderRadius:4,background:POS_COLORS[p.pos]||"#555",color:"#fff",textAlign:"center",letterSpacing:"0.04em",border:"1px solid rgba(255,255,255,0.3)",cursor:isDrafted?"default":"pointer"}}>{p.pos}</span>
          <span style={{overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>
            <span style={{fontWeight:700,fontSize:compact?12:13,color:"var(--text-primary)",textDecoration:isDrafted?"line-through":"none"}}>{p.name}</span>
            <span style={{marginLeft:6,fontSize:compact?10:11,fontWeight:500,color:"var(--text-secondary)"}}>{p.team}</span>
            {p.ecrVsAdp&&p.ecrVsAdp!=="-"&&<span style={{marginLeft:6,fontSize:compact?10:11,fontWeight:800,color:ecrVsAdpColor(p.ecrVsAdp)}}>{p.ecrVsAdp}</span>}
          </span>
          <span style={{color:"var(--text-secondary)",fontSize:compact?9:10,whiteSpace:"nowrap"}}>Bye {p.bye}</span>
          {ol?<span style={{fontSize:compact?9:10,color:olineTextColor(ol.label),whiteSpace:"nowrap"}}>Line: {ol.label}</span>:<span/>}
          {d?(
            p.pos==="DEF"?(
              <span style={{fontSize:compact?9:10,color:defTextColor(d.label),whiteSpace:"nowrap"}}>Def #{d.rank} {d.label}</span>
            ):(
              <span title={d.shootout?"Weak defense = more offensive volume = good for this player":"Strong defense = fewer shootouts, less offensive volume"} style={{display:"flex",alignItems:"center",gap:4,overflow:"hidden",whiteSpace:"nowrap"}}>
                <span style={{fontWeight:700,fontSize:compact?9:10,whiteSpace:"nowrap"}}>#{d.rank}</span>
                {d.shootout?(
                  <span style={{fontSize:compact?8:9,fontWeight:800,padding:"1px 4px",borderRadius:3,background:"var(--bg-success)",color:"var(--text-success)",whiteSpace:"nowrap"}}>🔥{compact?"":" SHOOTOUT"}</span>
                ):(
                  <span style={{fontSize:compact?9:10,color:defTextColor(d.label),whiteSpace:"nowrap"}}>{d.label}</span>
                )}
              </span>
            )
          ):<span/>}
          {s?<span style={{fontSize:compact?9:10,color:sosTextColor(s.e)}}>SOS {s.e}</span>:<span/>}
          <div style={{display:"flex",flexWrap:"wrap",gap:3,alignItems:"center"}}>
            {(() => {
              const allTags = playerNotes[p.name]?.tags || [];
              const visible = allTags.slice(0,3);
              const extra = allTags.length - visible.length;
              return <>
                {visible.map(t=>(
                  <span key={t} style={{fontSize:compact?7:8,fontWeight:700,padding:"2px 6px",borderRadius:3,background:`${tagColor(t)}26`,color:tagColor(t),border:`1px solid ${tagColor(t)}55`,whiteSpace:"nowrap"}}>{t}</span>
                ))}
                {extra>0&&<span style={{fontSize:compact?7:8,fontWeight:700,color:"var(--text-muted)"}}>+{extra}</span>}
              </>;
            })()}
          </div>
          {isDrafted?(
            <span style={{fontSize:8,fontWeight:800,padding:"3px 7px",borderRadius:"var(--radius)",border:"1px solid var(--text-muted)",color:"var(--text-muted)",whiteSpace:"nowrap",textAlign:"center",letterSpacing:"0.04em"}}>DRAFTED</span>
          ):(
            <div style={{display:"flex",gap:4}}>
              <button
                disabled={mineBlocked}
                onClick={e=>{e.stopPropagation();if(mineBlocked)return;markDrafted(p,true);}}
                onMouseEnter={()=>setHoverMine(true)}
                onMouseLeave={()=>setHoverMine(false)}
                style={{
                  fontSize:9,fontWeight:700,padding:"3px 7px",borderRadius:"var(--radius)",
                  border:`1px solid ${mineBlocked?"var(--border)":hoverMine?"var(--text-success)":"var(--border)"}`,
                  background:mineBlocked?"transparent":hoverMine?"var(--bg-success)":"transparent",
                  color:mineBlocked?"var(--text-muted)":hoverMine?"var(--text-success)":"var(--text-secondary)",
                  cursor:mineBlocked?"not-allowed":"pointer",
                  opacity:mineBlocked?0.5:1,
                }}
                title={rosterFull?"Roster full (15/15)":noSlot?`No slot available for ${p.pos}`:"Add to my team"}
              >My Team</button>
              <button
                onClick={e=>{e.stopPropagation();markDrafted(p,false);}}
                onMouseEnter={()=>setHoverGone(true)}
                onMouseLeave={()=>setHoverGone(false)}
                style={{
                  fontSize:9,padding:"3px 6px",borderRadius:"var(--radius)",
                  border:`1px solid ${hoverGone?"var(--text-secondary)":"var(--border)"}`,
                  background:hoverGone?"var(--bg-row-hover)":"transparent",
                  color:hoverGone?"var(--text-primary)":"var(--text-secondary)",
                  cursor:"pointer",
                }}
              >Drafted</button>
            </div>
          )}
        </div>
        {showBadgeRow&&(
          <div style={{display:"flex",gap:6,flexWrap:"wrap",padding:compact?"0 6px 5px 6px":"0 12px 6px 12px"}}>
            {isLastInTier&&<span style={{fontSize:8,fontWeight:800,padding:"2px 5px",borderRadius:3,background:"var(--bg-warn)",color:"var(--text-warning)",border:"1px solid var(--text-warning)",letterSpacing:"0.03em"}}>LAST IN TIER</span>}
            {hasByeConflict&&<span style={{fontSize:8,fontWeight:800,padding:"2px 5px",borderRadius:3,background:"var(--bg-warn)",color:"var(--text-warning)",border:"1px solid var(--text-warning)",letterSpacing:"0.03em"}}>⚠ {ordinal(rosterByeCount+1)} player on Bye {p.bye}</span>}
          </div>
        )}
      </div>
    );
  };

  // Compact row used in the "By tier" cheat sheet columns. No position badge here (the column
  // header already carries the position), so quick-mark only covers row-click -> Drafted.
  // searchMatch/searchActive let the search box (which drives the Overall rankings filter)
  // highlight the same players here in real time instead of filtering the column away entirely —
  // removing rows would collapse tier context that's the whole point of this panel.
  const TierPlayerRow = ({p, isRec, zebra, searchMatch, searchActive}) => {
    const isDrafted = drafted.includes(p.id);
    const [flash, setFlash] = useState(null);
    useEffect(() => {
      if (!flash) return;
      const t = setTimeout(() => setFlash(null), 300);
      return () => clearTimeout(t);
    }, [flash]);
    const dimmed = searchActive && !searchMatch;
    const highlighted = searchActive && searchMatch;
    return (
      <div
        key={p.id}
        onClick={()=>{
          if (isDrafted) { setSelected(p); return; }
          if (quickDraftMode) {
            if (flash) return;
            setFlash("green");
            setTimeout(() => markDrafted(p, false), 300);
            return;
          }
          setSelected(p);
        }}
        title={`${p.name} (${p.team})`}
        className="player-row"
        style={{display:"flex",alignItems:"baseline",gap:3,padding:"2px 5px",cursor:"pointer",minWidth:0,background:flash==="green"?"#22c55e4d":highlighted?"var(--bg-accent-soft)":(isRec?"var(--bg-row-rec-highlight)":zebra),borderLeft:highlighted?"3px solid var(--border-accent)":isRec?"3px solid var(--border-row-rec-highlight)":"3px solid transparent",opacity:isDrafted?0.45:dimmed?0.3:1,transition:"background 0.15s, opacity 0.15s"}}>
        <span style={{fontSize:9,fontWeight:700,color:"var(--text-secondary)",minWidth:32,flexShrink:0,textAlign:"right"}}>{p.rank}</span>
        <span style={{fontSize:9,fontWeight:highlighted?800:600,color:highlighted?"var(--text-accent)":"var(--text-primary)",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",flex:1,minWidth:0,textDecoration:isDrafted?"line-through":"none"}}>{p.name}</span>
        <span style={{fontSize:8,fontWeight:600,color:"var(--text-secondary)",flexShrink:0}}>{p.team}</span>
      </div>
    );
  };

  return (
    <div style={{fontFamily:"system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif",color:"var(--text-primary)",background:"var(--bg-app)",minHeight:"100vh"}}>
      <style>{`
        :root {
          --bg-app: #0d1117; --bg-header: #161b22; --bg-sidebar: #0d1117;
          --bg-card: #161b22; --bg-row: #1c2128; --bg-row-alt: #20262e; --bg-row-hover: #21262d;
          --bg-row-rec: #1a2e1a; --bg-row-sel: #1a2433; --bg-accent-soft: #1a2e4a;
          --bg-warn: #2e1f0a; --bg-danger: #2e0a0a; --bg-success: #0a2e0a;
          --border: #30363d; --border-accent: #1f6feb;
          --text-primary: #e6edf3; --text-secondary: #8b949e; --text-muted: #484f58;
          --text-accent: #58a6ff; --text-success: #3fb950; --text-warning: #d29922; --text-danger: #f85149;
          --tab-active-border: #58a6ff;
          --pos-qb: #7c3aed; --pos-rb: #0369a1; --pos-wr: #0f766e; --pos-te: #f59e0b; --pos-k: #4b5563; --pos-def: #374151;
          --sig-green: #34d399; --sig-blue: #60a5fa; --sig-amber: #fbbf24; --sig-orange: #fb923c; --sig-red: #f87171;
          --bg-needed: #2e1f0a; --border-needed: #d29922; --shadow-needed: 0 0 8px rgba(210,153,34,0.5); --text-needed: #d29922;
          --bg-rec-card: #1a2e4a; --border-rec-card: #1f6feb;
          --bg-row-rec-highlight: #1e3a5f; --border-row-rec-highlight: #60a5fa;
          --text-pick-line: #d29922;
          --bg-run-banner-start: #7f1d1d; --bg-run-banner-end: #c2410c; --border-run-banner: #fb923c; --text-run-banner: #ffffff;
        }
        * { box-sizing: border-box; }
        input, textarea, button { font-family: inherit; }
        input[type="number"] { padding: 3px 5px; border: 1px solid var(--border); border-radius: 4px; background: var(--bg-row); color: var(--text-primary); }
        ::-webkit-scrollbar { width: 6px; height: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: var(--border); border-radius: 3px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--text-muted); }
        .player-row:hover { filter: brightness(1.15); }
        @keyframes runPulse { 0%,100% { box-shadow: 0 0 6px rgba(251,146,60,0.4); } 50% { box-shadow: 0 0 18px rgba(251,146,60,0.85); } }
        .run-banner { animation: runPulse 1.4s ease-in-out infinite; }
      `}</style>
      {slotMsg&&(
        <div style={{position:"fixed",top:12,left:"50%",transform:"translateX(-50%)",zIndex:1000,fontSize:11,fontWeight:600,padding:"8px 16px",borderRadius:"var(--radius)",background:"var(--bg-danger)",color:"var(--text-danger)",border:`1px solid var(--text-danger)`,boxShadow:"0 2px 8px rgba(0,0,0,0.3)"}}>
          {slotMsg}
        </div>
      )}
      {/* Top bar */}
      <div style={{background:"var(--bg-header)",borderBottom:`1px solid var(--border)`,padding:"4px 12px",display:"flex",alignItems:"center",gap:10,flexWrap:"wrap"}}>
        <span style={{fontWeight:600,fontSize:13,color:"var(--text-accent)",letterSpacing:"-0.01em"}}>⚡ Draft Companion</span>
        <div style={{display:"flex",gap:4}}>
          {LEAGUES.map((l,i)=>(
            <button key={i} onClick={()=>setLeague(i)} style={{fontSize:10,padding:"4px 10px",borderRadius:6,border:`1px solid ${league===i?"var(--border-accent)":"var(--border)"}`,background:league===i?"var(--bg-accent-soft)":"transparent",color:league===i?"var(--text-accent)":"var(--text-secondary)",cursor:"pointer",fontWeight:league===i?500:400}}>{l.name} ({l.teams}t)</button>
          ))}
        </div>
        <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
          {isMyTurn&&<span style={{fontSize:10,padding:"3px 8px",borderRadius:"var(--radius)",background:"var(--bg-success)",color:"var(--text-success)",fontWeight:500}}>Your pick</span>}
          <span style={{fontSize:10,color:"var(--text-secondary)"}}>R{round} P{pick}</span>
          <span style={{fontSize:11,color:"var(--text-secondary)"}}>Slot</span>
          <input
            type="number" min={1} max={teams} value={draftPos ?? ""} placeholder="?"
            onChange={e=>{const v=e.target.value; setDraftPos(v===""?null:Number(v));}}
            title={`Your draft slot for ${LEAGUES[league].name} (1-based position in the draft order) — leave blank if unknown`}
            style={{width:36,fontSize:10,textAlign:"center"}}
          />
          {draftPos==null&&<span style={{fontSize:9,color:"var(--text-muted)",fontStyle:"italic"}}>slot unknown — pick markers off</span>}
          {nextPick&&(
            <span style={{fontSize:10,fontWeight:700,padding:"3px 8px",borderRadius:"var(--radius)",background:"rgba(210,153,34,0.16)",color:"var(--text-warning)"}}>
              {nextPick.picksAway===0?"You're on the clock":`${nextPick.picksAway} pick${nextPick.picksAway===1?"":"s"} until your turn`}
            </span>
          )}
          <input ref={playerDataInputRef} type="file" accept=".csv" multiple onChange={handleImportPlayerData} style={{display:"none"}}/>
          <button onClick={()=>playerDataInputRef.current?.click()} title="Select Rankings, Notes, and Overview CSVs together — file role is detected from headers, not filename" style={{fontSize:10,padding:"3px 9px",borderRadius:6,border:`1px solid var(--border)`,background:"transparent",cursor:"pointer",color:"var(--text-secondary)"}}>
            ⬆ Import Player Data
          </button>
          <input ref={defenseFileInputRef} type="file" accept=".csv" onChange={handleImportDefenseFile} style={{display:"none"}}/>
          <button onClick={()=>defenseFileInputRef.current?.click()} style={{fontSize:10,padding:"3px 9px",borderRadius:6,border:`1px solid var(--border)`,background:"transparent",cursor:"pointer",color:"var(--text-secondary)"}}>
            ⬆ Import Defense CSV
          </button>
          {hasCustomRankings&&(
            <div
              onMouseEnter={()=>setShowRankingsTooltip(true)}
              onMouseLeave={()=>setShowRankingsTooltip(false)}
              style={{position:"relative",display:"flex"}}
            >
              <span style={{fontSize:9,display:"flex",alignItems:"center",gap:4,padding:"3px 8px",borderRadius:"var(--radius)",background:"var(--bg-success)",color:"var(--text-success)",fontWeight:500,cursor:"default"}}>
                <span style={{width:6,height:6,borderRadius:"50%",background:"var(--text-success)",display:"inline-block"}}/> Rankings saved
              </span>
              {showRankingsTooltip&&(
                <div style={{position:"absolute",top:"calc(100% + 7px)",left:"50%",transform:"translateX(-50%)",zIndex:50,pointerEvents:"none"}}>
                  <div style={{position:"absolute",top:-4,left:"50%",transform:"translateX(-50%) rotate(45deg)",width:8,height:8,background:"var(--bg-card)",borderLeft:`1px solid var(--border)`,borderTop:`1px solid var(--border)`}}/>
                  <div style={{position:"relative",background:"var(--bg-card)",color:"var(--text-primary)",border:`1px solid var(--border)`,borderRadius:6,padding:"6px 10px",fontSize:10,fontWeight:500,whiteSpace:"nowrap",boxShadow:"0 4px 12px rgba(0,0,0,0.25)"}}>
                    {rankingsImportedAt?`Last updated: ${formatImportTimestamp(rankingsImportedAt)}`:"Custom rankings loaded from CSV import"}
                  </div>
                </div>
              )}
            </div>
          )}
          <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")} style={{fontSize:10,padding:"3px 9px",borderRadius:6,border:`1px solid var(--border)`,background:"transparent",cursor:"pointer",color:"var(--text-secondary)",display:"flex",alignItems:"center",gap:4}}>
            {theme==="dark"?"☀ Light":"🌙 Dark"}
          </button>
          <button
            onClick={undoLast}
            disabled={lastDraftedId==null}
            title={lastDraftedPlayer?`Undo: ${lastDraftedPlayer.name}`:"Nothing to undo"}
            style={{fontSize:10,fontWeight:700,padding:"5px 12px",borderRadius:6,border:`1px solid ${lastDraftedId==null?"var(--border)":"var(--text-warning)"}`,background:lastDraftedId==null?"transparent":"var(--bg-warn)",cursor:lastDraftedId==null?"not-allowed":"pointer",color:lastDraftedId==null?"var(--text-muted)":"var(--text-warning)",opacity:lastDraftedId==null?0.6:1}}
          >↺ Undo Last Pick</button>
          <button onClick={resetDraft} title="Clear all picks and rosters, keep imported rankings" style={{fontSize:9,padding:"3px 8px",borderRadius:6,border:`1px solid var(--text-warning)`,background:"transparent",cursor:"pointer",color:"var(--text-warning)"}}>Reset Draft</button>
          <button onClick={clearAll} title="Reset everything, including rankings, to defaults" style={{fontSize:9,padding:"3px 8px",borderRadius:6,border:`1px solid var(--text-danger)`,background:"transparent",cursor:"pointer",color:"var(--text-danger)"}}>Clear All</button>
          <button onClick={clearAllTags} title="Remove all player tags and notes" style={{fontSize:9,padding:"3px 8px",borderRadius:6,border:"1px solid #8b3a3a",background:"transparent",cursor:"pointer",color:"#8b3a3a"}}>Clear All Tags</button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{display:"flex",borderBottom:`1px solid var(--border)`,background:"var(--bg-header)",padding:"0 12px"}}>
        {[{k:"board",l:"Draft Board"},{k:"roster",l:`Roster (${rosterCount})`},{k:"odef",l:"O-Line / Defense"},{k:"camp",l:"Intel Drop"},{k:"mock",l:"Mock Draft"}].map(t=>(
          <button key={t.k} onClick={()=>setActiveTab(t.k)} style={{padding:"6px 12px",fontSize:11,border:"none",borderBottom:activeTab===t.k?`2px solid var(--tab-active-border)`:"2px solid transparent",background:"transparent",cursor:"pointer",color:activeTab===t.k?"var(--text-accent)":"var(--text-secondary)",fontWeight:activeTab===t.k?600:400,letterSpacing:"0.01em"}}>{t.l}</button>
        ))}
        {campStatus==="done"&&<span style={{fontSize:9,padding:"2px 7px",borderRadius:"var(--radius)",background:"var(--bg-success)",color:"var(--text-success)",alignSelf:"center",marginLeft:4}}>Intel applied</span>}
      </div>

      {(playerDataImportInfo||playerDataImportError)&&(
        <div style={{padding:"5px 12px",background:playerDataImportError?"var(--bg-danger)":"var(--bg-success)",borderBottom:`1px solid var(--border)`,display:"flex",alignItems:"center",gap:8,fontSize:10}}>
          {playerDataImportError?(
            <span style={{color:"var(--text-danger)"}}>Import failed: {playerDataImportError}</span>
          ):(
            <span style={{color:"var(--text-success)"}}>
              Player data loaded — {playerDataImportInfo.count} players{playerDataImportInfo.hasNotes?", bye weeks, notes":""}{playerDataImportInfo.hasOverview?", upside/bust scores":""} imported — {playerDataImportInfo.timestamp.toLocaleTimeString()} · {playerDataImportInfo.files.map(f=>`${f.name} (${f.kind==="main"?"Rankings":f.kind==="DEF"?"DST":f.kind==="K"?"K":f.kind==="notes"?"Notes":f.kind==="overview"?"Overview":f.kind})`).join(", ")}
            </span>
          )}
          <button onClick={()=>{setPlayerDataImportInfo(null);setPlayerDataImportError(null);}} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:11}}>✕</button>
        </div>
      )}

      {(defImportInfo||defImportError)&&(
        <div style={{padding:"5px 12px",background:defImportError?"var(--bg-danger)":"var(--bg-success)",borderBottom:`1px solid var(--border)`,display:"flex",alignItems:"center",gap:8,fontSize:10}}>
          {defImportError?(
            <span style={{color:"var(--text-danger)"}}>Defense import failed: {defImportError}</span>
          ):(
            <span style={{color:"var(--text-success)"}}>
              {defImportInfo.count} team defenses imported — {defImportInfo.timestamp.toLocaleTimeString()}
            </span>
          )}
          <button onClick={()=>{setDefImportInfo(null);setDefImportError(null);}} style={{marginLeft:"auto",background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:11}}>✕</button>
        </div>
      )}

      <div style={{display:"flex",height:"calc(100vh - 70px)",overflow:"hidden"}}>

        {/* LEFT SIDEBAR: Scarcity + Tier counts */}
        <div ref={sidebarRef} style={{width:165,background:"var(--bg-sidebar)",borderRight:`1px solid var(--border)`,padding:10,overflow:"auto",flexShrink:0}}>
          <div style={{fontSize:13,fontWeight:500,color:"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:8}}>Tier scarcity</div>

          {/* Run alert */}
          {runAlert&&(
            <div style={{background:"var(--bg-warning)",border:"0.5px solid var(--border-warning)",borderRadius:"var(--radius)",padding:"6px 8px",marginBottom:8,fontSize:13}}>
              <div style={{fontWeight:600,color:"var(--text-warning)"}}>⚡ Run alert</div>
              <div style={{color:"var(--text-warning)"}}>{runAlert.count} {runAlert.pos}s in last 6 picks</div>
            </div>
          )}

          {/* Tier drain alerts */}
          {tierAlerts.map((a,i)=>(
            <div key={i} style={{background:a.urgent?"var(--bg-danger)":"var(--bg-warning)",border:`0.5px solid ${a.urgent?"var(--border-danger)":"var(--border-warning)"}`,borderRadius:"var(--radius)",padding:"5px 7px",marginBottom:5,fontSize:13}}>
              <span style={{fontWeight:500,color:a.urgent?"var(--text-danger)":"var(--text-warning)"}}>{a.pos} T{a.tier}: {a.count} left</span>
              {a.urgent&&<div style={{color:"var(--text-danger)",fontSize:13,fontWeight:800}}>Act now</div>}
            </div>
          ))}

          {/* Scarcity table */}
          {["QB","RB","WR","TE"].map(pos=>(
            <div key={pos} style={{marginBottom:10}}>
              <div style={{fontSize:13,fontWeight:500,color:"var(--text-secondary)",marginBottom:4}}>{pos}</div>
              {[1,2,3,4].map(tier=>{
                const count=scarcity[pos]?.[tier];
                if(count===undefined) return null;
                const color=count===0?"var(--tier-t4)":count<=2?"var(--tier-t3)":count<=5?"var(--tier-t1)":"var(--tier-t2)";
                return (
                  <div key={tier} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"2px 0",borderBottom:"0.5px solid var(--border)"}}>
                    <span style={{fontSize:13,fontWeight:600,color:"var(--text-secondary)"}}>T{tier}</span>
                    <span style={{fontSize:13,fontWeight:500,color}}>{count}</span>
                  </div>
                );
              })}
            </div>
          ))}

        </div>

        {/* MAIN CONTENT */}
        <div style={{flex:1,overflow:"auto",padding:12,background:"var(--bg-app)"}}>

          {activeTab==="board"&&(
            <>
              {/* Run detection banner — loud, hard to miss */}
              {runAlert&&(
                <div className="run-banner" style={{marginBottom:8,background:"linear-gradient(90deg,var(--bg-run-banner-start),var(--bg-run-banner-end))",border:"2px solid var(--border-run-banner)",borderRadius:8,padding:"10px 14px",display:"flex",alignItems:"center",gap:10}}>
                  <span style={{fontSize:20,lineHeight:1}}>🔥</span>
                  <span style={{fontSize:13,fontWeight:800,color:"var(--text-run-banner)",letterSpacing:"0.02em"}}>
                    {runAlert.pos} RUN — {runAlert.count} taken in last 6 picks
                  </span>
                </div>
              )}

              {/* Best available strip */}
              <div style={{marginBottom:8,display:"flex",alignItems:"center",gap:6,flexWrap:"wrap",background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:8,padding:"8px 10px"}}>
                <span style={{fontSize:10,fontWeight:700,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em",marginRight:2}}>Best available</span>
                {["QB","RB","WR","TE","K","DEF"].map(pos=>{
                  const p = bestAvailableByPos[pos];
                  if (!p) return null;
                  return (
                    <div key={pos} onClick={()=>setSelected(p)} style={{display:"flex",alignItems:"center",gap:5,background:"var(--bg-row)",border:"1px solid var(--border)",borderRadius:6,padding:"4px 8px",cursor:"pointer"}}>
                      <span style={{fontSize:9,fontWeight:800,padding:"2px 5px",borderRadius:4,background:POS_COLORS[pos]||"#555",color:"#fff",letterSpacing:"0.03em"}}>{pos}</span>
                      <span style={{fontSize:11,fontWeight:600,color:"var(--text-primary)",whiteSpace:"nowrap"}}>{p.name}</span>
                      <span style={{fontSize:10,fontWeight:700,color:"var(--text-secondary)"}}>#{p.rank}</span>
                    </div>
                  );
                })}
              </div>

              {/* Strategy strip */}
              <div style={{marginBottom:8,background:"var(--bg-card)",border:"1px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
                <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",cursor:"pointer"}} onClick={()=>setStrategyOpen(v=>!v)}>
                  <span style={{fontSize:10,fontWeight:700,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:"0.05em",flex:1}}>
                    {strategyOpen?"▾":"▸"} Strategy{strategyRecs.length>0?` (${strategyRecs.length})`:""}
                  </span>
                  <button
                    onClick={e=>{e.stopPropagation();askCoach();}}
                    disabled={coachStatus==="loading"}
                    title="Sends the current draft state to the AI coach for advice — costs one API call"
                    style={{fontSize:10,fontWeight:600,padding:"4px 10px",borderRadius:6,border:"1px solid var(--border-rec-card)",background:"var(--bg-rec-card)",color:"var(--text-accent)",cursor:coachStatus==="loading"?"wait":"pointer",opacity:coachStatus==="loading"?0.7:1}}
                  >
                    {coachStatus==="loading"?"🤖 Thinking…":"🤖 Ask Coach"}
                  </button>
                </div>
                {strategyOpen&&(
                  <div style={{padding:"0 10px 10px",display:"flex",flexDirection:"column",gap:6}}>
                    {strategyRecs.length===0 ? (
                      <div style={{fontSize:11,color:"var(--text-muted)",fontStyle:"italic"}}>No specific recommendations right now.</div>
                    ) : strategyRecs.map((text,i)=>(
                      <div key={i} style={{fontSize:12,color:"var(--text-primary)",lineHeight:1.4,padding:"6px 8px",background:"var(--bg-row)",borderRadius:6,borderLeft:"3px solid var(--border-accent)"}}>{text}</div>
                    ))}
                    {coachAdvice&&(
                      <div style={{fontSize:12,color:"var(--text-primary)",lineHeight:1.5,padding:"8px 10px",background:"var(--bg-rec-card)",border:"1px solid var(--border-rec-card)",borderRadius:6}}>
                        <div style={{fontSize:9,fontWeight:700,color:"var(--text-accent)",textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>Coach says</div>
                        {coachAdvice}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Tier cliff warning */}
              {isMyTurn&&cliffAlerts.length>0&&(
                <div style={{marginBottom:8,display:"flex",flexDirection:"column",gap:6}}>
                  {cliffAlerts.map((a,i)=>{
                    const tierLabel=(TIER_LABELS[a.pos]||TIER_LABELS.WR)[a.tier]||`Tier ${a.tier}`;
                    const names=a.players.map(p=>p.name).join(", ");
                    return (
                      <div key={i} style={{background:"linear-gradient(90deg, var(--bg-danger), var(--bg-warn))",border:"1.5px solid var(--text-danger)",borderRadius:8,padding:"8px 12px",display:"flex",alignItems:"flex-start",gap:8}}>
                        <span style={{fontSize:16,lineHeight:1}}>⚠️</span>
                        <div>
                          <div style={{fontSize:11,fontWeight:800,color:"var(--text-danger)",letterSpacing:"0.04em",textTransform:"uppercase"}}>Cliff warning</div>
                          <div style={{fontSize:11,color:"var(--text-primary)",marginTop:1}}>
                            Only {a.count} {tierLabel.toLowerCase()} {a.pos}{a.count>1?"s":""} left ({names}) — likely gone before your next pick ({a.picksUntilNextTurn} pick{a.picksUntilNextTurn>1?"s":""} away). Next {a.pos} tier is a significant drop.
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Recs bar + inline roster panel */}
              <div style={{marginBottom:8,display:"flex",gap:8,alignItems:"stretch"}}>
                {available.length>0&&rosterCount<15&&recs.length>0&&(
                  <div style={{background:"var(--bg-rec-card)",border:`1px solid var(--border-rec-card)`,borderRadius:8,padding:"10px 14px",width:"fit-content",flexShrink:0,lineHeight:1.3,display:"flex",flexDirection:"column"}}>
                    <div style={{fontSize:10,fontWeight:600,color:"var(--text-accent)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.05em"}}>Your pick — top recommendations</div>
                    <div style={{display:"flex",gap:8,flexWrap:"nowrap",flex:1,alignItems:"stretch"}}>
                      {recs.map((p,i)=>(
                        <div key={p.id} onClick={()=>setSelected(p)} style={{background:"var(--bg-card)",borderRadius:8,padding:"12px 14px",cursor:"pointer",border:`1px solid var(--border-rec-card)`,borderLeft:`4px solid ${POS_COLORS[p.pos]||"#555"}`,width:250,flexShrink:0,display:"flex",flexDirection:"column",gap:8}}>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontSize:10,color:"var(--text-muted)",fontWeight:700}}>#{i+1}</span>
                            <span style={{fontSize:15,fontWeight:800,color:"var(--text-primary)",lineHeight:1.25}}>{p.name}</span>
                            <span style={{fontSize:9,padding:"2px 5px",borderRadius:4,background:POS_COLORS[p.pos]||"#555",color:"#fff",fontWeight:700,flexShrink:0}}>{p.pos}</span>
                          </div>
                          <span style={{fontSize:11,fontWeight:700,padding:"3px 9px",borderRadius:"var(--radius)",background:`${safetyColor(p.safety)}26`,color:safetyTextColor(p.safety),width:"fit-content"}}>{scoreLabel(p.safety)}</span>
                          <div style={{fontSize:11,color:"var(--text-secondary)",lineHeight:1.5,flex:1,display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>{getReason(p,roster,round,effectiveDefMap)}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* My roster — starters row (8 slots) and K/DEF+bench row (7 slots), each filling width evenly */}
                <div style={{flex:1,minWidth:0,background:"var(--bg-card)",border:`1px solid var(--border)`,borderRadius:8,padding:"10px 12px",display:"flex",flexDirection:"column",gap:8}}>
                  <div style={{display:"flex",alignItems:"center",gap:8}}>
                    <span style={{fontSize:10,fontWeight:700,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:"0.08em"}}>My Roster</span>
                    {byeStackSummary.length>0&&<span style={{fontSize:9,fontWeight:600,color:"var(--text-warning)"}}>Bye stack: {byeStackSummary.join(", ")}</span>}
                  </div>
                  {[[0,4,5,1,2,3,6,7],[8,9,10,11,12,13,14]].map((idxRow,ri)=>(
                    <div key={ri} style={{display:"grid",gridTemplateColumns:`repeat(${idxRow.length}, minmax(0, 1fr))`,gap:4}}>
                      {idxRow.map(i=>{
                        const slot=ROSTER_SLOTS[i],p=roster[i];
                        const displayName = p ? (p.pos==="DEF" ? p.team : formatRosterName(p.name)) : null;
                        const isBench = slot==="BN";
                        const needsFill = !isBench && !p;
                        return (
                          <div key={i} style={{
                            display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:4,minWidth:0,borderRadius:6,padding:"8px 3px",
                            background:needsFill?"var(--bg-needed)":"var(--bg-row)",
                            border:needsFill?"2px solid var(--border-needed)":"1px solid var(--border)",
                            boxShadow:needsFill?"var(--shadow-needed)":"none",
                            opacity:(!isBench&&p)?0.55:1,
                          }}>
                            <span style={{fontSize:14,fontWeight:700,color:needsFill?"var(--text-needed)":(POS_COLORS[slot]||"var(--text-muted)"),letterSpacing:"0.01em"}}>{slot}</span>
                            <span style={{fontSize:11,fontWeight:600,color:p?"var(--text-primary)":(needsFill?"var(--text-needed)":"var(--text-muted)"),textAlign:"center",lineHeight:1.15,overflowWrap:"break-word",wordBreak:"normal",hyphens:"auto",maxWidth:"100%"}}>{displayName||(needsFill?"Needed":"—")}</span>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>

              {/* Filters */}
              <div style={{display:"flex",gap:6,marginBottom:8,alignItems:"center",flexWrap:"wrap"}}>
                <input type="text" placeholder="Search..." value={search} onChange={e=>setSearch(e.target.value)} style={{width:220,fontSize:13,padding:"8px 12px",borderRadius:8,border:"1px solid var(--border)",background:"var(--bg-row)",color:"var(--text-primary)"}}/>
                <button onClick={()=>setShowDrafted(v=>!v)} style={{fontSize:12,fontWeight:500,padding:"7px 13px",borderRadius:"var(--radius)",border:"0.5px solid var(--border-strong)",background:showDrafted?"var(--fill-accent)":"transparent",color:showDrafted?"var(--on-accent)":"var(--text-secondary)",cursor:"pointer",whiteSpace:"nowrap"}}>{showDrafted?"✓ ":""}Show drafted</button>
                <button
                  onClick={()=>setQuickDraftMode(v=>!v)}
                  title="When on: click anywhere on a row to mark that player Drafted. Click a position badge to send them to My Team — always works."
                  style={{fontSize:12,fontWeight:600,padding:"7px 13px",borderRadius:"var(--radius)",border:`0.5px solid ${quickDraftMode?"var(--sig-green)":"var(--border-strong)"}`,background:quickDraftMode?"var(--bg-success)":"transparent",color:quickDraftMode?"var(--text-success)":"var(--text-secondary)",cursor:"pointer",whiteSpace:"nowrap"}}
                >{quickDraftMode?"⚡ Quick Draft: ON":"⚡ Quick Draft Mode"}</button>
                <div style={{display:"flex",gap:4}}>
                  {POSITIONS.map(pos=>(
                    <button key={pos} onClick={()=>setPosFilter(pos)} style={{fontSize:12,fontWeight:500,padding:"7px 13px",borderRadius:"var(--radius)",border:"0.5px solid var(--border-strong)",background:posFilter===pos?"var(--fill-accent)":"transparent",color:posFilter===pos?"var(--on-accent)":"var(--text-secondary)",cursor:"pointer"}}>{pos}</button>
                  ))}
                </div>
                <span style={{fontSize:11,color:"var(--text-muted)"}}>{available.length} available</span>
              </div>

              {/* TWO-COLUMN LAYOUT: Overall left, Tiers right */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12}}>

                {/* LEFT: Overall rankings */}
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)",marginBottom:6,paddingBottom:6,borderBottom:"0.5px solid var(--border)"}}>Overall rankings</div>
                  <div style={{border:"1px solid var(--border)",borderRadius:8,overflow:"hidden"}}>
                    <div style={{display:"grid",gridTemplateColumns:ROW_COLS,gap:8,padding:"7px 12px",fontSize:10,fontWeight:700,color:"var(--text-secondary)",textTransform:"uppercase",letterSpacing:"0.04em",background:"var(--bg-card)",borderBottom:"1px solid var(--border)"}}>
                      <span style={{textAlign:"right"}}>#</span><span>Pos</span><span>Player</span><span>Bye</span><span>O-Line</span><span>Defense</span><span>SOS</span><span>Notes</span><span></span>
                    </div>
                    {pickMarkersAfterIndex.get(-1)?.map(m=><PickMarkerRow key={m.pickNum} marker={m}/>)}
                    {sorted.map((p,i)=>(
                      <Fragment key={p.id}>
                        <PlayerRow p={p} index={i}/>
                        {pickMarkersAfterIndex.get(i)?.map(m=><PickMarkerRow key={m.pickNum} marker={m}/>)}
                      </Fragment>
                    ))}
                  </div>
                </div>

                {/* RIGHT: Tier cheat sheet */}
                <div>
                  <div style={{fontSize:13,fontWeight:600,color:"var(--text-primary)",marginBottom:6,paddingBottom:6,borderBottom:"0.5px solid var(--border)"}}>By tier</div>
                  <div style={{display:"grid",gridTemplateColumns:"repeat(4, minmax(0, 1fr))",gap:4}}>
                    {["QB","RB","WR","TE"].map(pos=>{
                      const byTier=tiersByPos[pos]||{};
                      // Raw tier numbers come from the overall consensus rankings, so a position's
                      // best players may not land in raw Tier 1 (e.g. QB1 might be overall Tier 3).
                      // Remap to sequential display tiers per position so Tier 1 is always shown first
                      // and no tier — including ones with just a single player — is skipped.
                      const rawTiers=Object.keys(byTier).map(Number).sort((a,b)=>a-b);
                      const color=POS_COLORS[pos];
                      return (
                        <div key={pos} style={{border:"1px solid var(--border)",borderRadius:8,overflow:"hidden",background:"var(--bg-card)",minWidth:0}}>
                          <div style={{padding:"6px 4px",background:color,color:"#fff",fontSize:11,fontWeight:800,textAlign:"center",letterSpacing:"0.06em"}}>{pos}</div>
                          {rawTiers.map((rawTier,ti)=>{
                            const tier=ti+1;
                            const ps=byTier[rawTier];
                            const cliffTint=ps.length<=2;
                            const label=`Tier ${tier}${tier===1?" - Elite":""}`;
                            return (
                              <div key={rawTier} style={{borderTop:ti>0?"1px solid var(--border)":"none"}}>
                                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:3,padding:"3px 5px",minWidth:0}}>
                                  <span style={{fontSize:8,fontWeight:800,color:TIER_TEXT_COLORS[tier]||"var(--text-muted)",textTransform:"uppercase",letterSpacing:"0.03em",whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis",minWidth:0,flex:1}}>{label}</span>
                                  {cliffTint&&<span style={{fontSize:8,fontWeight:800,color:"var(--text-warning)",background:"var(--bg-warn)",border:"1px solid var(--text-warning)",borderRadius:3,padding:"1px 4px",whiteSpace:"nowrap",flexShrink:0,letterSpacing:"0.02em"}}>⚠ {ps.length} left</span>}
                                </div>
                                {ps.map((p,pi)=>{
                                  const isRec=recs.some(r=>r.id===p.id);
                                  const zebra=pi%2===1?"var(--bg-row-alt)":"var(--bg-row)";
                                  return <TierPlayerRow key={p.id} p={p} isRec={isRec} zebra={zebra} searchMatch={matchesSearch(p, search)} searchActive={!!search.trim()}/>;
                                })}
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </>
          )}

          {activeTab==="roster"&&(
            <div>
              <div style={{marginBottom:10,display:"flex",alignItems:"center",gap:8}}>
                <span style={{fontSize:13,fontWeight:500}}>My roster</span>
                <span style={{fontSize:11,color:"var(--text-secondary)"}}>{rosterCount}/15</span>
                {byeStackSummary.length>0&&<span style={{fontSize:10,fontWeight:600,padding:"2px 7px",borderRadius:"var(--radius)",background:"var(--bg-warn)",color:"var(--text-warning)",border:"1px solid var(--text-warning)"}}>Bye stack: {byeStackSummary.join(", ")}</span>}
              </div>
              {ROSTER_SLOTS.map((slot,i)=>{
                const p=roster[i];
                const isBench = slot==="BN";
                const needsFill = !isBench && !p;
                return (
                  <div key={i} style={{
                    display:"flex",alignItems:"center",gap:8,padding:"7px 10px",marginBottom:3,borderRadius:6,
                    background:needsFill?"var(--bg-needed)":"var(--bg-card)",
                    border:needsFill?"2px solid var(--border-needed)":"1px solid var(--border)",
                    boxShadow:needsFill?"var(--shadow-needed)":"none",
                    opacity:(!isBench&&p)?0.6:1,
                  }}>
                    <span style={{fontSize:9,fontWeight:needsFill?800:500,color:needsFill?"var(--text-needed)":"var(--text-muted)",width:36}}>{slot}</span>
                    {p?<>
                      <span style={{fontWeight:500,fontSize:11,flex:1}}>{p.name}</span>
                      <span style={{fontSize:9,color:"var(--text-secondary)"}}>{p.team}</span>
                      <span style={{fontSize:8,padding:"1px 4px",borderRadius:3,background:TIER_COLORS[p.tier],color:"#fff"}}>T{p.tier}</span>
                      <span style={{fontSize:9,color:safetyTextColor(p.safety)}}>{scoreLabel(p.safety)}</span>
                      <span style={{fontSize:9,color:"var(--text-muted)"}}>Bye {p.bye}</span>
                      {SOS[p.team]&&<span style={{fontSize:8,color:sosTextColor(SOS[p.team].e)}}>SOS {SOS[p.team].e}</span>}
                    </>:<span style={{fontSize:10,color:needsFill?"var(--text-needed)":"var(--text-muted)",fontStyle:"italic",fontWeight:needsFill?700:400}}>{needsFill?"Needed":"Empty"}</span>}
                  </div>
                );
              })}
            </div>
          )}

          {activeTab==="odef"&&(
            <div>
              <div style={{fontSize:12,fontWeight:500,marginBottom:4}}>O-line grades</div>
              <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:10}}>Run blocking for RBs. Pass blocking for WRs and QBs.</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(120px,1fr))",gap:5,marginBottom:18}}>
                {Object.entries(OLINE).sort((a,b)=>b[1].run-a[1].run).map(([team,g])=>(
                  <div key={team} style={{background:"var(--bg-card)",border:`1px solid var(--border)`,borderRadius:6,padding:"7px 10px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                      <span style={{fontWeight:500,fontSize:11}}>{team}</span>
                      <span style={{fontSize:8,padding:"1px 4px",borderRadius:3,background:olineColor(g.label),color:"#fff"}}>{g.label}</span>
                    </div>
                    <div style={{fontSize:9,color:"var(--text-secondary)"}}>Run {g.run} · Pass {g.pass}</div>
                  </div>
                ))}
              </div>
              <div style={{fontSize:12,fontWeight:500,marginBottom:4}}>Defensive rankings</div>
              <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:10}}>Weak defenses mean the opposing offense scores more to keep up. Good for your offensive players.</div>
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(140px,1fr))",gap:5}}>
                {Object.entries(effectiveDefMap).sort((a,b)=>a[1].rank-b[1].rank).map(([team,d])=>(
                  <div key={team} style={{background:"var(--bg-card)",border:`1px solid var(--border)`,borderRadius:6,padding:"7px 10px"}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:2}}>
                      <span style={{fontWeight:500,fontSize:11}}>#{d.rank} {team}</span>
                      <span style={{fontSize:8,padding:"1px 4px",borderRadius:3,background:defColor(d.label),color:"#fff"}}>{d.label}</span>
                    </div>
                    {d.ppg!=null&&<div style={{fontSize:9,color:"var(--text-secondary)"}}>{d.ppg} ppg allowed</div>}
                    {d.shootout&&<div style={{fontSize:8,color:"var(--sig-amber)",marginTop:2}}>Shootout likely</div>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab==="camp"&&(
            <div>
              <div style={{fontSize:12,fontWeight:500,marginBottom:10}}>Intel Drop</div>

              <textarea value={campText} onChange={e=>setCampText(e.target.value)} placeholder="Paste anything — analyst articles, tweets, camp reports, Reddit threads, podcast notes. The AI will extract player intel and tag them." style={{width:"100%",minHeight:260,fontSize:10,fontFamily:"system-ui,sans-serif",lineHeight:1.6,resize:"vertical",boxSizing:"border-box",padding:10,borderRadius:6,border:`1px solid var(--border)`,background:"var(--bg-row)",color:"var(--text-primary)"}}/>

              <div style={{display:"flex",gap:8,marginTop:8,alignItems:"center"}}>
                <button onClick={runCampAnalysis} disabled={campStatus==="loading"||!campText.trim()} style={{fontSize:11,padding:"7px 16px",borderRadius:6,border:`2px solid var(--border-accent)`,background:"var(--bg-accent-soft)",color:"var(--text-accent)",cursor:campStatus==="loading"?"wait":"pointer",fontWeight:700}}>
                  {campStatus==="loading"?"Analyzing...":"Analyze and tag players"}
                </button>
                {campStatus==="loading"&&<span style={{fontSize:9,color:"var(--text-primary)"}}>AI reading notes, extracting tags...</span>}
                {campLastRun&&<span style={{fontSize:9,color:"var(--text-primary)"}}>Last run {campLastRun.toLocaleTimeString()}</span>}
              </div>

              {campStatus==="done"&&campResults.length>0&&(
                <div style={{marginTop:16}}>
                  <div style={{fontSize:11,fontWeight:500,marginBottom:6}}>Tags added to player notes</div>
                  <div style={{display:"flex",flexDirection:"column",gap:4}}>
                    {campResults.map((r,i)=>(
                      <div key={`${r.name}-${i}`} style={{display:"flex",alignItems:"center",gap:8,padding:"6px 10px",background:"var(--surface-1)",borderRadius:"var(--radius)",border:"0.5px solid var(--border)",fontSize:13,flexWrap:"wrap"}}>
                        <span style={{fontSize:16,fontWeight:600,width:150,flexShrink:0}}>{r.name}</span>
                        <span style={{fontSize:14,color:"var(--text-primary)",flex:1,minWidth:120}}>{r.reason}</span>
                        {(r.tags||[]).map(tag=>(
                          <span key={tag} style={{fontSize:13,padding:"3px 9px",borderRadius:3,background:tagColor(tag),color:"#fff"}}>{tag}</span>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab==="mock"&&<MockTab teams={teams} draftPos={draftPos} players={players} getRecs={getRecs} getReason={getReason} defMap={effectiveDefMap}/>}
        </div>

        {/* RIGHT: Player detail panel */}
        {selected&&(
          <div style={{width:230,background:"var(--bg-sidebar)",borderLeft:`1px solid var(--border)`,padding:12,overflow:"auto",flexShrink:0}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:10}}>
              <div>
                <div style={{fontWeight:500,fontSize:13}}>{selected.name}</div>
                <div style={{fontSize:11,color:"var(--text-secondary)",marginTop:1}}>{selected.team} · {selected.pos} · Bye {selected.bye}</div>
              </div>
              <button onClick={()=>setSelected(null)} style={{background:"none",border:"none",cursor:"pointer",color:"var(--text-muted)",fontSize:14,padding:0}}>✕</button>
            </div>

            {!drafted.includes(selected.id) && (rosterByeCounts[selected.bye]||0)>=2 && (
              <div style={{fontSize:10,fontWeight:700,color:"var(--text-warning)",background:"var(--bg-warn)",border:"1px solid var(--text-warning)",borderRadius:6,padding:"5px 8px",marginBottom:10}}>
                ⚠ {ordinal((rosterByeCounts[selected.bye]||0)+1)} player on Bye {selected.bye}
              </div>
            )}

            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:5,marginBottom:12}}>
              {[
                {l:"Rank",v:`#${selected.rank}`},
                {l:"ADP",v:(selected.adp??selected.rank).toFixed(1)},
                {l:"Tier",v:`T${selected.tier}`},
                {l:"Half PPR",v:selected.ppg!=null?`${selected.ppg}`:"-"},
                ...(selected.ecrVsAdp&&selected.ecrVsAdp!=="-"?[{l:"ECR vs ADP",v:selected.ecrVsAdp,color:ecrVsAdpColor(selected.ecrVsAdp)}]:[]),
              ].map(m=>(
                <div key={m.l} style={{background:"var(--bg-row)",borderRadius:6,padding:"7px 9px",border:`1px solid var(--border)`}}>
                  <div style={{fontSize:11,color:"var(--text-secondary)"}}>{m.l}</div>
                  <div style={{fontSize:13,fontWeight:500,marginTop:1,color:m.color||"var(--text-primary)"}}>{m.v}</div>
                </div>
              ))}
            </div>

            {/* Safety Meter */}
            <div style={{background:"var(--bg-row)",borderRadius:6,padding:"10px 12px",marginBottom:8,border:`1px solid var(--border)`}}>
              <div style={{fontSize:11,fontWeight:700,color:"var(--text-primary)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Safety meter</div>
              <MeterBar label="Risk" value={selected.risk} colorFn={riskColor} textColorFn={riskTextColor}/>
              <MeterBar label="Reward" value={selected.reward} colorFn={rewardColor} textColorFn={rewardTextColor}/>
              <MeterBar label="Safety" value={selected.safety} colorFn={safetyColor} textColorFn={safetyTextColor}/>
            </div>

            {(selected.upside!=null||selected.bust!=null)&&(
              <div style={{background:"var(--bg-row)",borderRadius:6,padding:"10px 12px",marginBottom:8,border:`1px solid var(--border)`}}>
                <div style={{fontSize:11,fontWeight:700,color:"var(--text-primary)",marginBottom:8,textTransform:"uppercase",letterSpacing:"0.06em"}}>Upside / Bust</div>
                <DotRating label="Upside" value={selected.upside} colorFn={upsideColor}/>
                <DotRating label="Bust risk" value={selected.bust} colorFn={bustColor}/>
              </div>
            )}

            {(() => {
              const entry = playerNotes[selected.name] || { tags: [], notes: [] };
              const pickableTags = VALID_TAGS.filter(t => !entry.tags.includes(t));
              return (
                <div style={{background:"var(--bg-row)",borderRadius:6,padding:"9px 11px",marginBottom:8,border:`1px solid var(--border)`}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:6}}>
                    <div style={{fontSize:11,fontWeight:700,color:"var(--text-primary)",textTransform:"uppercase",letterSpacing:"0.06em"}}>Tags & notes</div>
                    {(entry.tags.length>0||entry.notes.length>0)&&
                      <button onClick={()=>clearPlayerNotes(selected.name)} style={{fontSize:8,color:"var(--text-danger)",background:"none",border:"none",cursor:"pointer",padding:0}}>Clear all notes</button>}
                  </div>

                  <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                    {entry.tags.length===0&&<span style={{fontSize:11,color:"var(--text-secondary)"}}>No tags yet</span>}
                    {entry.tags.map(tag=>(
                      <span key={tag} style={{display:"inline-flex",alignItems:"center",gap:3,fontSize:8,fontWeight:700,padding:"2px 6px",borderRadius:3,background:`${tagColor(tag)}26`,color:tagColor(tag),border:`1px solid ${tagColor(tag)}55`}}>
                        {tag}
                        <span onClick={()=>removeTagFromPlayer(selected.name,tag)} style={{cursor:"pointer",fontWeight:800,marginLeft:1}}>✕</span>
                      </span>
                    ))}
                  </div>

                  <div style={{display:"flex",gap:4,marginBottom:10}}>
                    <select value={tagPick} onChange={e=>setTagPick(e.target.value)} style={{flex:1,fontSize:9,padding:"4px 5px",borderRadius:4,border:`1px solid var(--border)`,background:"var(--bg-row)",color:"var(--text-primary)"}}>
                      <option value="">Select tag…</option>
                      {pickableTags.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                    <button
                      onClick={()=>{ if(tagPick){ addTagsToPlayer(selected.name,[tagPick]); setTagPick(""); } }}
                      disabled={!tagPick}
                      style={{fontSize:9,padding:"4px 8px",borderRadius:4,border:`1px solid var(--border-accent)`,background:"var(--bg-accent-soft)",color:"var(--text-accent)",cursor:tagPick?"pointer":"not-allowed",opacity:tagPick?1:0.5,whiteSpace:"nowrap"}}
                    >Add tag</button>
                  </div>

                  <div style={{display:"flex",flexDirection:"column",gap:4,marginBottom:6}}>
                    {entry.notes.length===0&&<span style={{fontSize:11,color:"var(--text-secondary)"}}>No notes yet</span>}
                    {entry.notes.map((note,i)=>(
                      <div key={i} style={{display:"flex",alignItems:"flex-start",gap:6,fontSize:9,color:"var(--text-secondary)",background:"var(--surface-1)",borderRadius:4,padding:"4px 6px"}}>
                        <span style={{flex:1,lineHeight:1.4}}>{note}</span>
                        <span onClick={()=>removeNoteFromPlayer(selected.name,i)} style={{cursor:"pointer",color:"var(--text-muted)",fontWeight:800}}>✕</span>
                      </div>
                    ))}
                  </div>

                  <div style={{display:"flex",gap:4}}>
                    <input
                      type="text"
                      value={notePick}
                      onChange={e=>setNotePick(e.target.value)}
                      onKeyDown={e=>{ if(e.key==="Enter"&&notePick.trim()){ addNoteToPlayer(selected.name,notePick); setNotePick(""); } }}
                      placeholder="Add a note…"
                      style={{flex:1,fontSize:9,padding:"4px 6px",borderRadius:4,border:`1px solid var(--border)`,background:"var(--bg-row)",color:"var(--text-primary)"}}
                    />
                    <button
                      onClick={()=>{ if(notePick.trim()){ addNoteToPlayer(selected.name,notePick); setNotePick(""); } }}
                      disabled={!notePick.trim()}
                      style={{fontSize:9,padding:"4px 8px",borderRadius:4,border:`1px solid var(--border-accent)`,background:"var(--bg-accent-soft)",color:"var(--text-accent)",cursor:notePick.trim()?"pointer":"not-allowed",opacity:notePick.trim()?1:0.5,whiteSpace:"nowrap"}}
                    >Add note</button>
                  </div>
                </div>
              );
            })()}

            {(selected.pos==="RB"||selected.pos==="WR"||selected.pos==="QB")&&(()=>{
              const ol=olineGrade(selected.team,selected.pos);
              return (
                <div style={{background:"var(--bg-row)",borderRadius:6,padding:"9px 11px",marginBottom:8,border:`1px solid var(--border)`}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--text-primary)",marginBottom:4,textTransform:"uppercase",letterSpacing:"0.06em"}}>O-line ({selected.pos==="RB"?"run":"pass"} block)</div>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4}}>
                    <span style={{fontSize:14,fontWeight:500,color:olineTextColor(ol.label)}}>{ol.score}</span>
                    <span style={{fontSize:9,color:olineTextColor(ol.label)}}>{ol.label}</span>
                  </div>
                  <div style={{height:4,borderRadius:3,background:"var(--border)",overflow:"hidden"}}>
                    <div style={{width:`${ol.score}%`,height:"100%",background:olineColor(ol.label),borderRadius:3}}></div>
                  </div>
                </div>
              );
            })()}

            {effectiveDefMap[selected.team]&&(()=>{
              const d=effectiveDefMap[selected.team];
              return (
                <div style={{background:"var(--surface-1)",borderRadius:"var(--radius)",padding:"8px 10px",marginBottom:8}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--text-primary)",marginBottom:3,textTransform:"uppercase",letterSpacing:"0.06em"}}>Team defense</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontSize:11,fontWeight:500}}>#{d.rank} overall</span>
                    <span style={{fontSize:8,padding:"1px 4px",borderRadius:3,background:defColor(d.label),color:"#fff"}}>{d.label}</span>
                  </div>
                  {d.ppg!=null&&<div style={{fontSize:9,color:"var(--text-secondary)",marginTop:2}}>{d.ppg} ppg allowed</div>}
                  {d.shootout&&<div style={{fontSize:9,color:"var(--sig-amber)",marginTop:2}}>Weak D = more offensive volume</div>}
                </div>
              );
            })()}

            {SOS[selected.team]&&(()=>{
              const s=SOS[selected.team];
              return (
                <div style={{background:"var(--surface-1)",borderRadius:"var(--radius)",padding:"8px 10px",marginBottom:10}}>
                  <div style={{fontSize:11,fontWeight:700,color:"var(--text-primary)",marginBottom:5,textTransform:"uppercase",letterSpacing:"0.06em"}}>Schedule</div>
                  <div style={{display:"flex",justifyContent:"space-between"}}>
                    <div><div style={{fontSize:11,color:"var(--text-secondary)"}}>Wk 1-6</div><div style={{fontSize:14,fontWeight:500,color:sosTextColor(s.e)}}>{s.e}</div></div>
                    <div style={{textAlign:"right"}}><div style={{fontSize:11,color:"var(--text-secondary)"}}>Full season</div><div style={{fontSize:14,fontWeight:500,color:sosTextColor(s.f)}}>{s.f}</div></div>
                  </div>
                </div>
              );
            })()}

            <div style={{display:"flex",gap:4}}>
              <button
                disabled={rosterCount >= 15 || assignRosterSlot(roster, selected.pos) === -1}
                onClick={e=>{e.stopPropagation();if(rosterCount>=15||assignRosterSlot(roster,selected.pos)===-1)return;markDrafted(selected,true);}}
                title={rosterCount>=15?"Roster full (15/15)":assignRosterSlot(roster, selected.pos)===-1?`No slot available for ${selected.pos}`:"Add to my team"}
                style={{flex:1,fontSize:10,padding:"7px 0",borderRadius:6,border:`2px solid var(--border-accent)`,background:"var(--bg-accent-soft)",color:"var(--text-accent)",cursor:(rosterCount>=15||assignRosterSlot(roster, selected.pos)===-1)?"not-allowed":"pointer",fontWeight:700,opacity:(rosterCount>=15||assignRosterSlot(roster, selected.pos)===-1)?0.5:1}}
              >✓ My pick</button>
              <button onClick={()=>markDrafted(selected,false)} style={{flex:1,fontSize:10,padding:"7px 0",borderRadius:6,border:`1px solid var(--border)`,background:"transparent",color:"var(--text-secondary)",cursor:"pointer"}}>✕ Drafted</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function MockTab({teams, draftPos, players, getRecs, getReason, defMap}) {
  const [drafted,setDrafted]=useState([]);
  const [roster,setRoster]=useState([]);
  const [pick,setPick]=useState(1);
  const [round,setRound]=useState(1);
  const [log,setLog]=useState([]);
  const avail=useMemo(()=>players.filter(p=>!drafted.includes(p.id)),[players,drafted]);
  const myTurn=useMemo(()=>{
    const inR=((pick-1)%teams)+1;
    const snake=round%2===0?teams-draftPos+1:draftPos;
    return inR===snake;
  },[pick,round,teams,draftPos]);
  const recs=useMemo(()=>getRecs(avail,roster,round,defMap),[avail,roster,round,defMap]);
  const advance=useCallback((p,isMe)=>{
    setDrafted(prev=>[...prev,p.id]);
    if(isMe)setRoster(prev=>[...prev,p]);
    const inR=((pick-1)%teams)+1;
    if(inR===teams)setRound(r=>r+1);
    setPick(p=>p+1);
    setLog(prev=>[{pick,team:isMe?"You":`T${inR}`,player:p.name,pos:p.pos,round},...prev]);
  },[pick,round,teams]);
  const sim=useCallback(()=>{
    if(!avail.length)return;
    const pool=avail.slice(0,8);
    advance(pool[Math.floor(Math.random()*pool.length)],false);
  },[avail,advance]);
  const reset=()=>{setDrafted([]);setRoster([]);setPick(1);setRound(1);setLog([]);};
  const done=round>15;
  return (
    <div>
      <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
        <span style={{fontSize:12,fontWeight:500}}>Mock draft</span>
        <span style={{fontSize:10,color:"var(--text-secondary)"}}>R{round} P{pick} · Pos {draftPos}</span>
        {myTurn&&!done&&<span style={{fontSize:9,padding:"2px 6px",borderRadius:"var(--radius)",background:"var(--bg-success)",color:"var(--text-success)"}}>Your pick</span>}
        <button onClick={reset} style={{marginLeft:"auto",fontSize:10,padding:"3px 9px",borderRadius:"var(--radius)",border:"0.5px solid var(--border)",background:"transparent",cursor:"pointer",color:"var(--text-secondary)"}}>Reset</button>
      </div>
      {done?<div style={{textAlign:"center",padding:28,color:"var(--text-secondary)",fontSize:11}}>Mock complete. {roster.length} players drafted. Reset to run again.</div>
      :myTurn?(
        <div style={{marginBottom:12}}>
          <div style={{fontSize:10,color:"var(--text-secondary)",marginBottom:5}}>Your turn:</div>
          {recs.map((p,i)=>(
            <div key={p.id} onClick={()=>advance(p,true)} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 10px",background:"var(--bg-accent)",border:"0.5px solid var(--border-accent)",borderRadius:"var(--radius)",cursor:"pointer",marginBottom:4}}>
              <span style={{fontSize:9,color:"var(--text-muted)",width:14}}>#{i+1}</span>
              <span style={{fontWeight:500,fontSize:11,flex:1}}>{p.name}</span>
              <span style={{fontSize:8,padding:"1px 4px",borderRadius:3,background:POS_COLORS[p.pos]||"#555",color:"#fff"}}>{p.pos}</span>
              <span style={{fontSize:9,color:"var(--text-secondary)"}}>{p.team}</span>
            </div>
          ))}
        </div>
      ):(
        <div style={{marginBottom:12}}>
          <button onClick={sim} style={{fontSize:11,padding:"7px 14px",borderRadius:"var(--radius)",border:"0.5px solid var(--border-strong)",background:"transparent",cursor:"pointer"}}>Simulate next pick</button>
        </div>
      )}
      <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:10}}>
        {roster.map(p=>(
          <span key={p.id} style={{fontSize:9,padding:"2px 7px",borderRadius:"var(--radius)",background:"var(--surface-1)",border:"0.5px solid var(--border)"}}>{p.name.split(" ").pop()} <span style={{color:"var(--text-muted)"}}>{p.pos}</span></span>
        ))}
      </div>
      <div style={{fontSize:10,fontWeight:500,color:"var(--text-secondary)",marginBottom:4}}>Pick log</div>
      <div style={{maxHeight:160,overflow:"auto",background:"var(--surface-1)",borderRadius:"var(--radius)",border:"0.5px solid var(--border)"}}>
        {log.map((l,i)=>(
          <div key={i} style={{display:"flex",gap:7,padding:"3px 8px",borderBottom:"0.5px solid var(--border)",fontSize:9,background:l.team==="You"?"var(--bg-accent)":"transparent"}}>
            <span style={{color:"var(--text-muted)",width:22}}>R{l.round}</span>
            <span style={{color:l.team==="You"?"var(--text-accent)":"var(--text-secondary)",width:40}}>{l.team}</span>
            <span style={{flex:1}}>{l.player}</span>
            <span style={{color:"var(--text-muted)"}}>{l.pos}</span>
          </div>
        ))}
        {!log.length&&<div style={{padding:"10px 8px",fontSize:9,color:"var(--text-muted)",textAlign:"center"}}>No picks yet</div>}
      </div>
    </div>
  );
}
