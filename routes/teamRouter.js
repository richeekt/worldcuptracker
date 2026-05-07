const express = require("express");

const router = express.Router();
const API_BASE = "https://api.football-data.org/v4";
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";

let teamsCache = { data: null, fetchedAt: 0 };
let espnTeamsCache = { data: null, fetchedAt: 0 };
const teamDetailCache = {};

async function apiFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_API_KEY },
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function getEspnTeams() {
  const now = Date.now();
  if (espnTeamsCache.data && now - espnTeamsCache.fetchedAt < 3600000) {
    return espnTeamsCache.data;
  }
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
      teamsCache.data = await apiFetch("/competitions/WC/teams");
      teamsCache.fetchedAt = now;
    }
    const teams = teamsCache.data.teams || [];
    res.render("teamExplorer", { teams, user: req.session.user || null });
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
      const [teamData, matchData] = await Promise.all([
        apiFetch(`/teams/${id}`),
        apiFetch(`/teams/${id}/matches?competitions=WC`),
      ]);
      teamDetailCache[id] = { teamData, matchData, fetchedAt: now };
    }

    const { teamData, matchData } = teamDetailCache[id];
    const matches = (matchData.matches || []).sort((a, b) => new Date(a.utcDate) - new Date(b.utcDate));

    let rosterData = null;
    try {
      rosterData = await getEspnRoster(teamData.name);
    } catch (e) {
      console.error("ESPN roster fetch failed:", e.message);
    }

    res.render("teamDetail", { team: teamData, matches, rosterData, user: req.session.user || null });
  } catch (e) {
    console.error(e);
    res.render("error", { message: "Could not load team details.", user: req.session.user || null });
  }
});

module.exports = router;
