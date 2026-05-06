const express = require("express");
const Prediction = require("../models/Prediction");

const router = express.Router();
const API_BASE = "https://api.football-data.org/v4";

function isLoggedIn(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect("/auth/login");
}

async function apiFetch(endpoint) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: { "X-Auth-Token": process.env.FOOTBALL_API_KEY },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

router.get("/new", isLoggedIn, async (req, res) => {
  try {
    const data = await apiFetch("/competitions/WC/matches?status=SCHEDULED");
    const preselect = { matchId: req.query.matchId || "", home: req.query.home || "", away: req.query.away || "" };
    res.render("predictForm", { matches: data.matches || [], user: req.session.user, preselect });
  } catch (e) {
    console.error(e);
    res.render("error", { message: "Could not load matches for prediction.", user: req.session.user });
  }
});

router.post("/new", isLoggedIn, async (req, res) => {
  try {
    const { matchId, homeTeam, awayTeam, predictedHomeScore, predictedAwayScore, notes } = req.body;
    const prediction = await Prediction.create({
      userId: req.session.user._id,
      username: req.session.user.username,
      matchId: Number(matchId),
      homeTeam,
      awayTeam,
      predictedHomeScore: Number(predictedHomeScore),
      predictedAwayScore: Number(predictedAwayScore),
      notes: notes || "",
    });
    res.render("predictConfirm", { prediction, user: req.session.user });
  } catch (e) {
    console.error(e);
    res.render("error", { message: "Could not save your prediction. Please try again.", user: req.session.user });
  }
});

router.get("/mine", isLoggedIn, async (req, res) => {
  try {
    const predictions = await Prediction.find({ userId: req.session.user._id }).sort({ submittedAt: -1 });
    res.render("myPredictions", { predictions, user: req.session.user });
  } catch (e) {
    console.error(e);
    res.render("error", { message: "Could not load your predictions.", user: req.session.user });
  }
});

module.exports = router;
