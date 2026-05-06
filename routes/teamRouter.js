const express = require("express");

const router = express.Router();
const API_BASE = "https://api.football-data.org/v4";

let teamsCache = { data: null, fetchedAt: 0 };

async function apiFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_API_KEY },
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
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
    const data = await apiFetch(`/teams/${req.params.id}`);
    res.render("teamDetail", { team: data, squad: data.squad || [], user: req.session.user || null });
  } catch (e) {
    console.error(e);
    res.render("error", { message: "Could not load team details.", user: req.session.user || null });
  }
});

module.exports = router;
