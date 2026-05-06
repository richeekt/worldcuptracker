const express = require("express");
const bcrypt = require("bcrypt");
const User = require("../models/User");

const router = express.Router();

router.get("/signup", (req, res) => {
  res.render("signup", { error: null });
});

router.post("/signup", async (req, res) => {
  const { username, email, password, confirmPassword } = req.body;
  try {
    if (!username || !email || !password) {
      return res.render("signup", { error: "All fields are required." });
    }
    if (password !== confirmPassword) {
      return res.render("signup", { error: "Passwords do not match." });
    }
    if (password.length < 6) {
      return res.render("signup", { error: "Password must be at least 6 characters." });
    }
    const existing = await User.findOne({ $or: [{ username }, { email }] });
    if (existing) {
      return res.render("signup", { error: "Username or email already taken." });
    }
    const passwordHash = await bcrypt.hash(password, 10);
    await User.create({ username, email, passwordHash });
    res.redirect("/auth/login");
  } catch (e) {
    console.error(e);
    res.render("signup", { error: "Something went wrong. Please try again." });
  }
});

router.get("/login", (req, res) => {
  res.render("login", { error: null });
});

router.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const user = await User.findOne({ username });
    if (!user) {
      return res.render("login", { error: "Invalid username or password." });
    }
    const match = await bcrypt.compare(password, user.passwordHash);
    if (!match) {
      return res.render("login", { error: "Invalid username or password." });
    }
    req.session.user = { _id: user._id, username: user.username };
    res.redirect("/matches/dashboard");
  } catch (e) {
    console.error(e);
    res.render("login", { error: "Something went wrong. Please try again." });
  }
});

router.get("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

module.exports = router;
