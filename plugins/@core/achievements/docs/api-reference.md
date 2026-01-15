# Achievements Plugin API Endpoints

**Plugin:** Achievements (Optional)
**Base Path:** `/api/achievements`
**Status:** Plugin must be enabled
**Last Updated:** 2026-01-14

---

## Overview

The Achievements plugin provides a comprehensive achievement tracking system with one-shot and incremental achievements, progress monitoring, and seasonal support.

**Features:**
- One-shot achievements (trigger once)
- Incremental achievements (progress-based)
- Progress tracking
- Seasonal achievements
- Auto-checking on progress updates
- Achievement unlocking

---

## Achievement Queries

### GET /api/achievements/available

Get all available achievements.

**Authentication:** Required (Bearer token)

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| season_id | string | null | Filter by season |
| is_active | boolean | true | Only show active achievements |

**Success Response (200):**
```json
{
  "achievements": [
    {
      "id": 1,
      "code": "FIRST_STEPS",
      "name": "First Steps",
      "description": "Complete your first save",
      "type": "one-shot",
      "metric_name": "saves_count",
      "target": 1,
      "is_active": true,
      "season_id": null
    },
    {
      "id": 2,
      "code": "LEVEL_5",
      "name": "Getting Started",
      "description": "Reach level 5",
      "type": "incremental",
      "metric_name": "level",
      "target": 5,
      "is_active": true,
      "season_id": null
    }
  ],
  "count": 2
}
```

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/achievements/available \
  -H "Authorization: Bearer <token>"

# Filter by season
curl -X GET "http://localhost:3000/api/achievements/available?season_id=winter2026" \
  -H "Authorization: Bearer <token>"
```

---

### GET /api/achievements/:userId

Get user's achievements and progress.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| userId | integer | User ID |

**Success Response (200):**
```json
{
  "user_id": 1,
  "achievements": [
    {
      "achievement_id": 1,
      "code": "FIRST_STEPS",
      "name": "First Steps",
      "description": "Complete your first save",
      "type": "one-shot",
      "target": 1,
      "state": "unlocked",
      "progress": 1,
      "unlocked_at": "2026-01-14T10:00:00.000Z"
    },
    {
      "achievement_id": 2,
      "code": "LEVEL_5",
      "name": "Getting Started",
      "description": "Reach level 5",
      "type": "incremental",
      "target": 5,
      "state": "in_progress",
      "progress": 3,
      "unlocked_at": null
    },
    {
      "achievement_id": 3,
      "code": "LEVEL_25",
      "name": "Experienced",
      "description": "Reach level 25",
      "type": "incremental",
      "target": 25,
      "state": "locked",
      "progress": 0,
      "unlocked_at": null
    }
  ],
  "summary": {
    "total_achievements": 5,
    "unlocked_count": 1,
    "in_progress_count": 1,
    "locked_count": 3
  }
}
```

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/achievements/1 \
  -H "Authorization: Bearer <token>"
```

---

### GET /api/achievements/:userId/progress

Get detailed progress for user's achievements.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| userId | integer | User ID |

**Success Response (200):**
```json
{
  "user_id": 1,
  "progress": [
    {
      "achievement_code": "LEVEL_5",
      "progress": 3,
      "target": 5,
      "percentage": 60,
      "state": "in_progress"
    },
    {
      "achievement_code": "COLLECTOR_10",
      "progress": 7,
      "target": 10,
      "percentage": 70,
      "state": "in_progress"
    }
  ]
}
```

---

### GET /api/achievements/stats

Get global achievement statistics.

**Authentication:** Required (Bearer token)

**Success Response (200):**
```json
{
  "total_achievements": 5,
  "total_unlocks": 150,
  "achievement_stats": [
    {
      "achievement_code": "FIRST_STEPS",
      "name": "First Steps",
      "unlock_count": 95,
      "unlock_rate": 0.95,
      "avg_time_to_unlock": "00:05:30"
    },
    {
      "achievement_code": "LEVEL_25",
      "name": "Experienced",
      "unlock_count": 12,
      "unlock_rate": 0.12,
      "avg_time_to_unlock": "05:30:00"
    }
  ],
  "rarest_achievement": {
    "code": "LEVEL_25",
    "name": "Experienced",
    "unlock_rate": 0.12
  }
}
```

---

## Achievement Management

### POST /api/achievements/unlock

Manually unlock an achievement for a user.

