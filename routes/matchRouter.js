const express = require("express");

const router = express.Router();
const API_BASE = "https://api.football-data.org/v4";

let matchCache = { data: null, fetchedAt: 0 };

async function apiFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_API_KEY },
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json();
}

async function getMatches(matchday) {
  const now = Date.now();
  const cacheKey = matchday || "all";
  if (matchCache.data && matchCache.key === cacheKey && now - matchCache.fetchedAt < 60000) {
    return matchCache.data;
  }
  const endpoint = matchday
    ? `/competitions/WC/matches?matchday=${matchday}`
    : `/competitions/WC/matches`;
  const fresh = await apiFetch(endpoint);
  matchCache = { data: fresh, fetchedAt: now, key: cacheKey };
  return fresh;
}

router.get("/dashboard", async (req, res) => {
  try {
    const matchday = req.query.matchday || "";
    const data = await getMatches(matchday);
    res.render("dashboard", { matches: data.matches || [], matchday, user: req.session.user || null });
  } catch (e) {
    console.error(e);
    res.render("error", { message: "Could not load match data. Please try again later.", user: req.session.user || null });
  }
});

module.exports = router;
