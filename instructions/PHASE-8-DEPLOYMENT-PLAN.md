# Phase 8: Deployment Plan

**Status**: Planning Phase  
**Created**: May 3, 2026  
**Accounts Ready**: Railway.app ✅ | Vercel.com ✅

---

## 📋 Deployment Architecture

```
┌─────────────────────────────────────────────────────┐
│                    GitHub Repository                 │
│  (Code + CI/CD workflows)                            │
└─────────────┬───────────────────────────┬───────────┘
              │                           │
      ┌───────▼──────────┐        ┌──────▼────────────┐
      │   Railway.app    │        │   Vercel.com      │
      │  (Production)    │        │  (Production)     │
      ├──────────────────┤        ├───────────────────┤
      │ • Backend API    │        │ • Frontend SPA    │
      │   (Node.js)      │        │   (React/Vite)    │
      │ • PostgreSQL 16  │        │ • Auto-deployed   │
      │ • pgvector ext   │        │ • API proxy ready │
      └──────────────────┘        └───────────────────┘
```

---

## � Detailed Setup Guides

**Read these in order and follow each step**:

1. **Phase 8B**: [PHASE-8B-RAILWAY-SETUP.md](PHASE-8B-RAILWAY-SETUP.md) - Deploy backend & database
2. **Phase 8C**: [PHASE-8C-VERCEL-SETUP.md](PHASE-8C-VERCEL-SETUP.md) - Deploy frontend
3. **Phase 8D**: [PHASE-8D-GITHUB-ACTIONS.md](PHASE-8D-GITHUB-ACTIONS.md) - Automate deployments

---

## �🚀 Implementation Checklist

### PHASE 8A: Pre-Deployment Setup ✅ COMPLETE

- [x] **A1. Verify Build Outputs**
  - [x] Backend: Fixed tsconfig - now uses `tsconfig.prod.json` for clean build
  - [x] Frontend: `npm --prefix frontend run build` → `frontend/dist/` exists ✅
  - [x] Backend: `npm run build` → `dist/` with correct structure ✅
  - [x] Updated `package.json` build script to: `tsc --project tsconfig.prod.json`

- [x] **A2. Create CI/CD Configuration**
  - [x] Created `.github/workflows/pr-check.yml` for PR validation
  - [x] Created `.github/workflows/deploy.yml` for production deployment
  - [x] Both workflows: Build validation, test suite, deployment steps
  - [x] Triggers: PR checks on pull requests, deploy on main push

- [x] **A3. Update Frontend Environment Variables**
  - [x] Created `frontend/.env.development` → localhost:3000
  - [x] Created `frontend/.env.production` → placeholder
  - [x] Created `frontend/.env.example` → reference
  - [x] Config already uses `import.meta.env.VITE_API_URL` ✅

- [x] **A4. Verify Database Migrations Strategy**
  - [x] Prisma migrations committed: 6 migrations (init → pgvector → svg updates)
  - [x] Migration lock set to PostgreSQL provider
  - [x] Seed script uses bones.json with proper mapping
  - [x] Schema ready with vector support (embedding field)

### PHASE 8B: Railway Deployment (Backend + Database)

- [ ] **B1. Create PostgreSQL Database on Railway**
  - [ ] Login to Railway dashboard
  - [ ] Create new PostgreSQL 16 plugin
  - [ ] Wait for database to initialize
  - [ ] Copy connection string (will be DATABASE_URL)

- [ ] **B2. Enable pgvector Extension**
  - [ ] Connect to Railway PostgreSQL via psql or Railway UI
  - [ ] Run: `CREATE EXTENSION IF NOT EXISTS vector;`
  - [ ] Verify: `SELECT * FROM pg_extension WHERE extname='vector';`

- [ ] **B3. Deploy Backend to Railway**
  - [ ] Create new Railway project
  - [ ] Connect GitHub repository (auth required)
  - [ ] Configure build command: `npm run build`
  - [ ] Configure start command: `npm start`
  - [ ] Set environment variables:
    - [ ] `NODE_ENV=production`
    - [ ] `DATABASE_URL=postgresql://[user]:[pass]@[host]:[port]/anatomy_app`
    - [ ] `PORT=3000` (Railway auto-assigns public port)
    - [ ] `OPENAI_API_KEY=sk-...`
    - [ ] `LANGSMITH_API_KEY=ls-...` (optional)
    - [ ] `FRONTEND_URL=https://anatomy-app.vercel.app` (Vercel URL, set after Vercel deploy)

