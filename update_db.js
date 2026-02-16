const path = require('path');
const sqlite3 = require('sqlite3').verbose();

// Ensure the path matches your server.js setup
const dbPath = path.join(__dirname, 'database', 'evently.db');
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
    // 1. Add the 'coordinators' column to the 'events' table
    // We use TEXT to store a comma-separated list of names
    db.run(`ALTER TABLE events ADD COLUMN coordinators TEXT`, (err) => {
        if (err) {
            if (err.message.includes("duplicate column name")) {
                console.log("ℹ️ Column 'coordinators' already exists.");
            } else {
                console.error("❌ Error adding column:", err.message);
            }
        } else {
            console.log("✅ Column 'coordinators' added successfully.");
        }
    });});

    db.close((err) => { // Added 'err' parameter here
        if (err) {
            console.error("❌ Error closing database:", err.message);
        } else {
            console.log("🏁 Database migration complete.");
        }
    });