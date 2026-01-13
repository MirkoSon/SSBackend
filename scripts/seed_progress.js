const sqlite3 = require('sqlite3').verbose();
const path = require('path');

// Hardcoded path based on src/db/database.js logic
const dbFile = path.join(__dirname, '../game.db');
console.log(`🌱 Seeding fake progress into ${dbFile}...`);

const db = new sqlite3.Database(dbFile, (err) => {
    if (err) {
        console.error('❌ Could not connect to database:', err.message);
        process.exit(1);
    }
    console.log('✅ Connected to SQLite database.');
});

function run(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function (err) {
            if (err) reject(err);
            else resolve(this);
        });
    });
}

function get(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (err, row) => {
            if (err) reject(err);
            else resolve(row);
        });
    });
}

function all(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
}

async function seed() {
    try {
        // 1. Get or Create User
        let user = await get("SELECT * FROM users ORDER BY id LIMIT 1");
        let userId;

        if (!user) {
            console.log("Creating fake user 'TestPlayer'...");
            const res = await run("INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)", ['TestPlayer', 'hash', 'test@example.com']);
            userId = res.lastID;
        } else {
            console.log(`Using existing user: ${user.username} (ID: ${user.id})`);
            userId = user.id;
        }

        // 2. Get Achievements
        const achievements = await all("SELECT * FROM plugin_achievements");
        if (achievements.length === 0) {
            console.error("❌ No achievements found! Please return to admin dashboard to seed defaults first.");
            return;
        }

        console.log(`Found ${achievements.length} achievements definitions.`);

        // 3. Insert Fake Progress
        await run("DELETE FROM plugin_user_achievements WHERE user_id = ?", [userId]);

        for (const [index, ach] of achievements.entries()) {
            let state = 'locked';
            let progress = 0;

            // 1st unlocked, 2nd in progress
            if (index === 0) {
                state = 'unlocked';
                progress = ach.target;
            } else if (index === 1) {
                state = 'in_progress';
                progress = Math.floor(ach.target / 2);
            }

            await run(`
                INSERT INTO plugin_user_achievements (user_id, achievement_id, state, progress, updated_at, unlocked_at)
                VALUES (?, ?, ?, ?, datetime('now'), ?)
            `, [userId, ach.id, state, progress, state === 'unlocked' ? new Date().toISOString() : null]);

            console.log(`   - Set ${ach.code} to ${state}`);
        }

        console.log("✅ Fake progress seeded successfully!");

    } catch (err) {
        console.error("❌ Seeding failed:", err);
    } finally {
        db.close((err) => {
            if (err) console.error("Error closing DB:", err);
            else console.log("Database closed.");
        });
    }
}

seed();
