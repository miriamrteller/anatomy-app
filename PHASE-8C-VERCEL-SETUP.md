# Phase 8C: Vercel Deployment Guide

## Step C1: Import Project to Vercel

**Action: Add GitHub repository to Vercel**

1. Go to https://vercel.com/dashboard
2. Click **"Add New..."** → **"Project"**
3. Select **"Import Git Repository"**
4. Find and select `anatomy-app` from your GitHub repos
5. Click **"Import"**

---

## Step C2: Configure Build Settings

**Vercel auto-detects Vite** but verify these settings:

| Setting | Value |
|---------|-------|
| Framework | **Vite** |
| Build Command | `npm run build` |
| Output Directory | `frontend/dist` |
| Install Command | `npm install` |
| Root Directory | `./` (monorepo root) |
| Node Version | **20.x** (or current LTS) |

**If Vercel doesn't auto-detect correctly**:
1. Click **"Edit"** in the build settings
2. Manually set the values above
3. Click **"Save"**

---

## Step C3: Set Environment Variables in Vercel

**Critical**: Set the API URL before first deployment

In Vercel project settings → **"Environment Variables"**:

Add this variable:
```
VITE_API_URL=https://[your-railway-backend-url]
```

Replace `[your-railway-backend-url]` with the URL from Phase 8B:
- Example: `https://anatomy-app-production.railway.app`
- Do NOT include trailing slash

**For all environments**: Development, Preview, Production

---

## Step C4: Deploy to Vercel

### Automatic Deployment (Recommended)

1. Once you've set environment variables, **push a new commit to main**:
   ```bash
   git add .
   git commit -m "Phase 8C: Ready for deployment"
   git push origin main
   ```

2. Vercel detects the push and **automatically starts building**
3. Watch the deployment in Vercel dashboard
4. Build should complete in 2-3 minutes

### Manual Deployment

If automatic doesn't trigger:
1. Go to Vercel dashboard → Select your project
2. Click **"Deployments"** tab
3. Find the top deployment with branch `main`
4. Click **"Redeploy"** button

**Expected build output**:
```
✓ Build completed successfully
✓ Deployed to vercel.com
✓ Assigned production domain: https://anatomy-app-[random].vercel.app
```

---

## Step C5: Verify Frontend Deployment

**Test the deployed frontend**

1. Open your Vercel-assigned URL in browser: `https://anatomy-app-[random].vercel.app`
2. Check browser console (F12 → Console tab):
   - Should NOT have CORS errors
   - Should NOT have "Cannot reach API" messages
3. Network tab (F12 → Network):
   - Requests to `/api/*` should go to Railway backend
   - Status should be 200 (success) or 404 (if endpoint doesn't exist)

**Common issues**:
- If you see CORS error: Go to Step C6 immediately
- If no API requests at all: Check that `VITE_API_URL` was loaded (log in console)
- If 404 on API: Frontend is correct, but endpoint doesn't exist on backend yet

---

## Step C6: Update Backend's FRONTEND_URL (Critical for CORS)

**Once Vercel deployment is complete**, you MUST update Railway backend:

1. Get Vercel's assigned domain from Vercel dashboard
   - Format: `https://anatomy-app-[random].vercel.app`
   - You can also use a custom domain if configured

2. Go to **Railway dashboard** → Backend service → **Variables**

3. **Update this variable**:
   ```
   FRONTEND_URL=https://anatomy-app-[random].vercel.app
   ```

4. **Important**: No trailing slash, exact match

5. Railway auto-restarts the backend service (watch logs)

6. **Re-test frontend**:
   - Refresh the Vercel frontend
   - CORS errors should disappear
   - API calls should succeed

---

## Step C7: Enable Custom Domain (Optional)

**If you want a custom domain instead of vercel-assigned one**:

1. In Vercel project settings → **"Domains"**
2. Click **"Add"**
3. Enter your custom domain (e.g., `anatomy-app.com`)
4. Follow DNS setup instructions
5. Once verified, update Railway's `FRONTEND_URL` to match

---

## Summary: What You Should Have After Phase 8C

✅ Frontend deployed to Vercel with auto-deploy on git push  
✅ `VITE_API_URL` environment variable set to Railway backend URL  
✅ Backend's `FRONTEND_URL` updated to Vercel URL  
✅ CORS enabled between frontend and backend  
✅ Frontend successfully calls backend `/api/*` endpoints  
✅ No console errors when loading frontend in browser  

**Next**: Phase 8D will set up automatic deployments via GitHub Actions.

---

## Vercel Deployment Checklist

- [ ] Repository imported to Vercel
- [ ] Build settings configured (Vite, npm run build, frontend/dist)
- [ ] `VITE_API_URL` env var set to Railway backend
- [ ] First deployment completed (watch logs)
- [ ] Frontend loads without 404 on assets
- [ ] Network tab shows API requests to Railway
- [ ] No CORS errors in browser console
- [ ] Vercel domain copied for use in Railway FRONTEND_URL
- [ ] Railway backend FRONTEND_URL updated
- [ ] Re-tested after Railway restart

---

## Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| Build fails with "Module not found" | Check `npm install` installs both root + frontend; verify package.json scripts |
| `VITE_API_URL` undefined in browser | Verify env var is set in Vercel for all environments (dev/preview/prod) |
| CORS errors after deploy | Railway's `FRONTEND_URL` not updated; go to Step C6 |
| Frontend shows blank page | Check browser console for errors; likely missing API response |
| 404 on `/api/structures` | Backend endpoint doesn't exist, verify Phase 8B health check first |
| Build command times out | Rare; try increasing timeout in Vercel settings or run locally to debug |

