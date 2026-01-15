# Core API Endpoints

**Category:** Core System (Always Available)
**Base Path:** `/api`
**Last Updated:** 2026-01-14

---

## Authentication Endpoints

Base Path: `/api/auth`

### POST /api/auth/register

Register a new user account.

**Authentication:** None required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | Username (min 3 characters) |
| password | string | Yes | Password (see requirements below) |

**Password Requirements:**
- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- At least one special character

**Success Response (201):**
```json
{
  "id": 1,
  "username": "player1",
  "message": "User created successfully"
}
```

**Error Responses:**

| Code | Error | Cause |
|------|-------|-------|
| 400 | "Username is required and must be a string" | Missing or invalid username |
| 400 | "Password does not meet requirements" | Weak password |
| 409 | "Username already exists" | Duplicate username |
| 500 | "Failed to create user" | Database error |

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "password": "Secret123!"
  }'
```

---

### POST /api/auth/login

Authenticate a user and receive JWT token.

**Authentication:** None required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| username | string | Yes | User's username |
| password | string | Yes | User's password |

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MSwidXNlcm5hbWUiOiJwbGF5ZXIxIiwiaWF0IjoxNzA2OTc2MDAwfQ.signature",
  "user": {
    "id": 1,
    "username": "player1"
  }
}
```

**Error Responses:**

| Code | Error | Cause |
|------|-------|-------|
| 400 | "Username and password are required" | Missing credentials |
| 401 | "Invalid username or password" | Incorrect credentials |
| 500 | "Internal server error" | Database error |

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "player1",
    "password": "Secret123!"
  }'
```

**Usage:**
```javascript
// JavaScript example
const response = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    username: 'player1',
    password: 'Secret123!'
  })
});

const { token, user } = await response.json();
// Store token for subsequent requests
localStorage.setItem('authToken', token);
```

---

### POST /api/auth/logout

Invalidate the current JWT token.

**Authentication:** Required (Bearer token)

**Headers:**

| Header | Value | Required |
|--------|-------|----------|
| Authorization | Bearer <token> | Yes |

**Success Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/auth/logout \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### POST /api/auth/refresh

Refresh an existing JWT token.

**Authentication:** Required (Bearer token)

**Headers:**

| Header | Value | Required |
|--------|-------|----------|
| Authorization | Bearer <token> | Yes |

**Success Response (200):**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Token refreshed successfully"
}
```

---

## Save/Load Endpoints

Base Path: `/api/save`

### POST /api/save

Save game data for a player.

**Authentication:** None required (open endpoint for prototyping)

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| id | string | Yes | Save identifier (e.g., user ID or save slot) |
| data | object | Yes | JSON object containing game state |

**Success Response (200):**
```json
{
  "success": true,
  "id": "player1_save",
  "message": "Data saved successfully"
}
```

**Error Responses:**

| Code | Error | Cause |
|------|-------|-------|
| 400 | "Invalid or missing id" | Missing or non-string id |
| 400 | "Invalid or missing data" | Missing or non-object data |
| 500 | "Failed to save data" | Database error |

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/save \
  -H "Content-Type: application/json" \
  -d '{
    "id": "player1_save",
    "data": {
      "level": 10,
      "experience": 2500,
      "position": {"x": 100, "y": 50, "z": 0},
      "inventory": ["sword", "shield", "potion"],
      "quests": {
        "main_quest": "complete",
        "side_quest_1": "in_progress"
      }
    }
  }'
```

**Game Integration Example:**
```javascript
// Unity/JavaScript game save
async function saveGame(playerId, gameState) {
  const response = await fetch('http://localhost:3000/api/save', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      id: playerId,
      data: gameState
    })
  });

  if (response.ok) {
    console.log('Game saved successfully');
  }
}

// Usage
await saveGame('player1_save', {
  level: 10,
  coins: 500,
  position: { x: 100, y: 50 }
});
```

---

### GET /api/save/:id

Load game data by save ID.

**Authentication:** None required

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Save identifier |

**Success Response (200):**
```json
{
  "id": "player1_save",
  "data": {
    "level": 10,
    "experience": 2500,
    "position": {"x": 100, "y": 50, "z": 0}
  },
  "created_at": "2026-01-14T10:00:00.000Z",
  "updated_at": "2026-01-14T12:30:00.000Z"
}
```

**Error Responses:**

| Code | Error | Cause |
|------|-------|-------|
| 400 | "Invalid id parameter" | Missing or invalid ID |
| 404 | "Save not found" | Save doesn't exist |
| 500 | "Data corruption detected" | Invalid JSON in database |

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/save/player1_save
```

**Game Integration Example:**
```javascript
// Load game state
async function loadGame(playerId) {
  const response = await fetch(`http://localhost:3000/api/save/${playerId}`);

  if (response.status === 404) {
    console.log('No save found, starting new game');
    return null;
  }

  const { data } = await response.json();
  return data;
}

