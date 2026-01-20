/**
 * Database Seeding Script
 * Seeds the default project database with sample data for all features
 */

const { getDatabase } = require('./database');

// Sample data generators
const SAMPLE_USERS = [
  { username: 'alex_rivera', password: '$2a$10$dummyhash1' },
  { username: 'sarah_connor', password: '$2a$10$dummyhash2' },
  { username: 'mike_jordan', password: '$2a$10$dummyhash3' },
  { username: 'emma_lee', password: '$2a$10$dummyhash4' },
  { username: 'john_smith', password: '$2a$10$dummyhash5' },
  { username: 'lisa_wang', password: '$2a$10$dummyhash6' },
  { username: 'david_chen', password: '$2a$10$dummyhash7' },
  { username: 'maria_garcia', password: '$2a$10$dummyhash8' },
  { username: 'tom_wilson', password: '$2a$10$dummyhash9' },
  { username: 'anna_kim', password: '$2a$10$dummyhash10' },
];

// Generate random date within last N days
function randomDate(daysAgo) {
  const now = new Date();
  const past = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
  const random = new Date(past.getTime() + Math.random() * (now.getTime() - past.getTime()));
  return random.toISOString();
}

// Generate random login count
function randomLoginCount() {
  return Math.floor(Math.random() * 150) + 10;
}

// Generate sample save data
function generateSaveData(userId) {
  const saveData = {
    level: Math.floor(Math.random() * 50) + 1,
    position: {
      x: Math.random() * 1000 - 500,
      y: Math.random() * 1000 - 500,
    },
    inventory: {
      gold: Math.floor(Math.random() * 10000),
      gems: Math.floor(Math.random() * 500),
      items: ['sword_01', 'shield_02', 'potion_health'],
    },
    checkpoint: 'level_' + (Math.floor(Math.random() * 10) + 1),
    quest_active: {
      id: 'quest_' + (Math.floor(Math.random() * 20) + 1),
      progress: Math.floor(Math.random() * 100),
    },
  };
  return JSON.stringify(saveData);
}

// Sample character progress metrics
const PROGRESS_METRICS = [
  { name: 'level', min: 1, max: 100, current_factor: 0.3 },
  { name: 'experience', min: 0, max: 100000, current_factor: 0.5 },
  { name: 'play_time_minutes', min: 0, max: 10000, current_factor: 0.4 },
  { name: 'skill_points', min: 0, max: 500, current_factor: 0.2 },
  { name: 'boss_kills', min: 0, max: 50, current_factor: 0.6 },
];

// Sample inventory items
const INVENTORY_ITEMS = [
  'premium_gem_01',
  'mega_potion_hp',
  'iron_sword_v2',
  'legendary_armor',
  'speed_boost',
  'health_elixir',
  'mana_crystal',
  'gold_coin_bundle',
  'rare_artifact',
  'epic_weapon',
];

/**
 * Clear all existing data (for re-seeding)
 */
async function clearData(db) {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log('Clearing existing data...');
      db.run('DELETE FROM user_achievements');
      db.run('DELETE FROM character_progress');
      db.run('DELETE FROM inventory');
      db.run('DELETE FROM saves');
      db.run('DELETE FROM users', (err) => {
        if (err) reject(err);
        else {
          console.log('Data cleared successfully');
          resolve();
        }
      });
    });
  });
}

/**
 * Seed users
 */
async function seedUsers(db) {
  return new Promise((resolve, reject) => {
    console.log('Seeding users...');
    const stmt = db.prepare(`
      INSERT INTO users (username, password, created_at, last_login, login_count)
      VALUES (?, ?, ?, ?, ?)
    `);

    let completed = 0;
    const createdUserIds = [];

    SAMPLE_USERS.forEach((user) => {
      const createdAt = randomDate(90);
      const lastLogin = randomDate(7);
      const loginCount = randomLoginCount();

      stmt.run(
        [user.username, user.password, createdAt, lastLogin, loginCount],
        function (err) {
          if (err) {
            console.error(`Error seeding user ${user.username}:`, err.message);
            reject(err);
            return;
          }
          createdUserIds.push(this.lastID);
          completed++;

          if (completed === SAMPLE_USERS.length) {
            stmt.finalize();
            console.log(`Seeded ${SAMPLE_USERS.length} users successfully`);
            resolve(createdUserIds);
          }
        }
      );
    });
  });
}

/**
 * Seed game saves
 */
async function seedSaves(db, userIds) {
  return new Promise((resolve, reject) => {
    console.log('Seeding game saves...');
    const stmt = db.prepare(`
      INSERT INTO saves (id, data, created_at, updated_at)
      VALUES (?, ?, ?, ?)
    `);

    let completed = 0;
    const total = userIds.length;

    userIds.forEach((userId, index) => {
      const saveId = `SAV_${Date.now()}_${index}`;
      const saveData = generateSaveData(userId);
      const createdAt = randomDate(60);
      const updatedAt = randomDate(7);

      stmt.run([saveId, saveData, createdAt, updatedAt], (err) => {
        if (err) {
          console.error(`Error seeding save for user ${userId}:`, err.message);
          reject(err);
          return;
        }
        completed++;

        if (completed === total) {
          stmt.finalize();
          console.log(`Seeded ${total} game saves successfully`);
          resolve();
        }
      });
    });
  });
}

/**
 * Seed character progress
 */
