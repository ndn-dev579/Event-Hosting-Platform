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

// ==========================================
// 2. SECURITY MIDDLEWARE (The Protectors)
// ==========================================

// Helper: Check if user is logged in and not a passout student
const isAuth = (req, res, next) => {
  const currentYear = new Date().getFullYear();

  // Check 1: Is there a session?
  if (!req.session.user) {
    return res.redirect("/login");
  }

  // Check 2: Has the student graduated? (Auto-lock for passouts)
  if (
    req.session.user.role === "user" &&
    currentYear > req.session.user.grad_year
  ) {
    req.session.destroy();
    return res.redirect("/login?error=access_expired");
  }

  // Check 3: Is the account manually deactivated by Admin?
  if (req.session.user.status === "inactive") {
    req.session.destroy();
    return res.redirect("/login?error=account_deactivated");
  }

  next();
};

// Helper: Check if user has admin privileges
const isAdmin = (req, res, next) => {
  if (req.session.user && req.session.user.role === "admin") {
    return next();
  }
  res.status(403).send("Access Denied: Administrative privileges required.");
};

// ==========================================
//              AUTH ROUTES (Login, Signup, Logout)
// ==========================================

// --- PAGE ROUTES ---
app.get("/login", (req, res) => res.render("login"));
app.get("/signup", (req, res) => res.render("signup"));

// 1. Signup Route
app.post("/auth/signup", async (req, res) => {
  const { name, email, password, phone, grad_year } = req.body;
  const orgDomain = process.env.ORG_DOMAIN; // Your rule

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

    // logic: Check Graduation Year before checking password (Efficiency)
    if (user.role === "user" && currentYear > user.grad_year) {
      return res.send(
        `Access Denied: Your student portal access expired in ${user.grad_year}.`
      );
    }

    // logic: Check manual status
    if (user.status !== "active") {
      return res.send("Account Deactivated: Please contact administration.");
    }

    const match = await bcrypt.compare(password, user.password);
    if (match) {
      // CRITICAL: Storing grad_year in session for the isAuth protector
      req.session.user = {
        id: user.id,
        name: user.name,
        role: user.role,
        grad_year: user.grad_year,
        status: user.status,
      };
      res.redirect("/");
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

// ==========================================
// 4. GENERAL CONTENT ROUTES
// ==========================================

// Homepage: Show only 'published' events that haven't happened yet
app.get("/", (req, res) => {
  const query = `
      SELECT events.*, poster_templates.css_class 
      FROM events 
      JOIN poster_templates ON events.template_id = poster_templates.template_id
      WHERE events.event_status = 'published' 
      AND events.event_date >= datetime('now')
      ORDER BY events.event_date ASC`;

  db.all(query, [], (err, events) => {
    if (err) return next(err);
    res.render("home", { events, user: req.session.user });
  });
});

// ==========================================
// 5. ADMIN & PRIVATE ROUTES (Using Protectors)
// ==========================================

app.get("/admin/dashboard", isAuth, isAdmin, (req, res) => {
  // Logic for admin to see pending events
  res.render("admin_dashboard", { user: req.session.user });
});

// ==========================================
// 6. GLOBAL ERROR HANDLER (Centralized)
// ==========================================
app.use((err, req, res, next) => {
  console.error("SERVER ERROR:", err.stack);
  res
    .status(500)
    .send("Something went wrong on our end. We are investigating!");
});

app.listen(PORT, () => {
  console.log(`Evently is live at http://localhost:${PORT}`);
});
