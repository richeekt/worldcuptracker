const mongoose = require("mongoose");

const predictionSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  username: { type: String, required: true },
  matchId: { type: Number, required: true },
  homeTeam: { type: String, required: true },
  awayTeam: { type: String, required: true },
  predictedHomeScore: { type: Number, required: true, min: 0 },
  predictedAwayScore: { type: Number, required: true, min: 0 },
  notes: { type: String, maxlength: 300, default: "" },
  submittedAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("Prediction", predictionSchema);
