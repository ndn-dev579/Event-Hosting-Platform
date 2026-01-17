const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt'); // We need this to hash the password
const path = require('path');

// Connect to the database
const dbPath = path.resolve(__dirname, 'database', 'evently.db');
const db = new sqlite3.Database(dbPath);

const createAdmin = async () => {
    console.log("🔒 Generating Admin Credentials...");

    // 1. Create a secure hash for the password "admin123"
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // 2. Insert the Admin User
    const query = `
        INSERT INTO users (name, email, password, phone, grad_year, role, status) 
        VALUES (?, ?, ?, ?, ?, 'admin', 'active')
    `;

    // Admin Details
    const adminUser = [
        'Super Admin',          // Name
        'admin@evently.com',    // Email
        hashedPassword,         // Hashed Password
        '0000000000',           // Phone
        2025                    // Grad Year
    ];

    db.run(query, adminUser, function(err) {
        if (err) {
            if (err.message.includes('UNIQUE constraint failed')) {
                console.log("⚠️  Error: An admin with this email already exists.");
            } else {
                console.error("❌ Error creating admin:", err.message);
            }
        } else {
            console.log("✅ SUCCESS! Admin Account Created.");
            console.log("-------------------------------------");
            console.log("📧 Email:    admin@evently.com");
            console.log("🔑 Password: admin123");
            console.log("-------------------------------------");
        }
    });
};

createAdmin();