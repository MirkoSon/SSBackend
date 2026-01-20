# Database Seeding Guide

This guide explains how to seed the SSBackend database with sample data for development and testing.

## Quick Start

To seed the database with sample data, run:

```bash
npm run seed
```

This will:
1. Clear all existing data (users, saves, progress, inventory, achievements)
2. Generate realistic sample data for all features
3. Populate the database with test data

## What Gets Seeded

### 1. Users (10 sample users)
- Usernames: alex_rivera, sarah_connor, mike_jordan, emma_lee, john_smith, etc.
- Random creation dates (within last 90 days)
- Random last login times (within last 7 days)
- Random login counts (10-160)

### 2. Game Saves (1 per user)
- Unique save IDs
- JSON save data including:
  - Player level (1-50)
  - Position coordinates
  - Inventory (gold, gems, items)
  - Active checkpoint
  - Quest progress
- Realistic creation and update timestamps

### 3. Character Progress (5 metrics per user)
- **level**: 1-100, ~30% progress
- **experience**: 0-100,000, ~50% progress
- **play_time_minutes**: 0-10,000, ~40% progress
- **skill_points**: 0-500, ~20% progress
- **boss_kills**: 0-50, ~60% progress

### 4. Inventory (3-7 items per user)
- Random items from pool:
  - premium_gem_01
  - mega_potion_hp
  - iron_sword_v2
  - legendary_armor
  - speed_boost
  - health_elixir
  - mana_crystal
  - gold_coin_bundle
  - rare_artifact
  - epic_weapon
- Random quantities (1-50)

### 5. User Achievements (2-5 per user)
- Links to existing achievement definitions
- Random unlock timestamps
- Progress values

## Sample Data Statistics

After seeding, your database will contain:
- **10 users** with varied activity patterns
- **10 game saves** with realistic JSON data
- **50 character progress entries** (10 users × 5 metrics)
- **~50 inventory entries** (varies per user)
- **~30 user achievements** (varies per user)

## Programmatic Usage

You can also use the seeder programmatically in your code:

```javascript
const { seedDatabase } = require('./src/db/seedDatabase');
const { initializeDatabase } = require('./src/db/database');

async function setupTestDatabase() {
  await initializeDatabase();
  await seedDatabase(true); // true = clear existing data
  console.log('Test database ready!');
}
```

## Dashboard Visualization

After seeding, you can test all dashboard pages:

### Dashboard Overview
- Shows aggregate stats (12,842 users from static mockup data)
- Activity feed with recent events

### Users Page (`/users`)
- Lists all 10 seeded users
- Search by username or ID
- View login history and counts

### Game Saves Page (`/saves`)
- Shows all game saves with JSON previews
- Click to view full save data
- Export functionality

### Character Progress Page (`/progress`)
- Filter by metric type (Level, Experience, etc.)
- Visual progress bars
- Real-time update timestamps

## Development Tips

### Re-seeding
To clear and re-seed the database at any time:
```bash
npm run seed
```

### Partial Seeding
If you want to keep some data, modify the seeder:
```javascript
// In seedDatabase.js
await seedDatabase(false); // false = don't clear existing data
```

### Custom Data
Edit `src/db/seedDatabase.js` to customize:
- Number of users
- User names
- Item types
- Progress metrics
- Value ranges

## Troubleshooting

### Error: "Database not initialized"
Make sure the database is initialized first:
```bash
# Start the server once to initialize
npm start
# Then stop it (Ctrl+C) and run seeder
npm run seed
```

### Foreign Key Errors
The seeder respects foreign key constraints and seeds data in order:
1. Users (no dependencies)
2. Saves (depends on users)
3. Progress (depends on users)
4. Inventory (depends on users)
5. User Achievements (depends on users and achievements)

### No Achievements
If you see "No achievements found", make sure your migrations have run:
1. Delete `game.db`
2. Run `npm start` to initialize
3. Run `npm run seed` to populate

## Next Steps

After seeding:
1. Start the backend: `npm start`
2. Start the dashboard: `cd admin-dashboard && npm run dev`
3. Open http://localhost:5173
4. Select "default" project
5. Browse through all pages to see your seeded data!
