const express = require("express");

const router = express.Router();
const API_BASE = "https://api.football-data.org/v4";

const STAGE_ORDER = ["GROUP_STAGE", "LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "THIRD_PLACE", "FINAL"];
const STAGE_LABELS = {
  GROUP_STAGE: "Group Stage",
  LAST_32: "Round of 32",
  LAST_16: "Round of 16",
  QUARTER_FINALS: "Quarter-Finals",
  SEMI_FINALS: "Semi-Finals",
  THIRD_PLACE: "Third Place",
  FINAL: "Final",
};

let allMatchCache = { data: null, fetchedAt: 0 };

async function apiFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_API_KEY },
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function getAllMatches() {
  const now = Date.now();
  if (allMatchCache.data && now - allMatchCache.fetchedAt < 60000) {
    return allMatchCache.data;
  }
  const fresh = await apiFetch("/competitions/WC/matches");
  allMatchCache = { data: fresh.matches || [], fetchedAt: now };
  return allMatchCache.data;
}

function groupMatches(matches) {
  const grouped = {};
  for (const match of matches) {
    const stage = match.stage;
    if (!grouped[stage]) grouped[stage] = {};
    const subKey = match.stage === "GROUP_STAGE"
      ? `Matchday ${match.matchday}`
      : new Date(match.utcDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
    if (!grouped[stage][subKey]) grouped[stage][subKey] = [];
    grouped[stage][subKey].push(match);
  }
  return grouped;
}

router.get("/dashboard", async (req, res) => {
  try {
    const matches = await getAllMatches();
    const grouped = groupMatches(matches);
    res.render("dashboard", { grouped, STAGE_ORDER, STAGE_LABELS, user: req.session.user || null });
  } catch (e) {
    console.error(e);
    res.render("error", { message: "Could not load match data. Please try again later.", user: req.session.user || null });
  }
});

router.get("/:id", async (req, res) => {
  try {
    const matches = await getAllMatches();
    const match = matches.find(m => m.id === Number(req.params.id));
    if (!match) return res.render("error", { message: "Match not found.", user: req.session.user || null });
    res.render("matchDetail", { match, STAGE_LABELS, user: req.session.user || null });
  } catch (e) {
    console.error(e);
    res.render("error", { message: "Could not load match details.", user: req.session.user || null });
  }
});

module.exports = router;
