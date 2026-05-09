const express = require("express");

const router = express.Router();
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";

let teamsCache = { data: null, fetchedAt: 0 };
let espnTeamsCache = { data: null, fetchedAt: 0 };
let allMatchesCache = { data: null, fetchedAt: 0 };
const teamDetailCache = {};

const SLUG_TO_STAGE = {
  "group-stage": "GROUP_STAGE",
  "round-of-32": "LAST_32",
  "round-of-16": "LAST_16",
  "quarterfinals": "QUARTER_FINALS",
  "semifinals": "SEMI_FINALS",
  "3rd-place-match": "THIRD_PLACE",
  "final": "FINAL",
};

const ESPN_TO_STATUS = {
  STATUS_SCHEDULED: "SCHEDULED",
  STATUS_IN_PROGRESS: "IN_PLAY",
  STATUS_HALFTIME: "PAUSED",
  STATUS_FINAL: "FINISHED",
  STATUS_POSTPONED: "POSTPONED",
  STATUS_SUSPENDED: "SUSPENDED",
  STATUS_CANCELED: "CANCELLED",
};

function estimateMatchday(dateStr) {
  const d = new Date(dateStr);
  const day = d.getUTCDate();
  const month = d.getUTCMonth() + 1;
  if (month === 6 && day <= 16) return 1;
  if (month === 6 && day <= 22) return 2;
  return 3;
}

function normalizeEvent(e) {
  const comp = e.competitions[0];
  const home = comp.competitors.find(c => c.homeAway === "home") || comp.competitors[0];
  const away = comp.competitors.find(c => c.homeAway === "away") || comp.competitors[1];
  const slug = e.season?.slug || "group-stage";
  const stage = SLUG_TO_STAGE[slug] || "GROUP_STAGE";
  const completed = comp.status?.type?.completed || false;
  return {
    id: parseInt(e.id),
    utcDate: e.date,
    status: ESPN_TO_STATUS[comp.status?.type?.name] || "SCHEDULED",
    stage,
    group: null,
    matchday: stage === "GROUP_STAGE" ? estimateMatchday(e.date) : null,
    homeTeam: { id: home?.team?.id, name: home?.team?.displayName || null, crest: home?.team?.logo || null },
    awayTeam: { id: away?.team?.id, name: away?.team?.displayName || null, crest: away?.team?.logo || null },
    score: { fullTime: { home: completed ? parseInt(home?.score) : null, away: completed ? parseInt(away?.score) : null } },
  };
}

async function getAllMatches() {
  const now = Date.now();
  if (allMatchesCache.data && now - allMatchesCache.fetchedAt < 60000) return allMatchesCache.data;
  const res = await fetch(`${ESPN_BASE}/scoreboard?dates=20260611-20260720&limit=200`);
  const data = await res.json();
  allMatchesCache = { data: (data.events || []).map(normalizeEvent), fetchedAt: now };
  return allMatchesCache.data;
}

async function getEspnTeams() {
  const now = Date.now();
  if (espnTeamsCache.data && now - espnTeamsCache.fetchedAt < 3600000) return espnTeamsCache.data;
  const res = await fetch(`${ESPN_BASE}/teams`);
  const json = await res.json();
  espnTeamsCache.data = json.sports[0].leagues[0].teams.map(t => t.team);
  espnTeamsCache.fetchedAt = now;
  return espnTeamsCache.data;
}

async function getEspnRoster(teamName) {
  const espnTeams = await getEspnTeams();
  const match = espnTeams.find(t =>
    t.displayName.toLowerCase() === teamName.toLowerCase() ||
    t.displayName.toLowerCase().includes(teamName.toLowerCase()) ||
    teamName.toLowerCase().includes(t.displayName.toLowerCase())
  );
  if (!match) return null;
  const res = await fetch(`${ESPN_BASE}/teams/${match.id}/roster`);
  if (!res.ok) return null;
  const json = await res.json();
  return { espnTeam: match, athletes: json.athletes || [], coach: json.coach || null };
}

router.get("/", async (req, res) => {
  try {
    const now = Date.now();
    if (!teamsCache.data || now - teamsCache.fetchedAt > 300000) {
      const res = await fetch(`${ESPN_BASE}/teams`);
      const json = await res.json();
      teamsCache.data = json.sports[0].leagues[0].teams.map(t => ({
        id: t.team.id,
        name: t.team.displayName,
        crest: t.team.logos?.[0]?.href || null,
        shortName: t.team.abbreviation || t.team.displayName,
        area: { name: t.team.location || "" },
      }));
      teamsCache.fetchedAt = now;
    }
    res.render("teamExplorer", { teams: teamsCache.data, user: req.session.user || null });
  } catch (e) {
    console.error(e);
    res.render("error", { message: "Could not load teams. Please try again later.", user: req.session.user || null });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const id = req.params.id;
    const now = Date.now();

    if (!teamDetailCache[id] || now - teamDetailCache[id].fetchedAt > 300000) {
      const teamRes = await fetch(`${ESPN_BASE}/teams/${id}`);
      if (!teamRes.ok) throw new Error("Team not found");
      const teamJson = await teamRes.json();
      teamDetailCache[id] = { teamJson, fetchedAt: now };
    }

    const { teamJson } = teamDetailCache[id];
    const t = teamJson.team;

    const team = {
      id: t.id,
      name: t.displayName,
      crest: t.logos?.[0]?.href || null,
      area: { name: t.location || "" },
      founded: null,
      venue: null,
      coach: null,
      clubColors: null,
      website: null,
    };

    const allMatches = await getAllMatches();
    const matches = allMatches
      .filter(m => String(m.homeTeam.id) === String(id) || String(m.awayTeam.id) === String(id))
      .sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

    let rosterData = null;
    try {
      rosterData = await getEspnRoster(team.name);
    } catch (e) {
      console.error("ESPN roster fetch failed:", e.message);
    }

    res.render("teamDetail", { team, matches, rosterData, user: req.session.user || null });
  } catch (e) {
    console.error(e);
    res.render("error", { message: "Could not load team details.", user: req.session.user || null });
  }
});

module.exports = router;
