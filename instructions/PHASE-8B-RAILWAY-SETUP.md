# Phase 8B: Railway Deployment Guide

## Step B1: Create PostgreSQL Database on Railway

**Action: Log in to Railway Dashboard**

1. Go to https://railway.app/dashboard
2. Create a new project (or use existing)
3. Click **"+ New"** → **"Database"** → **"PostgreSQL"**
4. Railway will initialize PostgreSQL 16 automatically
5. Wait for status to show **"Running"** (usually 1-2 minutes)

**Get Connection Details**
1. Click on the PostgreSQL plugin in your Railway project
2. Go to **"Variables"** tab
3. **Copy the full `DATABASE_URL`** - you'll need this for next steps
   - Format: `postgresql://[user]:[password]@[host]:[port]/[database]`
4. Note the connection details separately:
   - Host: `[host]`
   - Port: `[port]`
   - User: `[user]`
   - Password: `[password]`
   - Database: `[database]` (usually `railway`)

---

## Step B2: Enable pgvector Extension

**Action: Enable pgvector on PostgreSQL**

### Option A: Via Railway Web Terminal (Easier)

1. In Railway PostgreSQL plugin, click **"Connect"** or go to **"Logs"** tab
2. Look for a terminal/CLI button in the interface
3. Run this command:
   ```sql
   CREATE EXTENSION IF NOT EXISTS vector;
   ```
4. Verify it installed:
   ```sql
   SELECT * FROM pg_extension WHERE extname='vector';
   ```
5. You should see a row with `vector` in the results

### Option B: Via Local psql (If Web Terminal Unavailable)

Install `psql` locally, then:

```bash
psql postgresql://[user]:[password]@[host]:[port]/[database] \
  -c "CREATE EXTENSION IF NOT EXISTS vector;"

psql postgresql://[user]:[password]@[host]:[port]/[database] \
  -c "SELECT * FROM pg_extension WHERE extname='vector';"
```

**Troubleshooting**: If pgvector doesn't install, Railway may need the extension installed at the template level. Contact Railway support if needed.

---

## Step B3: Deploy Backend to Railway

**Prerequisites**: GitHub account connected to Railway

### Create Backend Service

1. In your Railway project, click **"+ New"** → **"GitHub Repo"**
2. Select your `anatomy-app` repository
3. Railway auto-detects the Dockerfile - confirm it sees it
4. Configure deploy settings:

   | Setting | Value |
   |---------|-------|
   | Build Command | (leave empty - uses Dockerfile) |
   | Start Command | (leave empty - uses Dockerfile) |
   | Root Directory | `/` (monorepo root) |
   | Auto-deploy | ✅ Enabled |

### Set Environment Variables

In the Railway backend service, go to **"Variables"** and add:

```
NODE_ENV=production
PORT=3000
DATABASE_URL=[paste from Step B1]
OPENAI_API_KEY=sk-[your-openai-key]
LANGSMITH_API_KEY=[optional, for tracing]
FRONTEND_URL=[will set after Vercel deployment]
```

**⚠️ Important**: Leave `FRONTEND_URL` empty for now - you'll update it after Vercel deployment to enable CORS.

### Deploy

1. **First time only**: Commit the updated Dockerfile that includes migrations:
   ```bash
   git add Dockerfile
   git commit -m "fix: Add Prisma migrations and seeding to Docker build"
   git push
   ```

2. Click **"Deploy"** in Railway (or Railway auto-deploys on commit)
3. **Watch the logs carefully** - deployment takes 3-5 minutes:
   - You should see:
     ```
     Running migrations...
     ✓ Seeding database with bone data
     ✅ System prompt initialized
     🚀 Server running on port 3000
     ```
   - **If you see database errors, that means the environment variables aren't set correctly** - check that DATABASE_URL and OPENAI_API_KEY are set

4. When status shows **"Running"** with a green checkmark, deployment is complete
5. Railway assigns a public URL like: `https://anatomy-app-production.railway.app`
6. **Save this URL** - you'll need it for Vercel and to test the API

### Troubleshooting B3 Crashes

**If you see "Cannot find table" or "relation does not exist" errors:**
- This means migrations didn't run in the Docker build
- Go back and verify the Dockerfile has the migration commands
- Force a rebuild by clicking "Redeploy" in Railway

**If you see "OPENAI_API_KEY not configured" error:**
- The environment variables aren't set in Railway
- Go back to "Variables" tab and add: `NODE_ENV=production`, `DATABASE_URL`, `OPENAI_API_KEY`

---

## Step B4: Verify Backend is Running

**Action: Test the Railway API endpoint**

### Test 1: Health Check
```bash
curl https://[railway-url]/health
```

Expected response:
```json
{ "status": "ok" }
```

### Test 2: Get All Structures
```bash
curl https://[railway-url]/api/structures
```

Expected response: Array of 131 bone structures with details

### Test 3: Check Railway Logs

In Railway dashboard:
1. Click backend service
2. Go to **"Logs"** tab
3. Should see:
   ```
   ✓ Seeding database with bone data
   ✅ System prompt initialized
   🚀 Server running on http://0.0.0.0:3000
   📡 Environment: production
   ```

**Troubleshooting Deployment**:
- **502 Bad Gateway**: Container crashed. Check logs for missing env vars or database errors
- **"Cannot find table" errors**: Migrations didn't run. Verify Dockerfile includes migration steps
- **"OPENAI_API_KEY not configured"**: Check Railway Variables tab has OPENAI_API_KEY set
- **Connection timeout**: Check DATABASE_URL is correct and pgvector extension exists

---

## Summary: What You Should Have After Phase 8B

✅ PostgreSQL 16 running on Railway with pgvector extension  
✅ Backend Docker image deployed and running at `https://[railway-url]`  
✅ All Prisma migrations applied to production database  
✅ Database seeded with 131 bone structures  
✅ Health check responding at `/health` endpoint  
✅ Backend ready to serve API requests  

**Next Step**: Phase 8C will deploy the frontend to Vercel and connect it to this backend.

---

## Quick Reference: Your Railway URLs

| Resource | URL |
|----------|-----|
| Railway Dashboard | https://railway.app/dashboard |
| Backend API | `https://[your-backend-url]` (shown in Railway) |
| Health Endpoint | `https://[your-backend-url]/health` |
| API Docs | `https://[your-backend-url]` (shows available endpoints) |

