require("dotenv").config();
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");

const app = express();
const db = new sqlite3.Database("./database/evently.db");

// Middleware
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true })); // To read form data
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET, // In production, move to .env
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  })
);

// --- AUTHENTICATION ROUTES ---

// --- PAGE ROUTES ---
app.get("/login", (req, res) => res.render("login"));
app.get("/signup", (req, res) => res.render("signup"));

// 1. Signup Route
app.post("/auth/signup", async (req, res) => {
  const { name, email, password, phone, grad_year } = req.body;
  const orgDomain = "@yourcollege.edu"; // Your rule

  if (!email.endsWith(orgDomain)) {
    return res.send("Access Denied: Use your college email.");
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const query = `INSERT INTO users (name, email, password, phone, grad_year, role, status) VALUES (?, ?, ?, ?, ?, 'user', 'active')`;

    db.run(query, [name, email, hashedPassword, phone, grad_year], (err) => {
      if (err) return res.send("Email already exists.");
      res.redirect("/login");
    });
  } catch (error) {
    res.status(500).send("Error creating user.");
  }
});

// 2. Login Route (With Passout Student Protection)
app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  const currentYear = new Date().getFullYear();

  db.get(`SELECT * FROM users WHERE email = ?`, [email], async (err, user) => {
    if (!user) return res.send("User not found.");

    // Check A: Graduation Check (Passout Logic)
    if (user.role === "user" && currentYear > user.grad_year) {
      return res.send(
        `Access Denied: Your access expired in ${user.grad_year}.`
      );
    }

    // Check B: Admin Status Check
    if (user.status !== "active") {
      return res.send("Your account has been deactivated by an admin.");
    }

    // Check C: Password Check
    const match = await bcrypt.compare(password, user.password);
    if (match) {
      req.session.user = { id: user.id, name: user.name, role: user.role };
      res.redirect("/"); // Go to homepage
    } else {
      res.send("Invalid password.");
    }
  });
});

// 3. Logout
app.get("/logout", (req, res) => {
  req.session.destroy();
  res.redirect("/login");
});

// Homepage (Only show upcoming published events)
app.get("/", (req, res) => {
  const query = `SELECT * FROM events WHERE event_status = 'published' AND event_date >= datetime('now')`;
  db.all(query, [], (err, events) => {
    res.render("home", { events, user: req.session.user });
  });
});

app.listen(3000, () => console.log("Server started on http://localhost:3000"));
