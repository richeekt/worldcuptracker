const express = require("express");
const Prediction = require("../models/Prediction");
const { getAllMatches } = require("./matchRouter");

const router = express.Router();

function isLoggedIn(req, res, next) {
  if (req.session && req.session.user) return next();
  res.redirect("/auth/login");
}

router.get("/new", isLoggedIn, async (req, res) => {
  try {
    const allMatches = await getAllMatches();
    const matches = allMatches.filter(m => m.status === "SCHEDULED");
    const preselect = { matchId: req.query.matchId || "", home: req.query.home || "", away: req.query.away || "" };
    res.render("predictForm", { matches, user: req.session.user, preselect });
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

router.get("/:id/edit", isLoggedIn, async (req, res) => {
  try {
    const prediction = await Prediction.findOne({ _id: req.params.id, userId: req.session.user._id });
    if (!prediction) return res.render("error", { message: "Prediction not found.", user: req.session.user });
    res.render("editPrediction", { prediction, user: req.session.user });
  } catch (e) {
    console.error(e);
    res.render("error", { message: "Could not load prediction.", user: req.session.user });
  }
});

router.post("/:id/edit", isLoggedIn, async (req, res) => {
  try {
    const { predictedHomeScore, predictedAwayScore, notes } = req.body;
    const prediction = await Prediction.findOneAndUpdate(
      { _id: req.params.id, userId: req.session.user._id },
      { predictedHomeScore: Number(predictedHomeScore), predictedAwayScore: Number(predictedAwayScore), notes: notes || "" },
      { new: true }
    );
    if (!prediction) return res.render("error", { message: "Prediction not found.", user: req.session.user });
    res.redirect(`/matches/${prediction.matchId}`);
  } catch (e) {
    console.error(e);
    res.render("error", { message: "Could not update your prediction.", user: req.session.user });
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
