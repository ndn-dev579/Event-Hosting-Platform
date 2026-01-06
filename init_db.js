const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./database/evently.db');

db.serialize(() => {
    // Drop tables if they exist
    db.run("DROP TABLE IF EXISTS registrations");
    db.run("DROP TABLE IF EXISTS events");
    db.run("DROP TABLE IF EXISTS poster_templates");
    db.run("DROP TABLE IF EXISTS users");

    // 1. Users Table (No changes needed, but 'id' should match foreign keys)
    db.run(`CREATE TABLE users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        role TEXT CHECK(role IN ('admin', 'user')) DEFAULT 'user',
        status TEXT DEFAULT 'active'
    )`);

    // 2. Templates Table
    db.run(`CREATE TABLE poster_templates (
        template_id INTEGER PRIMARY KEY AUTOINCREMENT,
        template_name TEXT NOT NULL,
        css_class TEXT NOT NULL
    )`);

    // 3. Events Table (FIXED: Foreign Key names and Check Constraint)
    db.run(`CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        hosted_by TEXT NOT NULL,
        template_id INTEGER NOT NULL,
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

    // 4. Registrations Table
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

    // Seed initial templates
    db.run(`INSERT INTO poster_templates (template_name, css_class) VALUES 
        ('Modern Blue', 'theme-blue'),
        ('Neon Dark', 'theme-neon'),
        ('Academic Formal', 'theme-formal')`);

        db.close((err) => {
            if (err) console.error(err.message);
            else console.log("Database initialized and templates seeded!");
        });
    
    });