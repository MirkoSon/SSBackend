# Admin API Endpoints

**Category:** Administrative (Restricted)
**Base Path:** `/api/admin`
**Authentication:** Admin session required
**Last Updated:** 2026-01-14

---

## Overview

Admin endpoints provide administrative access to user data, plugin management, and system monitoring. All endpoints require admin authentication via session cookie.

**Authentication Method:** Admin session (not JWT)

---

## Admin Authentication

### POST /api/admin/login

Authenticate as admin and create session.

**Authentication:** None required

**Request Body:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| password | string | Yes | Admin password (env: ADMIN_PASSWORD) |

**Success Response (200):**
```json
{
  "message": "Admin login successful"
}
```

**Note:** Session cookie is set automatically by the server.

**Error Responses:**

| Code | Error | Cause |
|------|-------|-------|
| 401 | "Invalid admin password" | Wrong password |
| 500 | "Session management not available" | Server misconfiguration |

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"password":"admin123"}'
```

---

### POST /api/admin/logout

Clear admin session.

**Authentication:** Admin session

**Success Response (200):**
```json
{
  "message": "Admin logout successful"
}
```

---

### GET /api/admin/status

Check admin authentication status.

**Authentication:** None required

**Success Response (200):**
```json
{
  "authenticated": true
}
```

---

## User Management

### GET /api/admin/api/users

Get all users with metadata.

**Authentication:** Admin session

**Success Response (200):**
```json
{
  "users": [
    {
      "id": 1,
      "username": "player1",
      "created_at": "2026-01-14T10:00:00.000Z",
      "last_login": "2026-01-14T12:00:00.000Z",
      "login_count": 5
    }
  ],
  "count": 1,
  "message": "Users retrieved successfully"
}
```

**Example Request:**
```bash
curl -X GET http://localhost:3000/api/admin/api/users \
  -b cookies.txt
```

---

### GET /api/admin/api/users/:id

Get detailed user information.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | integer | User ID |

**Success Response (200):**
```json
{
  "user": {
    "id": 1,
    "username": "player1",
    "created_at": "2026-01-14T10:00:00.000Z",
    "last_login": "2026-01-14T12:00:00.000Z",
    "login_count": 5
  },
  "message": "User details retrieved successfully"
}
```

---

## Save Data Management

### GET /api/admin/api/saves

Get all save data with previews.

**Authentication:** Admin session

**Success Response (200):**
```json
{
  "saves": [
    {
      "id": "player1_save",
      "username": "Unknown",
      "data_preview": "{\"level\":10,\"coins\":500}...",
      "data_structure": {
        "keys": 5,
        "topLevelKeys": ["level", "coins", "position"]
      },
      "data_size": 250,
      "created_at": "2026-01-14T10:00:00.000Z",
      "updated_at": "2026-01-14T12:00:00.000Z"
    }
  ],
  "count": 1,
  "totalSize": 250,
  "message": "Saves retrieved successfully"
}
```

---

### GET /api/admin/api/saves/:id

Get detailed save data.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Save ID |

**Success Response (200):**
```json
{
  "save": {
    "id": "player1_save",
    "username": "Unknown",
    "save_data": {
      "level": 10,
      "coins": 500,
      "position": {"x": 100, "y": 50}
    },
    "created_at": "2026-01-14T10:00:00.000Z",
    "updated_at": "2026-01-14T12:00:00.000Z"
  },
  "message": "Save details retrieved successfully"
}
```

---

## Inventory Management

### GET /api/admin/api/inventories

Get all user inventories.

**Authentication:** Admin session

**Success Response (200):**
```json
{
  "inventories": [
    {
      "user_id": 1,
      "username": "player1",
      "items": [
        {
          "item_id": "sword",
          "quantity": 1,
          "created_at": "2026-01-14T10:00:00.000Z",
          "updated_at": "2026-01-14T10:00:00.000Z"
        }
      ],
      "total_items": 1,
      "total_quantity": 1
    }
  ],
  "userCount": 1,
  "totalItems": 1,
  "message": "Inventories retrieved successfully"
}
```

---

## Progress & Achievements

### GET /api/admin/api/progress

Get all user progress and achievements.

**Authentication:** Admin session

**Success Response (200):**
```json
{
  "progress": [
    {
      "user_id": 1,
      "username": "player1",
      "level": 10,
      "experience": 2500,
      "play_time": 320,
      "last_active": "2026-01-14T12:00:00.000Z",
      "metrics": {
        "level": {
          "current_value": 10,
          "max_value": 100,
          "updated_at": "2026-01-14T12:00:00.000Z"
        }
      },
      "achievements": [
        {
          "achievement_name": "First Steps",
          "description": "Complete your first save",
          "unlocked_at": "2026-01-14T10:30:00.000Z",
          "progress_value": 1
        }
      ],
      "achievement_count": 1
    }
  ],
  "userCount": 1,
  "totalAchievements": 1,
  "message": "Progress and achievements retrieved successfully"
}
```

---

## Data Export

### GET /api/admin/api/export/:type

Export system data as JSON.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| type | string | Export type: users, saves, inventories, progress, achievements, all |

**Success Response (200):**
```json
{
  "export_timestamp": "2026-01-14T12:30:00.000Z",
  "export_type": "users",
  "record_count": 100,
  "data": [...]
}
```

**Response Headers:**
- `Content-Disposition`: `attachment; filename="users-export-2026-01-14.json"`
- `Content-Type`: `application/json`

**Example Requests:**
```bash
# Export all users
curl -X GET http://localhost:3000/api/admin/api/export/users \
  -b cookies.txt \
  -o users-export.json

