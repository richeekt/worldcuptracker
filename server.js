const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "credentialsDontPost/.env") });

const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");

const authRouter = require("./routes/authRouter");
const { router: matchRouter } = require("./routes/matchRouter");
const teamRouter = require("./routes/teamRouter");
const predictionRouter = require("./routes/predictionRouter");

const app = express();
const port = process.argv[2] || process.env.PORT || 3000;

mongoose.connect(process.env.MONGO_CONNECTION_STRING)
  .then(() => console.log("Connected to MongoDB"))
  .catch((e) => console.error("MongoDB connection error:", e));

app.set("view engine", "ejs");
app.set("views", path.resolve(__dirname, "templates"));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.resolve(__dirname, "public")));
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false },
}));

app.use("/auth", authRouter);
app.use("/matches", matchRouter);
app.use("/teams", teamRouter);
app.use("/predictions", predictionRouter);

let homeTeamsCache = { crests: [], fetchedAt: 0 };

app.get("/", async (req, res) => {
  try {
    const now = Date.now();
    if (!homeTeamsCache.crests.length || now - homeTeamsCache.fetchedAt > 300000) {
      const r = await fetch("https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams");
      const data = await r.json();
      const teamList = data.sports[0].leagues[0].teams.map(t => t.team);
      homeTeamsCache.crests = teamList.filter(t => t.logos?.[0]?.href).map(t => ({ name: t.displayName, crest: t.logos[0].href }));
      homeTeamsCache.fetchedAt = now;
    }
    res.render("index", { user: req.session.user || null, crests: homeTeamsCache.crests });
  } catch (e) {
    res.render("index", { user: req.session.user || null, crests: [] });
  }
});

app.listen(port, () => {
  process.stdout.write(`Server running at http://localhost:${port}\n`);
});

process.stdin.on("data", (data) => {
  if (data.trim().toLowerCase() === "stop") {
    mongoose.connection.close();
    process.exit(0);
  }
});