- [ ] **B4. Run Prisma Migrations on Railway**
  - [ ] Connect to Railway container via Railway CLI: `railway shell`
  - [ ] Run: `npx prisma migrate deploy`
  - [ ] Run: `npx prisma db seed` (optional, if seed script exists)
  - [ ] Verify database schema: `\d` in psql

- [ ] **B5. Verify Backend Deployment**
  - [ ] Test health endpoint: `curl https://anatomy-api.railway.app/health`
  - [ ] Test API endpoint: `curl https://anatomy-api.railway.app/api/structures`
  - [ ] Check logs in Railway dashboard for any errors

### PHASE 8C: Vercel Deployment (Frontend)

- [ ] **C1. Import Project to Vercel**
  - [ ] Login to Vercel dashboard
  - [ ] Click "Add New" → "Project"
  - [ ] Select GitHub repository
  - [ ] Vercel will auto-detect Vite + root frontend folder setup

- [ ] **C2. Configure Build Settings**
  - [ ] Build Command: `npm run build` (in root, or adjust path if needed)
  - [ ] Output Directory: `frontend/dist`
  - [ ] Install Command: `npm install`
  - [ ] Framework: Vite

- [ ] **C3. Set Environment Variables in Vercel**
  - [ ] `VITE_API_URL=https://anatomy-api.railway.app`
  - [ ] If using LangSmith: `VITE_LANGSMITH_API_KEY=...`

- [ ] **C4. Deploy to Vercel**
  - [ ] Vercel triggers automatic deployment on main branch push
  - [ ] Wait for build to complete (~2-3 min)
  - [ ] Get production URL: `https://anatomy-app.vercel.app`

- [ ] **C5. Verify Frontend Deployment**
  - [ ] Open https://anatomy-app.vercel.app
  - [ ] Check browser console for errors
  - [ ] Verify API calls are reaching Railway backend (Network tab)
  - [ ] Test interactive features (SVG clicks, API requests)

- [ ] **C6. Update Backend's FRONTEND_URL**
  - [ ] After Vercel URL is confirmed, update Railway env var:
    - [ ] `FRONTEND_URL=https://anatomy-app.vercel.app`
  - [ ] Restart Railway backend container

### PHASE 8D: CI/CD Automation

- [ ] **D1. GitHub Actions Workflow (`.github/workflows/deploy.yml`)**
  - [ ] **Trigger**: Push to main branch
  - [ ] **Steps**:
    1. Checkout code
    2. Setup Node.js 20
    3. Install dependencies (`npm ci`)
    4. Run type checking (`npm run build` in frontend)
    5. Run tests (if any): `npm test`
    6. Build backend: `npm run build`
    7. Build frontend: `npm --prefix frontend run build`
    8. Deploy backend to Railway (via Railway API token)
    9. Deploy frontend to Vercel (via Vercel token)

- [ ] **D2. PR Checks (`.github/workflows/pr-check.yml`)**
  - [ ] **Trigger**: Pull requests to main
  - [ ] **Steps**: Same as above but without deployment step
  - [ ] Provides confidence before merging

- [ ] **D3. Environment Variables for GitHub Actions**
  - [ ] `RAILWAY_TOKEN` (get from Railway account settings)
  - [ ] `VERCEL_TOKEN` (get from Vercel account settings)
  - [ ] Both stored as GitHub Secrets (repository settings)

---

## 🔧 Detailed Steps by Section

### Backend Deployment on Railway

**Prerequisites**: Railway account, GitHub connected

1. **Create Database**
   ```bash
   # In Railway dashboard:
   # New → PostgreSQL 16
   # Wait for "Running" status
   # Copy DATABASE_URL from variables tab
   ```

2. **Test Migration Locally First**
   ```bash
   # Ensure local migrations work
   npm run db:setup
   npm run verify:db
   ```

3. **Deploy via Docker**
   - Railway auto-detects `Dockerfile` and builds it
   - No additional config needed for container
   - Monitor logs: Dashboard → "Logs" tab

4. **Post-Deploy Checklist**
   ```bash
   # Test health
   curl https://YOUR_RAILWAY_DOMAIN/health
   
   # Test structures endpoint
   curl https://YOUR_RAILWAY_DOMAIN/api/structures | jq
   
   # Check logs for migration errors
   # Check database size and schema
   ```

### Frontend Deployment on Vercel

**Prerequisites**: Vercel account, GitHub connected

1. **Add to Vercel**
   - Vercel → New Project → Import GitHub repo
   - Select repository
   - Framework: Vite
   - Root Directory: `./` (root of monorepo)
   - Build Command: `npm run build` (builds both frontend)
   - Output Directory: `frontend/dist`