// Usage
const gameState = await loadGame('player1_save');
if (gameState) {
  // Restore game state
  player.level = gameState.level;
  player.position = gameState.position;
}
```

---

## Inventory Endpoints

Base Path: `/api/inventory`

### GET /api/inventory/:userId

Get all inventory items for a user.

**Authentication:** Required (Bearer token)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| userId | integer | User ID |

**Headers:**

| Header | Value | Required |
|--------|-------|----------|
| Authorization | Bearer <token> | Yes |

**Success Response (200):**
```json
{
  "user_id": 1,
  "items": [
    {
      "item_id": "sword",
      "quantity": 1,
      "created_at": "2026-01-14T10:00:00.000Z",
      "updated_at": "2026-01-14T10:00:00.000Z"
    },
    {
      "item_id": "potion",
      "quantity": 5,
      "created_at": "2026-01-14T10:00:00.000Z",
      "updated_at": "2026-01-14T12:00:00.000Z"
    }
  ]
}
```

**Error Responses:**

| Code | Error | Cause |
|------|-------|-------|
| 400 | "Invalid user ID" | Non-numeric user ID |
| 401 | "Invalid or expired token" | Missing or invalid auth token |
| 404 | "No inventory found for user" | User has no items |
| 500 | "Failed to fetch inventory" | Database error |

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/inventory/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### POST /api/inventory/:userId

Add or update items in user's inventory.

**Authentication:** Required (Bearer token)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| userId | integer | User ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| item_id | string | Yes | Item identifier |
| quantity | integer | Yes | Quantity to add (positive) or remove (negative) |

**Success Response (200):**
```json
{
  "success": true,
  "user_id": 1,
  "item_id": "sword",
  "new_quantity": 2,
  "message": "Inventory updated successfully"
}
```

**Error Responses:**

| Code | Error | Cause |
|------|-------|-------|
| 400 | "item_id and quantity are required" | Missing fields |
| 400 | "quantity must be a number" | Invalid quantity type |
| 401 | "Invalid or expired token" | Missing or invalid auth token |
| 409 | "Insufficient quantity" | Trying to remove more than available |
| 500 | "Failed to update inventory" | Database error |

**Example Request:**
```bash
# Add 3 potions
curl -X POST http://localhost:3000/api/inventory/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "item_id": "potion",
    "quantity": 3
  }'

# Remove 1 sword
curl -X POST http://localhost:3000/api/inventory/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "item_id": "sword",
    "quantity": -1
  }'
```

---

## Progress Endpoints

Base Path: `/api/progress`

### GET /api/progress/:userId

Get progress metrics for a user.

**Authentication:** Required (Bearer token)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| userId | integer | User ID |

**Success Response (200):**
```json
{
  "user_id": 1,
  "metrics": [
    {
      "metric_name": "level",
      "current_value": 10,
      "max_value": 100,
      "updated_at": "2026-01-14T12:00:00.000Z"
    },
    {
      "metric_name": "experience",
      "current_value": 2500,
      "max_value": 5000,
      "updated_at": "2026-01-14T12:00:00.000Z"
    }
  ]
}
```

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/progress/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

---

### POST /api/progress/:userId

Update progress metrics for a user.

**Authentication:** Required (Bearer token)

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| userId | integer | User ID |

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| metric_name | string | Yes | Progress metric name |
| current_value | integer | Yes | Current value |
| max_value | integer | No | Maximum value (optional) |

**Success Response (200):**
```json
{
  "success": true,
  "user_id": 1,
  "metric_name": "level",
  "current_value": 11,
  "max_value": 100,
  "message": "Progress updated successfully"
}
```

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/progress/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
  -d '{
    "metric_name": "level",
    "current_value": 11,
    "max_value": 100
  }'
```

---

## Common Patterns

### Error Handling

All endpoints return consistent error format:

```json
{
  "error": "Error message describing what went wrong"
}
```

With optional details array for validation errors:

```json
{
  "error": "Password does not meet requirements",
  "details": [
    "Password must be at least 8 characters",
    "Password must contain at least one uppercase letter"
  ]
}
```

### Authentication Flow

1. **Register:** `POST /api/auth/register` → Receive user ID
2. **Login:** `POST /api/auth/login` → Receive JWT token
3. **Store Token:** Save token in localStorage or secure storage
4. **Use Token:** Include in `Authorization: Bearer <token>` header
5. **Refresh Token:** `POST /api/auth/refresh` when token expires
6. **Logout:** `POST /api/auth/logout` to invalidate token

### Save/Load Pattern

```javascript
// Game client integration pattern
class GameAPI {
  constructor(baseURL) {
    this.baseURL = baseURL;
    this.token = null;
  }

  async login(username, password) {
    const response = await fetch(`${this.baseURL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });
    const { token } = await response.json();
    this.token = token;
    return token;
  }

  async saveGame(saveId, gameData) {
    await fetch(`${this.baseURL}/api/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: saveId, data: gameData })
    });
  }

  async loadGame(saveId) {
    const response = await fetch(`${this.baseURL}/api/save/${saveId}`);
    if (response.status === 404) return null;
    const { data } = await response.json();
    return data;
  }

  async getInventory(userId) {
    const response = await fetch(`${this.baseURL}/api/inventory/${userId}`, {
      headers: { 'Authorization': `Bearer ${this.token}` }
    });
    return await response.json();
  }
}

// Usage
const api = new GameAPI('http://localhost:3000');
await api.login('player1', 'Secret123!');
await api.saveGame('player1_save', { level: 10, coins: 500 });
const inventory = await api.getInventory(1);
```

---

**Related Documentation:**
- [API Overview](overview.md)
- [Economy Endpoints](economy-endpoints.md)
- [Achievements Endpoints](achievements-endpoints.md)
- [Leaderboards Endpoints](leaderboards-endpoints.md)
- [Admin Endpoints](admin-endpoints.md)
