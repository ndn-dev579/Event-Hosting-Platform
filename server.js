require("dotenv").config();
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");

const app = express();
const db = new sqlite3.Database("./database/evently.db");
const PORT = process.env.PORT || 3000; // Define PORT with a default value

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
app.post("/auth/login", (req, res,next) => {
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
app.get("/", (req, res,next) => {
  // Logic: Join with registrations to count taken seats per event
  const query = `SELECT 
                      e.id, e.title, e.venue, e.event_date, e.hosted_by, e.total_seats,
                      t.css_class,
                      (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) as seats_taken
                  FROM events e
                  JOIN poster_templates t ON e.template_id = t.template_id
                  WHERE e.event_status = 'published' 
                  AND e.event_date >= datetime('now')
                  ORDER BY e.event_date ASC
                  LIMIT 6`;

  db.all(query, [], (err, events) => {
    if (err) return next(err);
    res.render("home", { events, user: req.session.user });
  });
});

// Full Events Feed: Show ALL upcoming published events
app.get("/events", (req, res,next) => {
  const query = `
      SELECT 
          e.id, e.title, e.venue, e.event_date, e.hosted_by, e.total_seats,
          t.css_class,
          (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) as seats_taken
      FROM events e
      JOIN poster_templates t ON e.template_id = t.template_id
      WHERE e.event_status = 'published' 
      AND e.event_date >= datetime('now')
      ORDER BY e.event_date ASC`;

  db.all(query, [], (err, events) => {
      if (err) return next(err);
      res.render("all_events", { events, user: req.session.user });
  });
});
// 4.1 Event Details Page
app.get("/events/view/:id", (req, res, next) => {
  const eventId = req.params.id;

  // Join with templates and counts seats
  const query = `
      SELECT 
          e.*, 
          t.css_class,
          (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) as seats_taken
      FROM events e
      JOIN poster_templates t ON e.template_id = t.template_id
      WHERE e.id = ?`;

  db.get(query, [eventId], (err, event) => {
    if (err) return next(err);
    if (!event) return res.status(404).send("Event not found.");

    // Human-in-the-Loop Security:
    // Only Admins or the Creator can see 'pending' or 'rejected' events.
    const canView =
      event.event_status === "published" ||
      (req.session.user &&
        (req.session.user.role === "admin" ||
          req.session.user.id === event.user_id));

    if (!canView) {
      return res.status(403).send("This event is currently under review.");
    }

    res.render("event_details", { event, user: req.session.user });
  });
});

// ==========================================
// 5. ADMIN & PRIVATE ROUTES (Using Protectors)
// ==========================================

// Main Admin Menu
app.get("/admin/dashboard", isAuth, isAdmin, (req, res) => {
  res.render("admin_menu", { user: req.session.user });
});

// 1. Pending Events Review Page (The Queue)
app.get("/admin/events/pending", isAuth, isAdmin, (req, res,next) => {
  const query = `SELECT e.id, e.title, e.event_date, e.venue, u.name as creator_name 
                FROM events e
                JOIN users u ON e.user_id = u.id 
                WHERE e.event_status = 'pending_review'`;

  db.all(query, [], (err, pendingEvents) => {
    if (err) return next(err);
    res.render("admin_pending_events", {
      pendingEvents,
      user: req.session.user,
    });
  });
});

// 2. Event History Page (Accepted, Rejected, Archived)
app.get("/admin/events/history", isAuth, isAdmin, (req, res,next) => {
  const query = `SELECT e.id, e.title, e.event_date, e.event_status, u.name as creator_name 
                   FROM events e
                   JOIN users u ON e.user_id = u.id 
                   WHERE e.event_status != 'pending_review'
                   ORDER BY e.event_date DESC`;

  db.all(query, [], (err, eventHistory) => {
    if (err) return next(err);
    res.render("admin_event_history", { eventHistory, user: req.session.user });
  });
});

// 3. User Management Page
app.get("/admin/users", isAuth, isAdmin, (req, res,next) => {
  db.all(
    "SELECT id, name, email, role, grad_year, status FROM users",
    [],
    (err, allUsers) => {
      if (err) return next(err);
      res.render("admin_user_management", {
        allUsers,
        user: req.session.user,
        currentYear: new Date().getFullYear(),
      });
    }
  );
});

// Admin Logic: Approve, Reject, or Archive Event
app.post("/admin/event-action", isAuth, isAdmin, (req, res,next) => {
  const { event_id, action } = req.body; // action: 'published', 'rejected', or 'archived'
  db.run(
    "UPDATE events SET event_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
    [action, event_id],
    (err) => {
      if (err) return next(err);
      // Redirect back to the page they came from
      res.redirect("back");
    }
  );
});

// Admin Logic: Deactivate User
app.post("/admin/user-status", isAuth, isAdmin, (req, res,next) => {
  const { target_user_id, new_status } = req.body;
  db.run(
    "UPDATE users SET status = ? WHERE id = ?",
    [new_status, target_user_id],
    (err) => {
      if (err) return next(err);
      res.redirect("/admin/users");
    }
  );
});

// ==========================================
// 5. USER EVENT ACTIONS (Creation & Registration)
// ==========================================

// View events hosted by the current user
app.get("/my-events", isAuth, (req, res, next) => {
  const query = `SELECT id, title, event_date, event_status FROM events WHERE user_id = ? ORDER BY created_at DESC`;
  db.all(query, [req.session.user.id], (err, myEvents) => {
      if (err) return next(err);
      res.render("user_hosted_events", { myEvents, user: req.session.user });
  });
});

// View events the current user is attending
app.get("/my-tickets", isAuth, (req, res, next) => {
  const query = `
      SELECT e.title, e.event_date, e.venue, r.ticket_code, r.created_at 
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      WHERE r.user_id = ?
      ORDER BY e.event_date ASC`;
  
  db.all(query, [req.session.user.id], (err, myTickets) => {
      if (err) return next(err);
      res.render("user_tickets", { myTickets, user: req.session.user });
  });
});

app.get("/events/create", isAuth, (req, res) => {
  db.all("SELECT * FROM poster_templates", [], (err, templates) => {
    res.render("create_event", { templates, user: req.session.user });
  });
});

app.post("/events/create", isAuth, (req, res, next) => {
  const {
    title,
    sub_title,
    hosted_by,
    venue,
    event_date,
    duration,
    description,
    total_seats,
    // New fields from the form
    poster_template_id, // "modern", "bold", etc.
    poster_color        // "#ff0000"
  } = req.body;

  // 1. First, find the Integer ID for the selected text key
  // We need this because your table requires 'template_id' (Integer)
  db.get(
    "SELECT template_id FROM poster_templates WHERE template_key = ?", 
    [poster_template_id || 'modern'], // Default to 'modern' if empty
    (err, row) => {
      if (err) return next(err);

      // If for some reason the template isn't found, default to ID 1
      const integerId = row ? row.template_id : 1; 

      // 2. Now Insert everything
      const query = `
        INSERT INTO events (
          user_id, hosted_by, 
          template_id,         -- The Integer ID (Required by your table)
          poster_template_id,  -- The Text Key (Used by our JS Builder)
          poster_color,        -- The Hex Color
          title, sub_title, duration, description, venue, event_date, total_seats
        ) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(
        query,
        [
          req.session.user.id,
          hosted_by,
          integerId,               // <--- Saving the Integer ID
          poster_template_id,      // <--- Saving the String Key ('hackathon')
          poster_color,            // <--- Saving the Color
          title,
          sub_title,
          duration,
          description,
          venue,
          event_date,
          total_seats,
        ],
        (err) => {
          if (err) {
             console.log(err); // Log error to terminal so we can see it
             return next(err);
          }
          res.redirect("/?msg=event_submitted_for_review");
        }
      );
    }
  );
});

app.post("/events/register", isAuth, (req, res,next) => {
  const { event_id } = req.body;
  const user_id = req.session.user.id;
  const ticket_code =
    "EVT-" + Math.random().toString(36).substr(2, 9).toUpperCase();

  // STEP 1: Check seat availability first
  const seatCheckQuery = `
      SELECT 
          total_seats, 
          (SELECT COUNT(*) FROM registrations WHERE event_id = ?) as taken 
      FROM events WHERE id = ?`;

  db.get(seatCheckQuery, [event_id, event_id], (err, row) => {
    if (err) return next(err);

    if (row.taken >= row.total_seats) {
      return res.send("Error: This event is already full!");
    }

    // STEP 2: Proceed with registration if seats are available
    const query = `INSERT INTO registrations (user_id, event_id, ticket_code) VALUES (?, ?, ?)`;

    db.run(query, [user_id, event_id, ticket_code], (err) => {
      if (err) {
        if (err.message.includes("UNIQUE constraint failed")) {
          return res.send("Error: You are already registered for this event!");
        }
        return next(err);
      }
      res.redirect("/my-tickets");
    });
  });
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


//#003049 dark blue
//#669bbc light blue
//#fdf0d5 cream