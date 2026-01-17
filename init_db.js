const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Point to your specific database file
const dbPath = path.resolve(__dirname, 'database', 'evently.db');
const db = new sqlite3.Database(dbPath);

console.log(`Connected to database at: ${dbPath}`);

db.serialize(() => {
    // 1. Drop existing tables so we can recreate them correctly
    // db.run("DROP TABLE IF EXISTS registrations");
    // db.run("DROP TABLE IF EXISTS events");
    // db.run("DROP TABLE IF EXISTS poster_templates");
    // db.run("DROP TABLE IF EXISTS users");

    // 2. Create Users Table
    db.run(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        grad_year INTEGER NOT NULL,
        role TEXT CHECK(role IN ('admin', 'user')) DEFAULT 'user',
        status TEXT DEFAULT 'active'
    )`);

    // 3. Create Templates Table (CRITICAL FIX: Using 'template_id')
    db.run(`CREATE TABLE poster_templates (
        template_id INTEGER PRIMARY KEY AUTOINCREMENT, -- Named exactly 'template_id'
        template_name TEXT NOT NULL,
        template_key TEXT UNIQUE NOT NULL, 
        css_class TEXT
    )`);

    // 4. Create Events Table
    db.run(`CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        hosted_by TEXT NOT NULL,
        
        template_id INTEGER NOT NULL, -- Links to poster_templates.template_id
        
        poster_template_id TEXT DEFAULT 'modern', 
        poster_color TEXT DEFAULT '#ef4444',

        title TEXT NOT NULL,
        sub_title TEXT,
        duration INTEGER NOT NULL,
        description TEXT NOT NULL,
        venue TEXT NOT NULL,
        event_date DATETIME NOT NULL,
        total_seats INTEGER NOT NULL,
        is_paid BOOLEAN DEFAULT 0,
        price REAL DEFAULT 0.0,
        event_status TEXT CHECK(event_status IN ('pending_review', 'published', 'rejected', 'archived')) DEFAULT 'pending_review',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (template_id) REFERENCES poster_templates(template_id)
    )`);

    // 5. Create Registrations Table
    db.run(`CREATE TABLE registrations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        event_id INTEGER NOT NULL,
        ticket_code TEXT UNIQUE NOT NULL,
        payment_status TEXT CHECK(payment_status IN ('free', 'pending', 'completed', 'failed')) DEFAULT 'free',
        transaction_id TEXT,
        payment_date DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, event_id),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
    )`);

    // 6. Seed Data (Re-inserting the templates)
    const insertTemplate = db.prepare("INSERT INTO poster_templates (template_name, template_key, css_class) VALUES (?, ?, ?)");
    insertTemplate.run('Brutal Grid',      'modern',    'bg-white');
    insertTemplate.run('Propaganda Block', 'bold',      'bg-stone-200');
    insertTemplate.run('Terminal Error',   'hackathon', 'bg-black');
    insertTemplate.finalize();

    db.close((err) => {
        if (err) console.error(err.message);
        else console.log("✅ Database fixed! Column is now named 'template_id'.");
    });
});