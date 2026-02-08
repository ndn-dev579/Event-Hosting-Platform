const path = require('path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = path.join(__dirname, 'database', 'evently.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`ALTER TABLE events ADD COLUMN admin_note TEXT`, (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("Error adding admin_note:", err.message);
    } else {
      console.log("admin_note column checked/added");
    }
  });

  db.run(`ALTER TABLE events ADD COLUMN public_announcement TEXT`, (err) => {
    if (err && !err.message.includes("duplicate column")) {
      console.error("Error adding public_announcement:", err.message);
    } else {
      console.log("public_announcement column checked/added");
    }
  });
});

db.close(() => {
  console.log("Database update complete.");
});
