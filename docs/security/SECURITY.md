# Security Best Practices for Lamsa

## 🚨 Critical Security Guidelines

### 1. **Never Commit Sensitive Data**
The following should NEVER be committed to version control:
- `.env` files (use `.env.example` as a template)
- API keys and secrets
- Service role keys (especially Supabase service keys)
- JWT tokens
- OTP codes
- Password files
- Private keys or certificates

### 2. **Environment Variables**
- **Development**: Use local `.env` files (already in .gitignore)
- **Production**: Use environment variables from your hosting provider
- **CI/CD**: Use secure secret management (GitHub Secrets, etc.)

### 3. **Supabase Security**
- **Anon Key**: Safe to use in client-side code (has RLS policies)
- **Service Key**: NEVER expose this key! Only use server-side
- **Row Level Security (RLS)**: Always enable on all tables

### 4. **JWT Security**
- Generate strong random secrets: `openssl rand -base64 32`
- Rotate secrets regularly
- Never use predictable or default secrets

### 5. **API Security Checklist**
- [ ] All `.env` files are in `.gitignore`
- [ ] No hardcoded secrets in code
- [ ] JWT secret is randomly generated
- [ ] Supabase service key is stored securely
- [ ] Input validation on all endpoints
- [ ] Rate limiting implemented
- [ ] CORS properly configured

### 6. **Mobile App Security**
- Use secure storage for tokens (AsyncStorage with encryption)
- Implement certificate pinning for production
- Obfuscate/minimize JavaScript bundles
- Use Expo's secure store for sensitive data

### 7. **Quick Security Audit Commands**
```bash
# Check for exposed secrets in git history
git log --all --full-history -- "**/.env"
git log --all --full-history -- "**/*token*"
git log --all --full-history -- "**/*key*"

# Search for hardcoded secrets
grep -r "SUPABASE_SERVICE_KEY" --exclude-dir=node_modules .
grep -r "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9" --exclude-dir=node_modules .
```

### 8. **If You've Exposed Secrets**
1. **Immediately rotate** all exposed keys
2. **Remove from history**: Use `git filter-branch` or BFG Repo-Cleaner
3. **Force push** cleaned history
4. **Notify team** about the security incident
5. **Audit logs** for any unauthorized access

### 9. **Recommended Tools**
- **git-secrets**: Prevents committing secrets
- **truffleHog**: Scans for secrets in git history
- **GitGuardian**: Automated secret detection

## 🔐 Security Contacts
For security vulnerabilities, please email: security@lamsa.com

## 📋 Security Checklist for New Developers
- [ ] Read this security guide
- [ ] Set up `.env` from `.env.example`
- [ ] Never commit `.env` files
- [ ] Generate new JWT secret for local development
- [ ] Request Supabase service key securely (never via chat/email)
- [ ] Enable 2FA on GitHub account
- [ ] Use GPG-signed commits
