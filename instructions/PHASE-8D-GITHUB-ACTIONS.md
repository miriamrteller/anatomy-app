# Phase 8D: GitHub Actions CI/CD Setup

## Step D1: Get Railway & Vercel Tokens

**You need API tokens to allow GitHub Actions to deploy**

### Get Railway Token

1. Go to https://railway.app/dashboard/account
2. Click **"Tokens"** or **"API Tokens"**
3. Click **"Create Token"** or **"New Token"**
4. Give it a name: `GitHub Actions Deployer`
5. Copy the token (you'll use it once, can't see it again)
6. **Keep this safe** - store it in a secure place temporarily

### Get Vercel Token

1. Go to https://vercel.com/account/tokens
2. Click **"Create Token"**
3. Name it: `GitHub Actions Deployer`
4. Scope: **"Full Account"** (or just your anatomy-app project)
5. Expiration: **"No Expiration"** (for production CI/CD)
6. Click **"Create"**
7. Copy the token immediately

---

## Step D2: Add Tokens to GitHub Secrets

**Store tokens securely in GitHub**

### For Railway Token

1. Go to GitHub: https://github.com/[username]/anatomy-app
2. Settings → **"Secrets and variables"** → **"Actions"**
3. Click **"New repository secret"**
4. Name: `RAILWAY_TOKEN`
5. Value: [paste Railway token from D1]
6. Click **"Add secret"**

### For Vercel Token

1. Click **"New repository secret"** again
2. Name: `VERCEL_TOKEN`
3. Value: [paste Vercel token from D1]
4. Click **"Add secret"**

### Optional: Vercel Project ID (if using Vercel CLI)

