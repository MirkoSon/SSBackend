# API Overview

**Version:** 1.0.0
**Base URL:** `http://localhost:3000`
**Last Updated:** 2026-01-14

---

## Introduction

The SSBackend API provides a comprehensive REST API for game backend services, including user authentication, save/load functionality, inventory management, and optional plugin features (economy, achievements, leaderboards).

The API is designed for:
- **Game Clients:** Unity, Unreal Engine, Godot, web games
- **Frontend Applications:** React, Vue, Angular dashboards
- **Integration Partners:** Third-party services and tools

---

## Architecture

SSBackend follows a modular architecture:

- **Core API:** Always-available endpoints (auth, save, inventory, progress)
- **Plugin API:** Optional endpoints that can be enabled/disabled (economy, achievements, leaderboards)
- **Admin API:** Administrative endpoints for dashboard and plugin management

---

| Category | Base Path | Description |
|----------|-----------|-------------|
| Authentication | `/auth` | User registration, login, session management |
| Save/Load | `/save` | Game state persistence |
| Inventory | `/inventory` | Item management |
| Progress | `/progress` | Progress tracking and metrics |
| Economy | `/api/economy` | Virtual currency (plugin) |
| Achievements | `/api/achievements` | Achievement system (plugin) |
| Leaderboards | `/api/leaderboards` | Competitive rankings (plugin) |
| Admin | `/admin/api` | Administrative operations |

---

## Multi-Project Support (Beta)

SSBackend supports multiple isolated projects on a single server instance. Each project has its own:
- **Database:** Isolated SQLite database file
- **Configuration:** Project-specific settings and plugin states
- **Plugins:** Independent plugin manager instance

### Scoped Request Paths

To access project-specific endpoints, use the `/project/:projectId` prefix before the base path:

| Original Path | Scoped Path (Project-Specific) |
|---------------|----------------------------------|
| `/save` | `/project/:projectId/save` |
| `/auth` | `/project/:projectId/auth` |
| `/inventory` | `/project/:projectId/inventory` |
| `/admin/api` | `/project/:projectId/admin/api` |
| `/api/:plugin` | `/project/:projectId/api/:plugin` |

**Note:** Requests without the `/project/:projectId` prefix are automatically routed to the **default project** (usually `default`).

---

## Authentication

### Authentication Types

SSBackend supports two authentication mechanisms:

#### 1. JWT Token Authentication (User API)
Used for player-facing endpoints.

**How to authenticate:**
1. Register or login via `/api/auth/register` or `/api/auth/login`
2. Receive JWT token in response: `{ "token": "eyJhbGc..." }`
3. Include token in subsequent requests: `Authorization: Bearer <token>`

