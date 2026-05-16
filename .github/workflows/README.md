# GitHub Actions CI/CD Pipeline

This project uses GitHub Actions to automate testing, building, security checks, and deployment. Below is a guide to each workflow.

## 📋 Workflows Overview

### 1. **Backend CI/CD** (`backend-ci.yml`)
Runs on Python code changes in the `iotsecure/` directory.

**What it does:**
- Tests Python 3.10, 3.11, and 3.12
- Lints code with `flake8`
- Formats code check with `black`
- Import sorting check with `isort`
- Runs pytest with coverage reporting
- Security scanning with `bandit` and `safety`

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

---

### 2. **Frontend CI/CD** (`frontend-ci.yml`)
Runs on React/Dashboard code changes in the `iotsecure/dashboard/` directory.

**What it does:**
- Tests Node 18.x and 20.x
- Lints with ESLint
- Builds with Vite
- Security check with `npm audit`
- Uploads build artifacts

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

---

### 3. **Full Stack CI** (`fullstack-ci.yml`)
Comprehensive validation for the entire project.

**What it does:**
- Secret scanning with TruffleHog
- Project structure validation
- Type checking with mypy
- Code complexity analysis with radon
- Dependency vulnerability checks (both Python and Node)
- Scheduled daily runs

**Triggers:**
- Push to `main` or `develop`
- Pull requests to `main` or `develop`
- Daily at 2 AM UTC

---

### 4. **Code Quality & Coverage** (`coverage.yml`)
Generates test coverage reports.

**What it does:**
- Pytest coverage reporting
- Codecov integration
- SonarCloud analysis (if configured)
- PR comments with coverage info

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` or `develop` branches

---

### 5. **Deploy** (`deploy.yml`)
Manual deployment with artifact creation.

**What it does:**
- Validates environment setup
- Builds both backend and frontend
- Pre-deployment checks
- Creates deployment artifacts
- Can be triggered manually or on releases

**Triggers:**
- Manual workflow dispatch (choose staging/production)
- Automatic on GitHub releases

**Usage:**
```bash
# Via GitHub Actions UI or GitHub CLI
gh workflow run deploy.yml -f environment=staging
```

---

### 6. **Release** (`release.yml`)
Creates semantic version releases.

**What it does:**
- Validates semantic versioning
- Creates git tags
- Generates GitHub releases
- Supports major/minor/patch versions

**Triggers:**
- Manual workflow dispatch

**Usage:**
```bash
# Via GitHub Actions UI
# Select version (e.g., 1.0.0) and release type (major/minor/patch)

# Or via GitHub CLI
gh workflow run release.yml -f version=1.0.0 -f release_type=patch
```

---

## 🔐 Secrets Configuration

Some workflows require GitHub Secrets. Add these in **Settings → Secrets and variables → Actions**:

| Secret | Description | Optional |
|--------|-------------|----------|
| `SONAR_TOKEN` | SonarCloud token for code analysis | ✓ |
| `CODECOV_TOKEN` | Codecov token for coverage reports | ✓ |
| `DEPLOYMENT_KEY` | SSH key for deployment (if needed) | ✓ |

---

## 📊 Status Badges

Add these to your README to display workflow status:

```markdown
![Backend CI/CD](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/backend-ci.yml/badge.svg)
![Frontend CI/CD](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/frontend-ci.yml/badge.svg)
![Full Stack CI](https://github.com/YOUR_USERNAME/YOUR_REPO/actions/workflows/fullstack-ci.yml/badge.svg)
```

---

## 🚀 Quick Start

1. **Commit the workflows** to your repository:
   ```bash
   git add .github/workflows/
   git commit -m "Add GitHub Actions CI/CD pipelines"
   git push origin main
   ```

2. **Monitor workflows** in GitHub Actions tab

3. **View logs** for any failed jobs

4. **Configure optional services** (SonarCloud, Codecov) for enhanced reporting

---

## 🛠️ Customization

### Change Python versions in `backend-ci.yml`:
```yaml
matrix:
  python-version: ['3.10', '3.11', '3.12']
```

### Change Node versions in `frontend-ci.yml`:
```yaml
matrix:
  node-version: ['18.x', '20.x']
```

### Add cron schedule in `fullstack-ci.yml`:
```yaml
schedule:
  - cron: '0 2 * * *'  # Daily at 2 AM UTC
```

---

## ⚠️ Troubleshooting

### Workflow not triggering?
- Check branch protection rules don't require status checks
- Verify path filters match your file structure
- Ensure workflow files are valid YAML

### Tests failing?
- Check Python/Node versions compatibility
- Verify dependencies in `iotsecure/requirements.txt` and `iotsecure/dashboard/package.json`
- Run locally first: `pytest iotsecure/` or `npm run lint` (in `iotsecure/dashboard/`)

### Deployment issues?
- Ensure all environment variables are set
- Check pre-deployment validation passes
- Review logs in GitHub Actions UI

---

## 📝 Notes

- All workflows have error tolerance enabled with `continue-on-error: true` for non-critical steps
- Build artifacts are retained for 5 days
- Deployment artifacts are retained for 30 days
- Workflows run on Ubuntu latest for consistency

