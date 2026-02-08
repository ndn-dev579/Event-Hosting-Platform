const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Ensure the path matches your server.js setup
const dbPath = path.join(__dirname, 'database', 'evently.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Add T00:00 to records that only have a date
    db.run(`UPDATE events SET event_date = event_date || 'T00:00' WHERE event_date NOT LIKE '%T%' AND event_date NOT LIKE '% %'`, (err) => {
        if (err) console.error("Error adding T:", err.message);
        else console.log("Added T00:00 to date-only records.");
    });

    // 2. Convert existing spaces to T (e.g., '2026-10-24 10:00' -> '2026-10-24T10:00')
    // This is the #1 reason the datetime-local input remains blank.
    db.run(`UPDATE events SET event_date = REPLACE(event_date, ' ', 'T') WHERE event_date LIKE '% %'`, (err) => {
        if (err) console.error("Error replacing spaces:", err.message);
        else console.log("Converted spaces to T format.");
    });
});

db.close(() => {
    console.log("Database cleanup complete.");
});