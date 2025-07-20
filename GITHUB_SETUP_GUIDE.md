# GitHub Repository Setup Guide for Lamsa

Follow these steps to create and push your Lamsa project to a new GitHub repository.

## 1. Create a New Repository on GitHub

1. Go to [GitHub.com](https://github.com) and sign in
2. Click the green "New" button or go to https://github.com/new
3. Configure the repository:
   - **Repository name**: `lamsa`
   - **Description**: "Beauty booking platform for Jordan - Mobile-first marketplace"
   - **Visibility**: Choose Private or Public based on your needs
   - **DO NOT** initialize with README, .gitignore, or license (we already have these)
4. Click "Create repository"

## 2. Add GitHub Remote and Push

After creating the repository, GitHub will show you quick setup instructions. Use these commands:

```bash
# Add the new remote (replace YOUR_USERNAME with your GitHub username)
git remote add origin https://github.com/YOUR_USERNAME/lamsa.git

# Or if using SSH (recommended):
git remote add origin git@github.com:YOUR_USERNAME/lamsa.git

# Verify the remote was added
git remote -v

# Push all branches and tags
git push -u origin main
```

## 3. Verify Repository Settings

After pushing, configure these settings on GitHub:

### Security Settings
1. Go to Settings > Security
2. Enable "Dependency alerts"
3. Enable "Dependabot security updates"
4. Consider enabling branch protection rules for `main`

### Branch Protection (Recommended)
1. Go to Settings > Branches
2. Add rule for `main` branch:
   - Require pull request reviews before merging
   - Dismiss stale pull request approvals
   - Require status checks to pass
   - Include administrators

### Secrets for GitHub Actions
If using GitHub Actions for CI/CD, add these secrets:
1. Go to Settings > Secrets and variables > Actions
2. Add the following secrets:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_KEY`
   - `JWT_SECRET`
   - `REDIS_URL`

## 4. Update Local Configuration

After setting up the remote:

```bash
# Set upstream branch
git branch --set-upstream-to=origin/main main

# Verify everything is connected
git fetch
git status
```

## 5. Team Access (if applicable)

1. Go to Settings > Manage access
2. Click "Invite a collaborator"
3. Add team members with appropriate permissions:
   - **Write** for developers
   - **Read** for stakeholders
   - **Admin** for project leads

## 6. Initialize GitHub Features

### Issues
1. Go to Issues tab
2. Create labels for your workflow:
   - `bug`, `feature`, `enhancement`
   - `frontend`, `backend`, `mobile`
   - `priority:high`, `priority:medium`, `priority:low`

### Projects (Optional)
1. Go to Projects tab
2. Create a new project board
3. Set up columns: To Do, In Progress, Review, Done

### Wiki (Optional)
1. Go to Wiki tab
2. Create initial pages for:
   - Architecture Overview
   - Development Guidelines
   - API Documentation

## 7. Continuous Integration (Optional)

Create `.github/workflows/ci.yml` for automated testing:

```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test-api:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - name: Install dependencies
      run: |
        cd lamsa-api
        npm ci
    - name: Run tests
      run: |
        cd lamsa-api
        npm test

  test-mobile:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - uses: actions/setup-node@v3
      with:
        node-version: '18'
    - name: Install dependencies
      run: |
        cd lamsa-mobile
        npm ci
    - name: Run tests
      run: |
        cd lamsa-mobile
        npm test
```

## 8. Documentation

Update these references in your documentation:
- Clone URLs in README
- Repository links in documentation
- CI/CD badges (if applicable)

## Current Repository Status

- Total commits: 2 (initial rename + README update)
- Current branch: main
- Files: 700+ files across all projects
- Ready to push: Yes

## Next Steps

1. Create the GitHub repository
2. Add the remote and push
3. Configure security settings
4. Invite team members
5. Set up CI/CD (optional)
6. Create initial issues for known tasks

---

Generated: $(date)