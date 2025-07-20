# 🔒 Secure Environment Setup Guide

## ⚠️ CRITICAL SECURITY WARNING

After a security audit, it was discovered that **production secrets were exposed** in the repository. This guide ensures this never happens again.

## 🚨 IMMEDIATE ACTION REQUIRED

### 1. ALL EXPOSED CREDENTIALS MUST BE ROTATED

If you have access to the production systems, **immediately rotate these credentials**:

- **Supabase Service Key** (CRITICAL - Full database access)
- **JWT Secrets** (All environments)
- **Database Passwords**
- **Redis Passwords**
- **API Keys** (Tap, Twilio, etc.)

### 2. NEVER COMMIT PRODUCTION SECRETS

**Production secrets must NEVER be committed to git.** Use environment variables or secure secret management systems.

## 🔧 Secure Environment Setup

### For Development

1. **Copy the example files:**
```bash
# API
cp lamsa-api/.env.example lamsa-api/.env

# Mobile
cp lamsa-mobile/.env.example lamsa-mobile/.env

# Web
cp lamsa-web/.env.example lamsa-web/.env
```

2. **Generate secure JWT secrets:**
```bash
# Generate a secure JWT secret
openssl rand -hex 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

3. **Set up your development Supabase project:**
   - Create a new Supabase project for development
   - Use the development project keys in your .env files
   - **Never use production keys in development**

### For Production

1. **Use environment variables, not .env files:**
```bash
# Example for Railway/Heroku/Vercel
export JWT_SECRET="your-secure-64-character-secret"
export SUPABASE_SERVICE_KEY="your-supabase-service-key"
export REDIS_PASSWORD="your-redis-password"
```

2. **Use secure secret management:**
   - **AWS**: AWS Secrets Manager
   - **Azure**: Azure Key Vault
   - **GCP**: Google Secret Manager
   - **Heroku**: Config Vars
   - **Railway**: Environment Variables
   - **Vercel**: Environment Variables

3. **Set up proper access controls:**
   - Use IAM roles for database access
   - Implement least privilege access
   - Enable audit logging
   - Use VPC/private networks where possible

## 🔐 Environment Variable Security Checklist

### ✅ DO:
- Use strong, randomly generated secrets (32+ characters)
- Use separate environments (dev, staging, prod)
- Rotate secrets regularly
- Use environment variables or secret management systems
- Validate all environment variables on startup
- Use different database instances for each environment

### ❌ NEVER:
- Commit .env files with real secrets
- Use the same secrets across environments
- Use weak or predictable secrets
- Share production credentials
- Store secrets in plain text files
- Use default or example values in production

## 🛡️ Security Best Practices

### 1. Environment Isolation
```bash
# Development
DATABASE_URL=postgres://localhost:5432/lamsa_dev
JWT_SECRET=dev-secret-32-chars-minimum

# Production (via environment variables)
DATABASE_URL=postgres://prod-host:5432/lamsa_prod
JWT_SECRET=prod-secret-64-chars-minimum
```

### 2. Secret Rotation Schedule
- **JWT Secrets**: Every 90 days
- **Database Passwords**: Every 30 days
- **API Keys**: Every 60 days
- **Service Keys**: Every 30 days

### 3. Access Control
- Database users with minimum required permissions
- API keys with restricted scopes
- Time-limited access tokens
- IP-based restrictions where possible

### 4. Monitoring & Alerting
- Monitor for failed authentication attempts
- Alert on unusual database access patterns
- Log all API key usage
- Set up alerts for credential rotation

## 🔍 Security Validation

### Environment Validation Script
The project includes environment validation in `lamsa-api/src/utils/environment-validation.ts`:

```typescript
import { initializeEnvironment } from './src/utils/environment-validation';

// This will validate all environment variables and fail fast
const config = initializeEnvironment();
```

### Manual Security Check
```bash
# Check for exposed secrets
npm run security:check

# Validate environment configuration
npm run env:validate

# Check for weak secrets
npm run security:audit
```

## 🚀 Deployment Security

### 1. Pre-deployment Checklist
- [ ] All secrets are in environment variables
- [ ] No .env files are committed
- [ ] All secrets are rotated from development
- [ ] Database users have minimal permissions
- [ ] API keys have restricted scopes
- [ ] CORS is configured correctly
- [ ] Rate limiting is enabled
- [ ] SSL/TLS is enforced

### 2. Post-deployment Verification
- [ ] Application starts without errors
- [ ] Database connectivity works
- [ ] API authentication works
- [ ] No secrets are exposed in logs
- [ ] All endpoints require proper authentication
- [ ] Rate limiting is working

## 🆘 Emergency Response

### If Secrets Are Exposed:
1. **Immediately rotate all exposed credentials**
2. **Remove the exposure from git history**
3. **Check access logs for unauthorized usage**
4. **Monitor for suspicious activity**
5. **Update all affected systems**
6. **Document the incident**

### Git History Cleanup:
```bash
# Install BFG Repo Cleaner
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# Remove all .env files from history
java -jar bfg-1.14.0.jar --delete-files .env
java -jar bfg-1.14.0.jar --delete-files .env.production

# Clean up
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push (CAUTION: This rewrites history)
git push --force-with-lease
```

## 📞 Security Contacts

- **Security Team**: security@lamsa.com
- **DevOps Team**: devops@lamsa.com
- **Emergency**: +962-xxx-xxx-xxx

## 📚 Additional Resources

- [OWASP Environment Security](https://owasp.org/www-project-top-ten/2017/A6_2017-Security_Misconfiguration)
- [12 Factor App - Config](https://12factor.net/config)
- [Supabase Security Best Practices](https://supabase.com/docs/guides/auth/security)
- [JWT Security Best Practices](https://auth0.com/blog/a-look-at-the-latest-draft-for-jwt-bcp/)

---

**Remember: Security is everyone's responsibility. When in doubt, ask the security team.**