# Running the React Admin Dashboard

## Setup Instructions

### 1. Start the Backend Server (Port 3000)

In one terminal:
```bash
cd e:\GIT\SSBackend
npm start
```

This starts the Node.js backend with all the admin API endpoints.

### 2. Start the React Dev Server (Port 5173)

In another terminal:
```bash
cd e:\GIT\SSBackend\admin-dashboard
npm run dev
```

This starts the Vite dev server with proxy to backend.

### 3. Open Browser

Navigate to: `http://localhost:5173/`

---

## How It Works

**Vite Proxy Configuration:**
- Requests to `/admin/*` → proxied to `http://localhost:3000/admin/*`
- Requests to `/project/*` → proxied to `http://localhost:3000/project/*`

**Example:**
```
Browser: http://localhost:5173/users
  ↓ (React Router)
Users Page loads
  ↓ (API call)
fetch('/admin/api/users')
  ↓ (Vite proxy)
http://localhost:3000/admin/api/users
  ↓ (Backend)
Returns JSON data
```

---

## Troubleshooting

### "Unexpected token '<'" Error
**Cause:** Backend server not running or proxy not configured
**Fix:** 
1. Start backend server: `npm start` in root directory
2. Restart Vite dev server (proxy config changed)

### "No content showing"
**Cause:** Pages rendering but might be hidden
**Fix:**
1. Check browser console for errors
2. Inspect element to see if content exists
3. Check if DashboardLayout is rendering properly

### Port Already in Use
**Backend (3000):**
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F
```

**Frontend (5173):**
```bash
# Windows
netstat -ano | findstr :5173
taskkill /PID <PID> /F
```

---

## Development Workflow

1. **Backend changes:** Restart backend server
2. **React changes:** Hot reload (automatic)
3. **Vite config changes:** Restart Vite dev server
4. **Package.json changes:** Run `npm install`, restart server

---

## Next Steps

Once both servers are running:
1. Navigate to `http://localhost:5173/`
2. Click "Users" in sidebar
3. Should see users table with data
4. Test search, view modal, refresh

---

**Created:** 2026-01-16
**Updated:** After adding Vite proxy configuration
