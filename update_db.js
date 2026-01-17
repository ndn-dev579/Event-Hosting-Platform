const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// !!! IMPORTANT: Check this path !!!
// Ensure this points to where your actual .db file is located.
// If your db is in a 'database' folder at the root, this is correct.
const dbPath = path.resolve(__dirname, 'database', 'evently.db'); 

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Error opening database:", err.message);
        return;
    }
    console.log("Connected to SQLite database at:", dbPath);
});

db.serialize(() => {
    console.log("--- Starting Database Update ---");

    // 1. Add 'poster_color' Column
    db.run("ALTER TABLE events ADD COLUMN poster_color TEXT DEFAULT '#ef4444'", (err) => {
        if (err) {
            if (err.message.includes("duplicate column")) {
                console.log("ℹ️  Column 'poster_color' already exists. Skipping.");
            } else {
                console.error("❌ Error adding 'poster_color':", err.message);
            }
        } else {
            console.log("✅ Column 'poster_color' added successfully.");
        }
    });

    // 2. Add 'poster_template_id' Column
    db.run("ALTER TABLE events ADD COLUMN poster_template_id TEXT DEFAULT 'modern'", (err) => {
        if (err) {
            if (err.message.includes("duplicate column")) {
                console.log("ℹ️  Column 'poster_template_id' already exists. Skipping.");
            } else {
                console.error("❌ Error adding 'poster_template_id':", err.message);
            }
        } else {
            console.log("✅ Column 'poster_template_id' added successfully.");
        }
    });
});

db.close((err) => {
    if (err) {
        console.error(err.message);
    }
    console.log("--- Update Complete. Connection Closed ---");
});