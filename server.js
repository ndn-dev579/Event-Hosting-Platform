require("dotenv").config();
const express = require("express");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");
const session = require("express-session");
const path = require("path");
const QRCode = require("qrcode");

const app = express();
const db = new sqlite3.Database("./database/evently.db");
const PORT = process.env.PORT || 3000; // Define PORT with a default value

// Middleware
app.set("view engine", "ejs");
app.use(express.urlencoded({ extended: true })); // To read form data
app.use(express.json());
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
app.post("/auth/login", (req, res, next) => {
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
app.get("/", (req, res, next) => {
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

// Full Events Feed: Show ALL upcoming published events (With Search)
app.get("/events", (req, res, next) => {
  const searchTerm = req.query.q || ""; // Get the search term from the URL

  const query = `
      SELECT 
          e.id, e.title, e.venue, e.event_date, e.hosted_by, e.total_seats,
          t.css_class,
          (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) as seats_taken
      FROM events e
      JOIN poster_templates t ON e.template_id = t.template_id
      WHERE e.event_status = 'published' 
      AND e.event_date >= datetime('now')
      AND (e.title LIKE ? OR e.venue LIKE ? OR e.hosted_by LIKE ?)
      ORDER BY e.event_date ASC`;

  // We use the % wildcard so it finds the text anywhere in the string
  const params = [`%${searchTerm}%`, `%${searchTerm}%`, `%${searchTerm}%`];

  db.all(query, params, (err, events) => {
    if (err) return next(err);

    // Check if the request is looking for JSON (Instant Search)
    if (req.xhr || req.headers.accept.indexOf("json") > -1) {
      return res.json({ events });
    }

    // Otherwise, render the page normally for the first load
    res.render("all_events", { events, user: req.session.user, searchTerm });
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
app.get("/admin/events/pending", isAuth, isAdmin, (req, res, next) => {
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
app.get("/admin/events/history", isAuth, isAdmin, (req, res, next) => {
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
app.get("/admin/users", isAuth, isAdmin, (req, res, next) => {
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
app.post("/admin/event-action", isAuth, isAdmin, (req, res, next) => {
  const { event_id, action, admin_note } = req.body; 

  // SECURITY GATE: Prevent rejection without a reason
  if (action === "rejected" && (!admin_note || admin_note.trim() === "")) {
      return res.status(400).send("Rejection failed: You must provide a reason for the host.");
  }

  const query = `UPDATE events SET 
                 event_status = ?, 
                 admin_note = ?, 
                 updated_at = CURRENT_TIMESTAMP 
                 WHERE id = ?`;

  db.run(query, [action, admin_note || null, event_id], (err) => {
      if (err) return next(err);
      res.redirect(action === "archived" ? "/admin/events/history" : "/admin/events/pending");
  });
});

// Admin Logic: Deactivate User
app.post("/admin/user-status", isAuth, isAdmin, (req, res, next) => {
  const { target_user_id, new_status } = req.body;
  db.run(
    "UPDATE users SET status = ? WHERE id = ?",
    [new_status, target_user_id],
    (err) => {
      if (err) return next(err);
      res.redirect("/admin/users"); //CHANGE HERE no /admin/users
    }
  );
});

// ==========================================
// 5. USER EVENT ACTIONS (Creation & Registration)
// ==========================================

// View events hosted by the current user (WITH REVENUE STATS)
app.get("/my-events", isAuth, (req, res, next) => {
  const query = `
      SELECT 
          e.id, e.title, e.event_date, e.event_status, 
          e.is_paid, e.price, e.total_seats,e.admin_note,
          (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) as sold_count
      FROM events e 
      WHERE e.user_id = ? 
      ORDER BY e.created_at DESC`;

  db.all(query, [req.session.user.id], (err, myEvents) => {
    if (err) return next(err);
    res.render("user_hosted_events", { 
      myEvents, 
      user: req.session.user,
      query: req.query });
  });
});

// View events the current user is attending (WITH CANCEL LOGIC & ANNOUNCEMENTS)
app.get("/my-tickets", isAuth, (req, res, next) => {
  // UPDATED QUERY: Added r.payment_status and e.public_announcement
  const query = `
      SELECT 
          e.title, e.event_date, e.venue, e.public_announcement, 
          r.ticket_code, r.created_at, r.payment_status, e.poster_color
      FROM registrations r
      JOIN events e ON r.event_id = e.id
      WHERE r.user_id = ?
      ORDER BY e.event_date ASC`;

  db.all(query, [req.session.user.id], async (err, rows) => {
      if (err) return next(err);

      // Generate QR Codes
      const myTickets = await Promise.all(rows.map(async (ticket) => {
          try {
              const qrCodeUrl = await QRCode.toDataURL(ticket.ticket_code);
              return { ...ticket, qr_code_url: qrCodeUrl }; 
          } catch (error) {
              console.error("QR Generation Error:", error);
              return { ...ticket, qr_code_url: null };
          }
      }));

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
    poster_color, // "#ff0000"
    // NEW FIELDS
    is_paid, // will be "on" if checked, or undefined
    price, // will be a number or empty
  } = req.body;

  // Convert Checkbox "on" to Boolean 1 or 0
  const isPaidInt = is_paid === "on" ? 1 : 0;
  const finalPrice = isPaidInt === 1 ? parseFloat(price) : 0.0;
  // 1. First, find the Integer ID for the selected text key
  // We need this because your table requires 'template_id' (Integer)
  db.get(
    "SELECT template_id FROM poster_templates WHERE template_key = ?",
    [poster_template_id || "modern"], // Default to 'modern' if empty
    (err, row) => {
      if (err) return next(err);

      // If for some reason the template isn't found, default to ID 1
      const integerId = row ? row.template_id : 1;

      // 2. Now Insert everything
      const query = `
        INSERT INTO events (
                user_id, hosted_by, template_id, poster_template_id, poster_color, 
                title, sub_title, duration, description, venue, event_date, total_seats,
                is_paid, price
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

      db.run(
        query,
        [
          req.session.user.id,
          hosted_by,
          integerId, // <--- Saving the Integer ID
          poster_template_id, // <--- Saving the String Key ('hackathon')
          poster_color, // <--- Saving the Color
          title,
          sub_title,
          duration,
          description,
          venue,
          event_date,
          total_seats,
          isPaidInt,
          finalPrice,
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

app.post("/events/register", isAuth, (req, res, next) => {
  const { event_id } = req.body;
  const user_id = req.session.user.id;
  const ticket_code =
    "EVT-" + Math.random().toString(36).substr(2, 9).toUpperCase();

  // FIX: Added 'is_paid' to the SELECT list below
  const seatCheckQuery = `
      SELECT 
          total_seats, 
          is_paid, 
          (SELECT COUNT(*) FROM registrations WHERE event_id = ?) as taken 
      FROM events WHERE id = ?`;

  db.get(seatCheckQuery, [event_id, event_id], (err, row) => {
    if (err) return next(err);

    // 1. Full Check
    if (row.taken >= row.total_seats) {
      return res.send("Error: This event is already full!");
    }

    // 2. Payment Check (Now this works because we selected 'is_paid')
    if (row.is_paid == 1) {
      return res.send(
        "Error: Payment required. Please use the payment button."
      );
    }

    // 3. Register
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

// DELETE EVENT ROUTE
app.delete("/api/events/delete/:id", isAuth, (req, res) => {
  const eventId = req.params.id;
  const userId = req.session.user.id; // Logged in user ID

  // Security: Only delete if the event ID matches AND the user_id matches
  const query = `DELETE FROM events WHERE id = ? AND user_id = ?`;

  db.run(query, [eventId, userId], function (err) {
    if (err) {
      return res.json({ success: false, message: "Database error" });
    }

    if (this.changes === 0) {
      // This happens if the ID doesn't exist OR the user doesn't own it
      return res.json({
        success: false,
        message: "Unauthorized or event not found",
      });
    }

    res.json({ success: true, message: "Event deleted successfully" });
  });
});

// DELETE REGISTRATION (Student Cancellation of their registered event)
app.post("/api/tickets/cancel", isAuth, (req, res) => {
  const { ticket_code } = req.body;
  const userId = req.session.user.id;

  // Security Check: 
  // 1. Must belong to the logged-in user
  // 2. payment_status MUST be 'free'
  const query = `DELETE FROM registrations 
                 WHERE ticket_code = ? 
                 AND user_id = ? 
                 AND payment_status = 'free'`;

  db.run(query, [ticket_code, userId], function(err) {
      if (err) {
          return res.status(500).json({ success: false, message: "Database error" });
      }

      if (this.changes === 0) {
          // This happens if the ticket is paid, or doesn't belong to the user
          return res.json({ 
              success: false, 
              message: "Cancellation denied. You can only cancel free registrations." 
          });
      }

      res.json({ success: true, message: "Registration cancelled successfully." });
  });
});

app.get("/events/edit/:id", isAuth, (req, res, next) => {
    const eventId = req.params.id;
    const userId = req.session.user.id;
    const userRole = req.session.user.role;

    // Logic: Allow access if you are the OWNER OR an ADMIN
    const query = `SELECT * FROM events WHERE id = ? AND (user_id = ? OR ? = 'admin')`;

    db.get(query, [eventId, userId, userRole], (err, event) => {
        if (err) return next(err);
        if (!event) return res.status(403).send("Unauthorized or event not found.");

        db.all("SELECT * FROM poster_templates", [], (err, templates) => {
            res.render("edit_event", { event, templates, user: req.session.user });
        });
    });
});

app.post("/events/edit/:id", isAuth, (req, res, next) => {
  const eventId = req.params.id;
  const userId = req.session.user.id;
  const userRole = req.session.user.role;

  const { 
      title, sub_title, venue, event_date, duration, 
      description, total_seats, is_paid, price, 
      public_announcement, admin_note 
  } = req.body;

  const isPaidInt = is_paid === "on" ? 1 : 0;
  const finalPrice = isPaidInt === 1 ? parseFloat(price) : 0.0;

  // Logic: Update if (Owner OR Admin) AND (Admin bypass OR No Registrations)
  const query = `
      UPDATE events SET 
          title = ?, sub_title = ?, venue = ?, event_date = ?, 
          duration = ?, description = ?, total_seats = ?, 
          is_paid = ?, price = ?, 
          public_announcement = ?, admin_note = ?,
          event_status = CASE WHEN ? = 'admin' THEN 'published' ELSE 'pending_review' END,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ? 
      AND (user_id = ? OR ? = 'admin') 
      AND (? = 'admin' OR (SELECT COUNT(*) FROM registrations WHERE event_id = ?) = 0)`;

  db.run(query, [
      title, sub_title, venue, event_date, duration, description, 
      total_seats, isPaidInt, finalPrice, 
      public_announcement, admin_note,
      userRole, // Used for the CASE status update
      eventId, userId, userRole, userRole, eventId
  ], function (err) {
      if (err) {
          console.error("Update Error:", err.message);
          return next(err);
      }

      if (this.changes === 0) {
          return res.status(403).send("Access Denied: Registrations exist or you lack permission.");
      }

      res.redirect("/my-events?msg=update_success");
  });
});

// MOCK PAYMENT ROUTE
app.post("/events/mock-pay", isAuth, (req, res, next) => {
  const { event_id } = req.body;
  const user_id = req.session.user.id;

  // 1. Perform all the checks (Availability, Duplicates, etc.)
  const checkQuery = `
      SELECT 
          e.id, e.price, e.is_paid, e.total_seats,
          (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) as taken_seats,
          (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id AND r.user_id = ?) as is_registered
      FROM events e 
      WHERE e.id = ?`;

  db.get(checkQuery, [user_id, event_id], (err, event) => {
    if (err) return next(err);

    // --- VALIDATION BLOCKS ---
    if (!event) return res.json({ success: false, message: "Event not found" });
    if (event.taken_seats >= event.total_seats)
      return res.json({ success: false, message: "Housefull!" });
    if (event.is_registered > 0)
      return res.json({ success: false, message: "Already registered." });
    if (!event.is_paid)
      return res.json({ success: false, message: "This event is free." });

    // --- SUCCESS SIMULATION ---
    // Instead of verifying a real signature, we just generate a fake Transaction ID
    const fakeTxnId =
      "MOCK_TXN_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
    const ticket_code =
      "EVT-" + Math.random().toString(36).substr(2, 9).toUpperCase();

    const insertQuery = `INSERT INTO registrations (user_id, event_id, ticket_code, payment_status, transaction_id, payment_date) VALUES (?, ?, ?, 'completed', ?, datetime('now'))`;

    db.run(insertQuery, [user_id, event_id, ticket_code, fakeTxnId], (err) => {
      if (err) return res.json({ success: false, message: "Database Error" });

      // Send back success signal
      res.json({ success: true, ticket_code: ticket_code });
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