2. **Env Vars**
   ```
   VITE_API_URL = https://YOUR_RAILWAY_DOMAIN
   ```

3. **Deploy & Monitor**
   - First deploy happens automatically
   - Check Build Logs for errors
   - Vercel provides preview URL after build

### GitHub Actions CI/CD

**Template Workflow** (`create this file`):

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test-and-build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Build backend
        run: npm run build
      
      - name: Build frontend
        run: npm --prefix frontend run build
      
      - name: Run tests
        run: npm test -- run

  deploy-railway:
    needs: test-and-build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Railway
        run: |
          npm install -g @railway/cli
          railway login --token ${{ secrets.RAILWAY_TOKEN }}
          railway up --service backend
        env:
          RAILWAY_TOKEN: ${{ secrets.RAILWAY_TOKEN }}

  deploy-vercel:
    needs: test-and-build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy Frontend to Vercel
        run: |
          npm install -g vercel
          vercel --token ${{ secrets.VERCEL_TOKEN }} --prod
        env:
          VERCEL_TOKEN: ${{ secrets.VERCEL_TOKEN }}
```

---

## ✅ Pre-Deployment Checklist

Before starting deployment:

- [ ] All code is committed and pushed to main branch
- [ ] Backend builds: `npm run build` produces `dist/`
- [ ] Frontend builds: `npm --prefix frontend run build` produces `frontend/dist/`
- [ ] Tests pass locally: `npm test`
- [ ] `.env.example` is up-to-date with all required variables
- [ ] Prisma schema is final and migrations are committed
- [ ] Dockerfile builds successfully: `docker build -t anatomy-app .`
- [ ] No hardcoded credentials in codebase
- [ ] CORS configuration is correct for production URLs

---

## 🔐 Secrets Management

**GitHub Secrets to Add** (Settings → Secrets and variables → Actions):

| Secret | Source | Purpose |
|--------|--------|---------|
| `RAILWAY_TOKEN` | Railway Settings → Account → API Tokens | CI/CD deploy to Railway |
| `VERCEL_TOKEN` | Vercel Settings → Tokens | CI/CD deploy to Vercel |
| `OPENAI_API_KEY` | OpenAI Platform | Backend LLM calls |
| `LANGSMITH_API_KEY` | LangSmith | Optional tracing |

**GitHub Env Vars** (visible in logs, non-sensitive):
- `VITE_API_URL` (Vercel env var, set in Vercel dashboard, not GitHub)

---

## 📊 Deployment Status Tracking

| Phase | Component | Status | Date | Notes |
|-------|-----------|--------|------|-------|
| 8A | Build verification | ⏳ Pending | | |
| 8A | CI/CD workflows | ⏳ Pending | | |
| 8B | Railway backend | ⏳ Pending | | |
| 8B | Database setup | ⏳ Pending | | |
| 8B | Backend verification | ⏳ Pending | | |
| 8C | Vercel frontend | ⏳ Pending | | |
| 8C | Frontend verification | ⏳ Pending | | |
| 8D | GitHub Actions | ⏳ Pending | | |

---

## 🚨 Common Issues & Solutions

| Issue | Solution |
|-------|----------|
| `DATABASE_URL` not recognized | Check Railway env var case-sensitive match, test locally first |
| pgvector not found | Run `CREATE EXTENSION vector;` on Railway database |
| Frontend can't reach backend | Check `VITE_API_URL` is production Railway URL, not localhost |
| Build fails on Railway | Check Node.js version (needs 20+), check Dockerfile build locally |
| CORS errors | Verify `FRONTEND_URL` matches exact Vercel domain, no trailing slash |
| Migrations fail | Run `prisma migrate reset` locally first, then deploy fresh |

---

## 🎯 Phase 8 Completion Criteria

✅ **Deployment is complete when:**
1. Backend is running on Railway with health check passing
2. PostgreSQL is initialized with pgvector and schema seeded
3. Frontend is deployed on Vercel and loads without errors
4. Frontend can successfully call backend API
5. GitHub Actions CI/CD deploys successfully on main push
6. Both services have monitoring/logging visible in their dashboards
7. No hardcoded credentials in public repos or logs

---

## 📝 Next Steps

1. **Start with A1**: Verify both `npm run build` scripts work
2. **Then A2-A3**: Create CI/CD config and environment files
3. **Then B1-B5**: Deploy backend and database
4. **Then C1-C6**: Deploy frontend and verify integration
5. **Finally D1-D3**: Set up automated CI/CD

---

**Last Updated**: May 3, 2026  
**Next Milestone**: Phase 8 Complete ✨