# Export complete database
curl -X GET http://localhost:3000/api/admin/api/export/all \
  -b cookies.txt \
  -o complete-export.json
```

---

## Documentation Access

### GET /api/admin/api/docs/:filename

Get documentation file content.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| filename | string | Document path (supports subdirectories) |

**Success Response (200):**
```json
{
  "filename": "api/core-endpoints.md",
  "content": "# Core API Endpoints\n\n..."
}
```

**Security:**
- Prevents path traversal attacks
- Only serves `.md` files
- Restricted to `docs/` directory

**Example Requests:**
```bash
# Get root-level doc
curl -X GET http://localhost:3000/api/admin/api/docs/plugin-development-guide.md \
  -b cookies.txt

# Get subdirectory doc
curl -X GET http://localhost:3000/api/admin/api/docs/api/core-endpoints.md \
  -b cookies.txt
```

---

## Plugin Management

### GET /admin/api/plugins/ui-modules

Get UI metadata for all active plugins.

**Authentication:** Admin session

**Success Response (200):**
```json
{
  "plugins": [
    {
      "name": "economy",
      "adminUI": {
        "enabled": true,
        "navigation": {
          "label": "Economy",
          "icon": "💵",
          "group": "plugins"
        },
        "routes": [
          {
            "path": "/admin/economy",
            "title": "Economy Overview",
            "icon": "📊"
          }
        ]
      }
    }
  ]
}
```

---

### DELETE /admin/api/plugins/:id

Purge plugin from configuration completely.

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Plugin name |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Plugin purged from configuration"
}
```

---

### POST /admin/api/plugins/:id/suppress

Suppress missing plugin (hide but keep config).

**URL Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| id | string | Plugin name |

**Success Response (200):**
```json
{
  "success": true,
  "message": "Plugin suppressed"
}
```

---

## Security Considerations

**Admin Password:**
- Default: `admin123` (change via `ADMIN_PASSWORD` env var)
- **Production:** Use strong password and environment variable

**Session Management:**
- Sessions stored in memory (reset on server restart)
- No session expiration implemented (prototype)
- **Production:** Use persistent session store (Redis)

**Rate Limiting:**
- Not implemented (prototype)
- **Production:** Add rate limiting to prevent brute force

**HTTPS:**
- Not enforced (prototype)
- **Production:** Require HTTPS for all admin endpoints

---

**Related Documentation:**
- [API Overview](overview.md)
- [Core Endpoints](core-endpoints.md)
- [Plugin Development Guide](../plugin-development-guide.md)
