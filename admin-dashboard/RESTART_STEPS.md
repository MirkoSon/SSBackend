# How to Restart the Dashboard

If you're experiencing 404 errors or cached module issues, follow these steps:

## Quick Restart (Recommended)

```bash
# 1. Stop the dev server
# Press Ctrl+C in the terminal running npm run dev

# 2. Clear Vite cache
cd E:\GIT\SSBackend\admin-dashboard
rm -rf node_modules/.vite

# 3. Restart the dev server
npm run dev
```

## Full Reset (If Quick Restart Doesn't Work)

```bash
# 1. Stop the dev server (Ctrl+C)

# 2. Clear all caches
cd E:\GIT\SSBackend\admin-dashboard
rm -rf node_modules/.vite
rm -rf dist

# 3. Clear browser cache
# In browser: Ctrl+Shift+Delete -> Clear cache

# 4. Restart dev server
npm run dev

# 5. Hard reload browser
# Ctrl+Shift+R or Cmd+Shift+R
```

## Nuclear Option (Complete Reinstall)

```bash
# Only use this if nothing else works

# 1. Stop the dev server (Ctrl+C)

# 2. Delete everything
cd E:\GIT\SSBackend\admin-dashboard
rm -rf node_modules
rm -rf package-lock.json
rm -rf .vite
rm -rf dist

# 3. Reinstall dependencies
npm install

# 4. Start dev server
npm run dev
```

## Common Issues After File Changes

### Issue: "GET /src/pages/Users.jsx 404"
**Cause:** Vite cached the old file location
**Solution:**
```bash
rm -rf node_modules/.vite
npm run dev
```

### Issue: White/light theme instead of dark
**Cause:** Browser cached old CSS
**Solution:**
1. Hard reload: Ctrl+Shift+R
2. Clear browser cache
3. Restart dev server

### Issue: Module not found errors
**Cause:** Stale node_modules
**Solution:**
```bash
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## After Pulling New Changes

Always do this after `git pull`:

```bash
# 1. Clear Vite cache
rm -rf node_modules/.vite

# 2. Check for new dependencies
npm install

# 3. Restart dev server
npm run dev
```

## Verifying Everything Works

After restarting, check:

1. **Dashboard loads:** http://localhost:5173
2. **Dark theme active:** Background should be #0f172a (dark slate)
3. **No 404 errors:** Check browser console (F12)
4. **All pages work:**
   - Dashboard (/)
   - Users (/users)
   - Saves (/saves)
   - Progress (/progress)

## Still Having Issues?

1. Check TROUBLESHOOTING.md
2. Verify backend is running: http://localhost:3012/health
3. Check database is seeded: `npm run seed` in backend folder
4. Look for errors in terminal and browser console