async function seedCharacterProgress(db, userIds) {
  return new Promise((resolve, reject) => {
    console.log('Seeding character progress...');
    const stmt = db.prepare(`
      INSERT INTO character_progress (user_id, metric_name, current_value, max_value, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    let completed = 0;
    const total = userIds.length * PROGRESS_METRICS.length;

    userIds.forEach((userId) => {
      PROGRESS_METRICS.forEach((metric) => {
        const maxValue = metric.max;
        const currentValue = Math.floor(
          metric.min + (maxValue - metric.min) * metric.current_factor * (Math.random() * 0.5 + 0.75)
        );
        const updatedAt = randomDate(14);

        stmt.run(
          [userId, metric.name, currentValue, maxValue, updatedAt],
          (err) => {
            if (err) {
              console.error(
                `Error seeding progress for user ${userId}, metric ${metric.name}:`,
                err.message
              );
              reject(err);
              return;
            }
            completed++;

            if (completed === total) {
              stmt.finalize();
              console.log(`Seeded ${total} character progress entries successfully`);
              resolve();
            }
          }
        );
      });
    });
  });
}

/**
 * Seed inventory
 */
async function seedInventory(db, userIds) {
  return new Promise((resolve, reject) => {
    console.log('Seeding inventory...');
    const stmt = db.prepare(`
      INSERT INTO inventory (user_id, item_id, quantity, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?)
    `);

    let completed = 0;
    const entries = [];

    // Each user gets 3-7 random items
    userIds.forEach((userId) => {
      const numItems = Math.floor(Math.random() * 5) + 3;
      const userItems = [];

      for (let i = 0; i < numItems; i++) {
        const item = INVENTORY_ITEMS[Math.floor(Math.random() * INVENTORY_ITEMS.length)];
        if (!userItems.includes(item)) {
          userItems.push(item);
          entries.push({
            userId,
            itemId: item,
            quantity: Math.floor(Math.random() * 50) + 1,
            createdAt: randomDate(90),
            updatedAt: randomDate(30),
          });
        }
      }
    });

    entries.forEach((entry) => {
      stmt.run(
        [entry.userId, entry.itemId, entry.quantity, entry.createdAt, entry.updatedAt],
        (err) => {
          if (err) {
            console.error(
              `Error seeding inventory for user ${entry.userId}:`,
              err.message
            );
            reject(err);
            return;
          }
          completed++;

          if (completed === entries.length) {
            stmt.finalize();
            console.log(`Seeded ${entries.length} inventory entries successfully`);
            resolve();
          }
        }
      );
    });
  });
}

/**
 * Seed user achievements (using existing achievement definitions)
 */
async function seedUserAchievements(db, userIds) {
  return new Promise((resolve, reject) => {
    // First get achievement IDs
    db.all('SELECT id FROM achievements LIMIT 10', (err, achievements) => {
      if (err || !achievements || achievements.length === 0) {
        console.log('No achievements found, skipping user achievements seeding');
        resolve();
        return;
      }

      console.log('Seeding user achievements...');
      const stmt = db.prepare(`
        INSERT INTO user_achievements (user_id, achievement_id, unlocked_at, progress_value)
        VALUES (?, ?, ?, ?)
      `);

      let completed = 0;
      const entries = [];

      // Each user unlocks 2-5 random achievements
      userIds.forEach((userId) => {
        const numAchievements = Math.floor(Math.random() * 4) + 2;

        for (let i = 0; i < numAchievements && i < achievements.length; i++) {
          const achievement = achievements[i];
          entries.push({
            userId,
            achievementId: achievement.id,
            unlockedAt: randomDate(60),
            progressValue: Math.floor(Math.random() * 1000) + 100,
          });
        }
      });

      if (entries.length === 0) {
        stmt.finalize();
        console.log('No user achievements to seed');
        resolve();
        return;
      }

      entries.forEach((entry) => {
        stmt.run(
          [entry.userId, entry.achievementId, entry.unlockedAt, entry.progressValue],
          (err) => {
            if (err) {
              console.error(
                `Error seeding user achievement for user ${entry.userId}:`,
                err.message
              );
              reject(err);
              return;
            }
            completed++;

            if (completed === entries.length) {
              stmt.finalize();
              console.log(`Seeded ${entries.length} user achievements successfully`);
              resolve();
            }
          }
        );
      });
    });
  });
}

/**
 * Main seeding function
 */
async function seedDatabase(clearExisting = false) {
  try {
    const db = getDatabase();

    if (clearExisting) {
      await clearData(db);
    }

    // Seed data in order (respecting foreign key constraints)
    const userIds = await seedUsers(db);
    await seedSaves(db, userIds);
    await seedCharacterProgress(db, userIds);
    await seedInventory(db, userIds);
    await seedUserAchievements(db, userIds);

    console.log('\n✅ Database seeding completed successfully!');
    console.log(`   - ${userIds.length} users`);
    console.log(`   - ${userIds.length} game saves`);
    console.log(`   - ${userIds.length * PROGRESS_METRICS.length} progress entries`);
    console.log('   - Multiple inventory items per user');
    console.log('   - User achievements');

    return true;
  } catch (error) {
    console.error('❌ Database seeding failed:', error.message);
    throw error;
  }
}

// Run seeding if executed directly
if (require.main === module) {
  const { initializeDatabase } = require('./database');

  initializeDatabase()
    .then(() => seedDatabase(true)) // Clear existing data
    .then(() => {
      console.log('Seeding complete. You can now start the server.');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Seeding failed:', error);
      process.exit(1);
    });
}

module.exports = { seedDatabase };
