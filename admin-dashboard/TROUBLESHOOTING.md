# Troubleshooting Guide

## Issue: Users page shows light theme table instead of dark mockup design

### Problem
The Users page was displaying with a light/white theme instead of the dark slate theme from the mockups.

### Root Cause
There were TWO Users page files:
- `src/pages/Users.jsx` (OLD - light theme)
- `src/pages/Users/index.jsx` (NEW - dark mockup theme)

React was importing the old `Users.jsx` file by default.

### Solution
✅ **FIXED** - Deleted `src/pages/Users.jsx` in commit c124c92

Now the app correctly uses `src/pages/Users/index.jsx` with the dark theme.

---

## Common Issues & Solutions

### 1. Dashboard not connecting to API

**Symptoms:**
- Empty tables
- "Failed to fetch" errors
- API connection errors

**Solutions:**
1. Make sure backend is running:
   ```bash
   cd E:\GIT\SSBackend
   npm start
   ```
   Backend should be on `http://localhost:3012`

2. Check `.env` file in admin-dashboard:
   ```
   VITE_API_URL=http://localhost:3012
   ```

3. Verify database is seeded:
   ```bash
   cd E:\GIT\SSBackend
   npm run seed
   ```

### 2. Blank/White screen

**Symptoms:**
- Dashboard shows blank white page
- No errors in console

**Solutions:**
1. Check if dashboard is running:
   ```bash
   cd E:\GIT\SSBackend\admin-dashboard
   npm run dev
   ```

2. Clear browser cache and hard reload (Ctrl+Shift+R)

3. Check console for errors (F12)

### 3. Wrong theme/colors

**Symptoms:**
- Light theme instead of dark
- Wrong colors (not matching mockup)

**Solutions:**
1. Make sure you're on the right branch:
   ```bash
   git branch
   # Should show: * dashboard-mockup-implementation
   ```

2. Pull latest changes:
   ```bash
   git pull origin dashboard-mockup-implementation
   ```

3. Check for conflicting component files (like the Users.jsx issue)

### 4. Tables not showing data

**Symptoms:**
- Tables show "No data found"
- API calls succeed but tables are empty

**Solutions:**
1. Seed the database:
   ```bash
   cd E:\GIT\SSBackend
   npm run seed
   ```

2. Check API endpoint in browser:
   - http://localhost:3012/admin/api/users
   - Should return JSON with users array

3. Check browser console for errors

### 5. Project selector not working

**Symptoms:**
- Cannot select different projects
- Always shows "default"

**Solutions:**
1. Create a project via API:
   ```bash
   curl -X POST http://localhost:3012/admin/api/projects \
     -H "Content-Type: application/json" \
     -H "x-admin-bypass: true" \
     -d '{"id":"test","name":"Test Project","description":"Test"}'
   ```

2. Check localStorage in browser console:
   ```javascript
   localStorage.getItem('ssbackend_current_project')
   ```

3. Manually set project:
   ```javascript
   localStorage.setItem('ssbackend_current_project', 'default')
   ```

### 6. Build errors

**Symptoms:**
- `npm run dev` fails
- Module not found errors

**Solutions:**
1. Delete node_modules and reinstall:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

2. Make sure you're in the right directory:
   ```bash
   pwd
   # Should be: E:\GIT\SSBackend\admin-dashboard
   ```

3. Check Node version:
   ```bash
   node --version
   # Should be v18 or higher
   ```

---

## Development Workflow

### Starting Fresh

1. **Seed the database:**
   ```bash
   cd E:\GIT\SSBackend
   npm run seed
   ```

2. **Start the backend:**
   ```bash
   cd E:\GIT\SSBackend
   npm start
   ```
   - Should show: `Server running on port 3012`

3. **Start the dashboard (in new terminal):**
   ```bash
   cd E:\GIT\SSBackend\admin-dashboard
   npm run dev
   ```
   - Should show: `Local: http://localhost:5173`

4. **Open browser:**
   - Navigate to http://localhost:5173
   - Select "default" project
   - Navigate to Users, Saves, or Progress pages

### Testing Changes

1. Make changes to code
2. Vite will hot-reload automatically
3. Check browser - changes should appear
4. If not, hard reload (Ctrl+Shift+R)

### Before Committing

1. Test all pages work:
   - Dashboard (/)
   - Users (/users)
   - Saves (/saves)
   - Progress (/progress)

2. Check no console errors (F12)

3. Verify API calls work (Network tab)

4. Stage and commit:
   ```bash
   git add -A
   git commit -m "Your message"
   ```

---

## File Structure Reference

```
admin-dashboard/
├── src/
│   ├── pages/
│   │   ├── Dashboard/
│   │   │   └── index.jsx       ✅ Dashboard page
│   │   ├── Users/
│   │   │   └── index.jsx       ✅ Users page (dark theme)
│   │   ├── Saves/
│   │   │   └── index.jsx       ✅ Saves page
│   │   └── Progress/
│   │       └── index.jsx       ✅ Progress page
│   ├── services/
│   │   └── api/
│   │       ├── apiClient.js    API client
│   │       └── adminService.js API functions
│   ├── components/
│   │   ├── AdminNavbar/        Top navbar
│   │   └── Sidebar/            Left sidebar
│   └── App.jsx                 Main routes
```

## Getting Help

1. Check this troubleshooting guide
2. Check browser console (F12)
3. Check terminal output
4. Check IMPLEMENTATION_SUMMARY.md
5. Check SEEDING.md for database issues
