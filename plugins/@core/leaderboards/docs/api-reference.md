# Leaderboards Plugin API Endpoints

**Plugin:** Leaderboards (Optional)
**Base Path:** `/api/leaderboards`
**Status:** Plugin must be enabled
**Last Updated:** 2026-01-14

---

## Overview

The Leaderboards plugin provides competitive ranking functionality with multiple board types, score submission, and flexible ranking queries.

**Features:**
- Multiple leaderboard types (daily, weekly, all-time)
- Score submission with metadata
- Rank queries (global, user-specific, surrounding ranks)
- Tie handling
- Automatic reset schedules
- Board management

---

## Leaderboard Management

### GET /api/leaderboards

List all available leaderboards.

**Authentication:** Required (Bearer token)

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| type | string | all | Filter by type (daily/weekly/all_time) |
| is_active | boolean | true | Only show active boards |

**Success Response (200):**
```json
{
  "leaderboards": [
    {
      "id": 1,
      "name": "Global High Scores",
      "description": "All-time highest scores",
      "type": "all_time",
      "game_mode": "classic",
      "sort_order": "DESC",
      "is_active": true,
      "created_at": "2026-01-14T10:00:00.000Z"
    },
    {
      "id": 2,
      "name": "Daily Challenge",
      "description": "Today's top players",
      "type": "daily",
      "game_mode": "challenge",
      "sort_order": "DESC",
      "reset_schedule": "daily",
      "next_reset": "2026-01-15T00:00:00.000Z",
      "is_active": true
    }
  ],
  "count": 2
}
```

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/leaderboards \
  -H "Authorization: Bearer <token>"

# Filter by type
curl -X GET "http://localhost:3000/api/leaderboards?type=daily" \
  -H "Authorization: Bearer <token>"
```

---

### GET /api/leaderboards/:boardId

Get leaderboard details and top rankings.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| boardId | integer | Leaderboard ID |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| limit | integer | 50 | Number of entries to return |

**Success Response (200):**
```json
{
  "leaderboard": {
    "id": 1,
    "name": "Global High Scores",
    "description": "All-time highest scores",
    "type": "all_time",
    "game_mode": "classic",
    "entry_count": 500
  },
  "rankings": [
    {
      "rank": 1,
      "user_id": 42,
      "username": "ProPlayer123",
      "score": 1000000,
      "submitted_at": "2026-01-14T10:00:00.000Z"
    },
    {
      "rank": 2,
      "user_id": 7,
      "username": "GamerGirl",
      "score": 950000,
      "submitted_at": "2026-01-14T09:30:00.000Z"
    }
  ]
}
```

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/leaderboards/1 \
  -H "Authorization: Bearer <token>"

# Get top 10 only
curl -X GET "http://localhost:3000/api/leaderboards/1?limit=10" \
  -H "Authorization: Bearer <token>"
```

---

### POST /api/leaderboards

Create a new leaderboard (Admin only).

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| name | string | Yes | Leaderboard name |
| description | string | No | Description |
| type | string | Yes | "daily", "weekly", "all_time", "custom" |
| game_mode | string | No | Game mode identifier |
| sort_order | string | No | "DESC" (default) or "ASC" |
| max_entries | integer | No | Max entries to store (default: 10000) |
| reset_schedule | string | No | "daily", "weekly", "monthly", null |

**Success Response (201):**
```json
{
  "success": true,
  "leaderboard": {
    "id": 3,
    "name": "Weekly Challenge",
    "type": "weekly",
    "reset_schedule": "weekly",
    "next_reset": "2026-01-21T00:00:00.000Z"
  }
}
```

---

### DELETE /api/leaderboards/:boardId

Delete a leaderboard (Admin only).

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| boardId | integer | Leaderboard ID |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Leaderboard deleted successfully"
}
```

---

## Score Submission

### POST /api/leaderboards/:boardId/submit

Submit a score to a leaderboard.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| boardId | integer | Leaderboard ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| user_id | integer | Yes | User ID submitting score |
| score | number | Yes | Score value |
| metadata | object | No | Additional score data |

**Success Response (200):**
```json
{
  "success": true,
  "leaderboard_id": 1,
  "user_id": 1,
  "score": 75000,
  "rank": 15,
  "previous_rank": 20,
  "rank_improved": true,
  "submitted_at": "2026-01-14T12:30:00.000Z"
}
```

**Error Responses:**

| Code | Error | Cause |
|------|-------|-------|
| 400 | "user_id and score are required" | Missing required fields |
| 400 | "score must be a number" | Invalid score type |
| 404 | "Leaderboard not found" | Invalid board ID |
| 409 | "Leaderboard is inactive" | Board disabled |

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/leaderboards/1/submit \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{
    "user_id": 1,
    "score": 75000,
    "metadata": {
      "level": 10,
      "time_played": 320,
      "difficulty": "hard"
    }
  }'
```

---

## Ranking Queries

### GET /api/leaderboards/:boardId/rankings

Get paginated rankings for a leaderboard.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| boardId | integer | Leaderboard ID |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| page | integer | 1 | Page number (1-indexed) |
| limit | integer | 50 | Entries per page |

**Success Response (200):**
```json
{
  "leaderboard_id": 1,
  "rankings": [
    {
      "rank": 1,
      "user_id": 42,
      "username": "ProPlayer123",
      "score": 1000000,
      "submitted_at": "2026-01-14T10:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 50,
    "total_entries": 500,
    "total_pages": 10
  }
}
```

