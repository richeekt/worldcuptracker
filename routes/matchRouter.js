const express = require("express");
const Prediction = require("../models/Prediction");

const router = express.Router();
const ESPN_BASE = "https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world";

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

let allMatchCache = { data: null, fetchedAt: 0 };

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
  const statusName = comp.status?.type?.name || "STATUS_SCHEDULED";
  const completed = comp.status?.type?.completed || false;

  return {
    id: parseInt(e.id),
    utcDate: e.date,
    status: ESPN_TO_STATUS[statusName] || "SCHEDULED",
    stage,
    group: null,
    matchday: stage === "GROUP_STAGE" ? estimateMatchday(e.date) : null,
    homeTeam: {
      id: home?.team?.id,
      name: home?.team?.displayName || null,
      crest: home?.team?.logo || null,
    },
    awayTeam: {
      id: away?.team?.id,
      name: away?.team?.displayName || null,
      crest: away?.team?.logo || null,
    },
    score: {
      fullTime: {
        home: completed ? parseInt(home?.score) : null,
        away: completed ? parseInt(away?.score) : null,
      },
    },
  };
}

async function getAllMatches() {
  const now = Date.now();
  if (allMatchCache.data && now - allMatchCache.fetchedAt < 60000) {
    return allMatchCache.data;
  }
  const res = await fetch(`${ESPN_BASE}/scoreboard?dates=20260611-20260720&limit=200`);
  if (!res.ok) throw new Error(`ESPN API error: ${res.status}`);
  const data = await res.json();
  const matches = (data.events || []).map(normalizeEvent);
  allMatchCache = { data: matches, fetchedAt: now };
  return matches;
}

function groupMatches(matches) {
  const grouped = {};
  for (const match of matches) {
    const stage = match.stage;
    if (!grouped[stage]) grouped[stage] = {};
    const subKey = stage === "GROUP_STAGE"
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
    const match = matches.find(m => m.id === parseInt(req.params.id));
    if (!match) return res.render("error", { message: "Match not found.", user: req.session.user || null });
    const predictions = await Prediction.find({ matchId: match.id }).sort({ submittedAt: -1 });
    res.render("matchDetail", { match, STAGE_LABELS, predictions, user: req.session.user || null });
  } catch (e) {
    console.error(e);
    res.render("error", { message: "Could not load match details.", user: req.session.user || null });
  }
});

module.exports = { router, getAllMatches };
