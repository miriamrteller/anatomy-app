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

1. Click **"Deploy"** (or Railway auto-deploys on commit)
2. Watch the logs - deployment takes 2-5 minutes
3. When status shows **"Running"** with a green checkmark, deployment is complete
4. Railway assigns a public URL like: `https://anatomy-app-production.railway.app`
5. **Save this URL** - you'll need it for Vercel and to test the API

---

## Step B4: Run Prisma Migrations on Railway

**Action: Connect to Railway and run migrations**

### Option A: Using Railway CLI (Recommended)

1. **Install Railway CLI locally**:
   ```bash
   npm install -g @railway/cli
   ```

2. **Login to Railway**:
   ```bash
   railway login
   ```
   (Opens browser for auth, then returns to terminal)

3. **Link your project**:
   ```bash
   cd d:/Miriam/Development/projects/anatomy-app
   railway link
   ```
   (Select your Railway project from the list)

4. **Run migrations inside Railway container**:
   ```bash
   railway run npm run prisma:generate
   railway run npx prisma migrate deploy
   ```

5. **Optional: Seed with initial data**:
   ```bash
   railway run npm run seed
   ```

6. **Verify migration success**:
   ```bash
   railway run npx prisma studio
   ```
   (Opens Prisma Studio to view database schema)

### Option B: Manual psql Commands

If Railway CLI doesn't work:

```bash
# Connect directly to Railway PostgreSQL
psql postgresql://[user]:[password]@[host]:[port]/[database]

# Then in psql prompt:
\dt  -- List all tables (should be empty before migrations)
```

Then run migrations from your local machine by temporarily setting DATABASE_URL:

```bash
export DATABASE_URL="postgresql://[user]:[password]@[host]:[port]/[database]"
npx prisma migrate deploy
```

---

## Step B5: Verify Backend Deployment

**Test all endpoints to ensure everything works**

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

Expected response: Array of structures (or empty array if no seed data)

### Test 3: Check Logs
In Railway dashboard:
1. Click backend service
2. Go to **"Logs"** tab
3. Should see Express startup message and no errors

**Troubleshooting**:
- **502 Bad Gateway**: Check logs, usually missing DATABASE_URL
- **CORS errors**: Will appear after Vercel connects - we'll fix in Phase 8C
- **Database connection failed**: Verify DATABASE_URL format and pgvector extension

---

## Summary: What You Should Have After Phase 8B

✅ PostgreSQL 16 running on Railway with pgvector extension  
✅ Backend Docker image deployed and accessible at `https://[railway-url]`  
✅ All Prisma migrations applied to production database  
✅ Health check responding at `/health` endpoint  
✅ Backend ready to serve requests  

**Next**: Phase 8C will deploy the frontend and connect them together.

---

## Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| pgvector extension not found | Check Railway PostgreSQL version supports it (16+), ask support if needed |
| `DATABASE_URL` env var not working | Copy exact value from Railway, check quotes in terminal |
| Migrations fail with "Connection timeout" | Check PostgreSQL is running and DATABASE_URL is correct |
| Backend won't start | Check logs for missing env vars (OPENAI_API_KEY) |
|502 Bad Gateway | Container likely crashed, check build logs and error logs |