**Example Request:**
```bash
# Get page 2
curl -X GET "http://localhost:3000/api/leaderboards/1/rankings?page=2&limit=20" \
  -H "Authorization: Bearer <token>"
```

---

### GET /api/leaderboards/:boardId/user/:userId/rank

Get specific user's rank and score.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| boardId | integer | Leaderboard ID |
| userId | integer | User ID |

**Success Response (200):**
```json
{
  "leaderboard_id": 1,
  "user_id": 1,
  "username": "player1",
  "rank": 15,
  "score": 75000,
  "total_entries": 500,
  "percentile": 97.0,
  "submitted_at": "2026-01-14T12:00:00.000Z"
}
```

**Error Responses:**

| Code | Error | Cause |
|------|-------|-------|
| 404 | "User not found on leaderboard" | User hasn't submitted score |

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/leaderboards/1/user/1/rank \
  -H "Authorization: Bearer <token>"
```

---

### GET /api/leaderboards/:boardId/user/:userId/surrounding

Get rankings around a specific user.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| boardId | integer | Leaderboard ID |
| userId | integer | User ID |

**Query Parameters:**

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| range | integer | 5 | Number of entries above and below user |

**Success Response (200):**
```json
{
  "leaderboard_id": 1,
  "center_user_id": 1,
  "center_rank": 15,
  "rankings": [
    {
      "rank": 13,
      "user_id": 99,
      "username": "player99",
      "score": 77000
    },
    {
      "rank": 14,
      "user_id": 88,
      "username": "player88",
      "score": 76000
    },
    {
      "rank": 15,
      "user_id": 1,
      "username": "player1",
      "score": 75000,
      "is_current_user": true
    },
    {
      "rank": 16,
      "user_id": 77,
      "username": "player77",
      "score": 74000
    },
    {
      "rank": 17,
      "user_id": 66,
      "username": "player66",
      "score": 73000
    }
  ]
}
```

**Example Request:**
```bash
# Get 5 players above and below
curl -X GET "http://localhost:3000/api/leaderboards/1/user/1/surrounding?range=5" \
  -H "Authorization: Bearer <token>"
```

---

### GET /api/leaderboards/stats

Get global leaderboard statistics.

**Authentication:** Required (Bearer token)

**Success Response (200):**
```json
{
  "total_leaderboards": 5,
  "total_submissions": 50000,
  "active_leaderboards": 4,
  "most_competitive": {
    "leaderboard_id": 1,
    "name": "Global High Scores",
    "entry_count": 10000,
    "avg_score": 50000
  }
}
```

---

## Board Maintenance

### POST /api/leaderboards/:boardId/reset

Reset a leaderboard (Admin only).

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| boardId | integer | Leaderboard ID |

**Success Response (200):**
```json
{
  "success": true,
  "leaderboard_id": 2,
  "entries_cleared": 500,
  "message": "Leaderboard reset successfully"
}
```

---

## Integration Patterns

### Submit Score After Match
```javascript
async function submitMatchScore(userId, score, matchData) {
  const response = await fetch('/api/leaderboards/1/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      user_id: userId,
      score: score,
      metadata: {
        level: matchData.level,
        time_played: matchData.duration,
        kills: matchData.kills,
        deaths: matchData.deaths
      }
    })
  });

  const result = await response.json();

  // Show rank improvement notification
  if (result.rank_improved) {
    showNotification(`New rank: #${result.rank}! (was #${result.previous_rank})`);
  }

  return result;
}
```

### Display Leaderboard UI
```javascript
async function displayLeaderboard(boardId) {
  // Get top 10 players
  const response = await fetch(`/api/leaderboards/${boardId}?limit=10`, {
    headers: { 'Authorization': `Bearer ${token}` }
  });

  const { leaderboard, rankings } = await response.json();

  console.log(`=== ${leaderboard.name} ===`);
  rankings.forEach((entry, index) => {
    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '  ';
    console.log(`${medal} #${entry.rank} - ${entry.username}: ${entry.score.toLocaleString()}`);
  });
}
```

### Show Player Rank with Surrounding Players
```javascript
async function showPlayerRank(boardId, userId) {
  // Get player's rank
  const rankResponse = await fetch(
    `/api/leaderboards/${boardId}/user/${userId}/rank`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  if (rankResponse.status === 404) {
    console.log('You haven\'t submitted a score yet!');
    return;
  }

  const { rank, score, percentile } = await rankResponse.json();
  console.log(`Your Rank: #${rank}`);
  console.log(`Your Score: ${score.toLocaleString()}`);
  console.log(`Top ${percentile.toFixed(1)}% of players`);

  // Get surrounding players
  const surroundResponse = await fetch(
    `/api/leaderboards/${boardId}/user/${userId}/surrounding?range=3`,
    { headers: { 'Authorization': `Bearer ${token}` } }
  );

  const { rankings } = await surroundResponse.json();

  console.log('\n--- Players Near You ---');
  rankings.forEach(entry => {
    const marker = entry.is_current_user ? '➜' : ' ';
    console.log(`${marker} #${entry.rank} - ${entry.username}: ${entry.score.toLocaleString()}`);
  });
}
```

---

**Related Documentation:**
- [API Overview](overview.md)
- [Core Endpoints](core-endpoints.md)
- [Economy Endpoints](economy-endpoints.md)
- [Achievements Endpoints](achievements-endpoints.md)