**Example:**
```bash
# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"player1","password":"secret123"}'

# Response
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "player1"
  }
}

# Use token in requests
curl -X GET http://localhost:3000/api/inventory/1 \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

#### 2. Admin Session Authentication (Admin API)
Used for administrative endpoints.

**How to authenticate:**
1. Login via `/admin/login` with admin password
2. Session cookie is set automatically
3. All `/api/admin/*` endpoints use session authentication

**Example:**
```bash
# Admin login (sets session cookie)
curl -X POST http://localhost:3000/api/admin/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"password":"admin123"}'

# Use session cookie in admin requests
curl -X GET http://localhost:3000/api/admin/api/users \
  -b cookies.txt
```

---

## Request Format

### Headers

| Header | Value | Required | Description |
|--------|-------|----------|-------------|
| `Content-Type` | `application/json` | Yes (for POST/PUT) | JSON request body |
| `Authorization` | `Bearer <token>` | Yes (for auth endpoints) | JWT token |

### Request Body

All POST/PUT requests expect JSON body:

```json
{
  "field1": "value",
  "field2": 123
}
```

---

## Response Format

### Success Response

**Status Code:** `200` (OK), `201` (Created)

```json
{
  "success": true,
  "data": {
    // Response data
  },
  "message": "Operation successful"
}
```

### Error Response

**Status Codes:** `400`, `401`, `403`, `404`, `409`, `500`

```json
{
  "error": "Error message",
  "details": [] // Optional additional error details
}
```

---

## HTTP Status Codes

| Code | Meaning | Usage |
|------|---------|-------|
| 200 | OK | Successful GET/PUT/DELETE request |
| 201 | Created | Successful POST request (resource created) |
| 400 | Bad Request | Invalid request parameters or body |
| 401 | Unauthorized | Authentication required or invalid token |
| 403 | Forbidden | Insufficient permissions |
| 404 | Not Found | Resource not found |
| 409 | Conflict | Resource conflict (e.g., duplicate username) |
| 500 | Internal Server Error | Server-side error |

---

## Rate Limiting

⚠️ **Current:** No rate limiting (prototype system)

**Production Recommendation:** Implement rate limiting with:
- **User API:** 100 requests/minute per user
- **Admin API:** 1000 requests/minute
- Use `express-rate-limit` middleware

---

## CORS Configuration

⚠️ **Current:** CORS not enabled by default

**To enable CORS:**
```javascript
// Add to src/index.js
const cors = require('cors');
app.use(cors({
  origin: 'http://your-frontend-domain.com',
  credentials: true
}));
```

---

## Pagination

Endpoints that return lists support pagination query parameters:

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `page` | integer | 1 | Page number (1-indexed) |
| `limit` | integer | 50 | Items per page |
| `sort` | string | - | Sort field (e.g., `created_at`) |
| `order` | string | `asc` | Sort order (`asc` or `desc`) |

**Example:**
```bash
GET /api/leaderboards/1/rankings?page=2&limit=20&order=desc
```

**Response:**
```json
{
  "data": [...],
  "pagination": {
    "page": 2,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  }
}
```

---

## Filtering

Some endpoints support filtering via query parameters:

```bash
# Filter achievements by season
GET /api/achievements/available?season_id=winter2026

# Filter transactions by type
GET /api/economy/transactions/1?type=purchase
```

---

## Timestamps

All timestamps in API responses use **ISO 8601 format**:

```json
{
  "created_at": "2026-01-14T10:30:00.000Z",
  "updated_at": "2026-01-14T12:45:30.500Z"
}
```

---

## Error Handling

### Common Error Scenarios

**Missing Required Field:**
```json
{
  "error": "Username is required and must be a string"
}
```

**Invalid Token:**
```json
{
  "error": "Invalid or expired token"
}
```

**Resource Not Found:**
```json
{
  "error": "Save not found"
}
```

**Duplicate Resource:**
```json
{
  "error": "Username already exists"
}
```

### Error Details

Some endpoints return additional error details:

```json
{
  "error": "Password does not meet requirements",
  "details": [
    "Password must be at least 8 characters",
    "Password must contain at least one uppercase letter"
  ]
}
```

---

## Versioning

**Current:** No API versioning (v1 implicit)

**Future:** API versioning will be introduced via path prefix:
- `http://localhost:3000/v1/api/auth/login`
- `http://localhost:3000/v2/api/auth/login`

---

## Security Considerations

⚠️ **Prototype-Level Security:**
- **Passwords:** Stored with bcrypt hashing
- **Tokens:** In-memory signing key (resets on restart)
- **HTTPS:** Not enforced (use HTTPS in production)
- **Rate Limiting:** Not implemented
- **Input Validation:** Basic validation only

**Production Recommendations:**
1. Use persistent token signing key (environment variable)
2. Enable HTTPS/TLS
3. Implement rate limiting
4. Add input sanitization
5. Enable CORS with whitelist
6. Use prepared statements (already done)
7. Add logging and monitoring

---

## Testing the API

### Using cURL

```bash
# Register user
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test1234!"}'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"testuser","password":"Test1234!"}'

# Save game data (with token)
curl -X POST http://localhost:3000/api/save \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <your-token>" \
  -d '{"id":"save1","data":{"level":10,"coins":500}}'
```

### Using Postman

1. Import the API collection (if available)
2. Set base URL: `http://localhost:3000`
3. Configure auth token in collection variables
4. Test endpoints with pre-configured requests

### Using JavaScript (Fetch API)

```javascript
// Login
const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ username: 'player1', password: 'secret123' })
});

const { token } = await loginResponse.json();

// Use token for authenticated requests
const saveResponse = await fetch('http://localhost:3000/api/save', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ id: 'save1', data: { level: 10 } })
});
```

---

## Plugin System

SSBackend uses a plugin system for optional features. Plugins can be:
- **Enabled/Disabled:** Via admin dashboard or CLI
- **Independent:** Each plugin has its own routes, schemas, and migrations
- **Dynamic:** Routes are registered when plugin is activated

### Available Plugins

| Plugin | Base Path | Description |
|--------|-----------|-------------|
| Economy | `/api/economy` | Virtual currency system |
| Achievements | `/api/achievements` | Achievement tracking |
| Leaderboards | `/api/leaderboards` | Competitive rankings |

### Checking Plugin Status

```bash
GET /api/admin/api/plugins
```

**Response:**
```json
{
  "plugins": [
    {
      "name": "economy",
      "enabled": true,
      "version": "1.0.0"
    },
    {
      "name": "achievements",
      "enabled": true,
      "version": "1.0.0"
    }
  ]
}
```

---

## API Documentation Index

- [Core Endpoints](core-endpoints.md) - Auth, Save/Load, Inventory, Progress
- [Economy Endpoints](economy-endpoints.md) - Currency, Transactions, Balances
- [Achievements Endpoints](achievements-endpoints.md) - Achievement tracking
- [Leaderboards Endpoints](leaderboards-endpoints.md) - Rankings and scores
- [Admin Endpoints](admin-endpoints.md) - Administrative operations

---

## Support & Resources

- **Plugin Development Guide:** [docs/plugin-development-guide.md](../plugin-development-guide.md)
- **Architecture Documentation:** [docs/architecture/overview.md](../architecture/overview.md)
- **Migration System:** [docs/migration-notes.md](../migration-notes.md)
- **GitHub Issues:** Report bugs and request features

---

**Next:** [Core Endpoints Documentation](core-endpoints.md)