**Authentication:** Required (Bearer token)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_id | integer | Yes | User ID |
| achievement_code | string | Yes | Achievement code (e.g., "FIRST_STEPS") |

**Success Response (200):**
```json
{
  "success": true,
  "user_id": 1,
  "achievement_code": "FIRST_STEPS",
  "achievement_name": "First Steps",
  "state": "unlocked",
  "unlocked_at": "2026-01-14T12:30:00.000Z",
  "newly_unlocked": true
}
```

**Error Responses:**

| Code | Error | Cause |
|------|-------|-------|
| 400 | "achievement_code is required" | Missing achievement code |
| 404 | "Achievement not found" | Invalid achievement code |
| 409 | "Achievement already unlocked" | Already unlocked |

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/achievements/unlock \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "user_id": 1,
    "achievement_code": "FIRST_STEPS"
  }'
```

---

### POST /api/achievements/progress

Update progress for an incremental achievement.

**Authentication:** Required (Bearer token)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_id | integer | Yes | User ID |
| metric_name | string | Yes | Progress metric (e.g., "level") |
| current_value | integer | Yes | Current progress value |

**Success Response (200):**
```json
{
  "success": true,
  "user_id": 1,
  "metric_name": "level",
  "current_value": 5,
  "checked_achievements": [
    {
      "achievement_code": "LEVEL_5",
      "state": "unlocked",
      "newly_unlocked": true
    }
  ],
  "message": "Progress updated, 1 achievement(s) unlocked"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/achievements/progress \
  -H "Content-Type": application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "user_id": 1,
    "metric_name": "level",
    "current_value": 5
  }'
```

---

## Admin Endpoints

### POST /admin/api/plugins/achievements/create

Create a new achievement (Admin only).

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| code | string | Yes | Unique achievement code |
| name | string | Yes | Display name |
| description | string | Yes | Description |
| type | string | Yes | "one-shot" or "incremental" |
| metric_name | string | Yes | Progress metric name |
| target | integer | Yes | Target value to unlock |
| is_active | boolean | No | Active status (default: true) |
| season_id | string | No | Season identifier |

**Success Response (201):**
```json
{
  "success": true,
  "achievement": {
    "id": 6,
    "code": "SPEEDRUN_10MIN",
    "name": "Speedrunner",
    "description": "Complete level in under 10 minutes",
    "type": "one-shot",
    "metric_name": "level_complete_time",
    "target": 600,
    "is_active": true
  }
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/admin/api/plugins/achievements/create \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <admin-token>" \
  -d '{
    "code": "SPEEDRUN_10MIN",
    "name": "Speedrunner",
    "description": "Complete level in under 10 minutes",
    "type": "one-shot",
    "metric_name": "level_complete_time",
    "target": 600
  }'
```

---

## Integration Patterns

### Auto-Progress Checking

When using the Progress API (`/api/progress/:userId`), achievements are automatically checked if plugin config has `autoCheck: true`.

```javascript
// Update player progress - achievements auto-checked
await fetch(`/api/progress/${userId}`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({
    metric_name: 'level',
    current_value: 5
  })
});

// Achievement system automatically checks and unlocks "LEVEL_5"
```

### Manual Achievement Checking

```javascript
// Game client checks achievements manually
async function checkAchievements(userId, metricName, value) {
  const response = await fetch('/api/achievements/progress', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      user_id: userId,
      metric_name: metricName,
      current_value: value
    })
  });

  const result = await response.json();

  // Show UI notification for newly unlocked achievements
  result.checked_achievements.forEach(achievement => {
    if (achievement.newly_unlocked) {
      showAchievementUnlockNotification(achievement);
    }
  });
}
```

### Achievement Display

```javascript
// Get and display user achievements
async function displayAchievements(userId) {
  const response = await fetch(`/api/achievements/${userId}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const { achievements, summary } = await response.json();

  console.log(`Unlocked: ${summary.unlocked_count}/${summary.total_achievements}`);

  achievements.forEach(achievement => {
    const icon = achievement.state === 'unlocked' ? '🏆' : '🔒';
    const progress = `${achievement.progress}/${achievement.target}`;
    console.log(`${icon} ${achievement.name} - ${progress}`);
  });
}
```

---

**Related Documentation:**
- [API Overview](overview.md)
- [Core Endpoints](core-endpoints.md)
- [Economy Endpoints](economy-endpoints.md)
- [Leaderboards Endpoints](leaderboards-endpoints.md)