1. In your local repo: `vercel login` and `vercel link`
2. Creates `.vercel/project.json` with your project ID
3. Commit this file to git (it's safe - public info)
4. Vercel CLI can then use it instead of `--scope` flag

---

## Step D3: Verify GitHub Actions Workflows

**The workflows were created in Phase 8A**

Check that these files exist and are correct:

### `.github/workflows/pr-check.yml`
- **Trigger**: Pull requests to main/develop
- **Jobs**: Type check, build, test (no deployment)
- **Purpose**: Validate code before merge

### `.github/workflows/deploy.yml`
- **Trigger**: Push to main branch
- **Jobs**: 
  1. Test & build (same as PR check)
  2. Deploy backend to Railway
  3. Deploy frontend to Vercel
- **Purpose**: Automated production deployment

---

## Step D4: Test the CI/CD Workflows

### Test PR Check Workflow

1. Create a new branch:
   ```bash
   git checkout -b test-ci
   ```

2. Make a small change (e.g., add a comment):
   ```bash
   echo "# Test CI/CD" >> README.md
   ```

3. Commit and push:
   ```bash
   git add README.md
   git commit -m "Test CI/CD"
   git push origin test-ci
   ```

4. Go to GitHub → **"Pull requests"** → **"New pull request"**
5. Compare: `test-ci` → `main`
6. Create the PR

7. Watch the PR checks run:
   - GitHub shows a yellow dot while running
   - Should complete in 2-3 minutes
   - Should show green checkmark if all pass

8. If checks pass, you can merge:
   ```bash
   git checkout main
   git pull
   git merge test-ci
   git push origin main
   ```

### Test Deploy Workflow

1. Once PR is merged to main, deployment workflow triggers automatically
2. Go to GitHub → **"Actions"** tab
3. Select the "Deploy to Production" workflow
4. Watch the jobs:
   - `test-and-build`: Runs tests and builds
   - `deploy-railway`: Deploys backend
   - `deploy-vercel`: Deploys frontend
5. Each job logs its progress - check logs for errors
6. When all complete (green ✓), deployment is done
7. Verify:
   - Railway: Check backend logs show new deploy
   - Vercel: Check deployments show new production build

---

## Step D5: Handle Deployment Failures

**If a workflow fails**:

### Check PR Check Failures
1. GitHub shows red ✗ on PR
2. Click **"Details"** next to failing check
3. Read the error log carefully
4. Common issues:
   - TypeScript compile errors (fix and push new commit)
   - Test failures (fix code and push)
   - Missing dependencies (check package.json)
5. Fix locally, commit, push - workflow re-runs automatically

### Check Deploy Failures
1. Go to GitHub **"Actions"** tab
2. Click the failed workflow run
3. Click the failed job (e.g., "deploy-railway")
4. Read the error log
5. Common issues:
   - `RAILWAY_TOKEN` expired or invalid (get new one, update secret)
   - `VERCEL_TOKEN` invalid (same fix)
   - Railway/Vercel service down (wait or check status page)
   - Environment variable missing on Railway/Vercel (add manually)
6. Fix the issue, then either:
   - Push a new commit to trigger workflow
   - Or manually re-run workflow from GitHub Actions page

---

## Step D6: Environment Variables for GitHub Secrets (Reference)

**These were already added in Step D2, but here's the full list**:

| Secret Name | Value | Where from |
|-------------|-------|-----------|
| `RAILWAY_TOKEN` | Railway API token | railway.app/account/tokens |
| `VERCEL_TOKEN` | Vercel API token | vercel.com/account/tokens |

**Note**: Sensitive env vars like `OPENAI_API_KEY` should NOT go in GitHub secrets. Instead:
- Store them in Railway environment variables
- Store them in Vercel environment variables
- Workflows don't need them (deployment only pushes code)

---

## Step D7: Verify Complete CI/CD Setup

**Your automation is ready when**:

✅ All GitHub secrets are set (`RAILWAY_TOKEN`, `VERCEL_TOKEN`)  
✅ Both workflow files exist: `pr-check.yml`, `deploy.yml`  
✅ PR check workflow runs on pull requests (green ✓)  
✅ Deploy workflow runs on main branch push (green ✓)  
✅ Backend deploys to Railway  
✅ Frontend deploys to Vercel  
✅ No manual intervention needed to deploy  

---

## Deployment Workflow Summary

```
Developer workflow:
  1. git checkout -b feature
  2. Make changes
  3. git commit & push
  4. Create PR on GitHub
  5. PR checks run automatically ← GitHub Actions (pr-check.yml)
  6. Review & merge PR
  7. Push to main triggers deploy ← GitHub Actions (deploy.yml)
  8. Railway backend updates automatically
  9. Vercel frontend updates automatically
  10. Done! Production updated
```

---

## Monitoring & Maintenance

### Watch for Failed Deployments
- GitHub notifies you of failed workflows
- Set up email notifications in GitHub settings
- Check "Actions" page periodically

### Revert a Bad Deployment
If something breaks in production:
1. Revert the commit locally: `git revert HEAD`
2. Push to main: `git push origin main`
3. GitHub Actions automatically deploys the revert
4. Both Railway and Vercel will update

### Update Tokens When They Expire
- Railway tokens: Usually long-lived, check expiration
- Vercel tokens: Can be set to "No Expiration"
- Set calendar reminder to rotate annually

### Check Deployment History
- Railway: Dashboard → Deployments tab
- Vercel: Dashboard → Deployments tab
- GitHub Actions: Actions tab → workflow runs

---

## Common Issues & Solutions

| Problem | Solution |
|---------|----------|
| "Authentication failed" in deploy job | Token invalid/expired; get new token, update GitHub secret |
| Workflow file not found | Check `.github/workflows/` exists with correct YAML files |
| PR checks pass but deploy fails | Usually missing secrets; check GitHub repo settings → Secrets |
| Manual deploy works but GitHub fails | Likely different environment; compare local env vars to GitHub secrets |
| Vercel deploy succeeds but shows old code | Clear Vercel cache or hard-refresh browser (Cmd+Shift+R) |

---

## Success Checklist ✅

- [ ] Railroad and Vercel tokens obtained
- [ ] GitHub secrets created (RAILWAY_TOKEN, VERCEL_TOKEN)
- [ ] Workflow files exist in `.github/workflows/`
- [ ] PR check runs on new pull request
- [ ] Deploy workflow runs on main branch push
- [ ] Backend deploys to Railway successfully
- [ ] Frontend deploys to Vercel successfully
- [ ] No manual steps needed for deployment
- [ ] Team understands the CI/CD flow

