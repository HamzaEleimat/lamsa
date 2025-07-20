# 🚨 CRITICAL SECURITY FIX WALKTHROUGH

## Step 1: Rotate Your Supabase Service Key (DO THIS IMMEDIATELY!)

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard
   - Select your project: `libwbqgceovhknljmuvh`

2. **Generate New Service Role Key**
   - Go to Settings → API
   - Find "Service role key" section
   - Click "Regenerate key"
   - Copy the new key (keep it secure!)

3. **Update Your Local Development Environment**
   - DO NOT put the new key in .env file!
   - Instead, set it as an environment variable:
   
   ```bash
   # For Linux/Mac (add to ~/.bashrc or ~/.zshrc):
   export SUPABASE_SERVICE_KEY="your-new-service-key-here"
   
   # For Windows (PowerShell):
   $env:SUPABASE_SERVICE_KEY="your-new-service-key-here"
   ```

## Step 2: Update Your Code to Use Environment Variables

The code needs to be updated to read the service key from environment variables instead of .env file.

### File: lamsa-api/src/config/supabase.ts

Look at line 18 where it reads:
```typescript
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;
```

This is already correct! It reads from environment variables.

## Step 3: Set Up Production Environment Variables

For deployment (Vercel, Heroku, etc.):
1. Go to your hosting provider's dashboard
2. Add these environment variables:
   - `SUPABASE_SERVICE_KEY` = [your new service key]
   - `JWT_SECRET` = [generate new one with: openssl rand -base64 32]

## Step 4: Commit the Security Fixes

```bash
# Check what's ready to commit
git status

# Commit the security improvements
git commit -m "Security: Remove exposed keys and add security documentation"

# Push to GitHub
git push origin main
```

## Step 5: Clean Git History (If Already Pushed)

If you've already pushed the exposed keys to GitHub:

```bash
# Install BFG Repo-Cleaner
wget https://repo1.maven.org/maven2/com/madgag/bfg/1.14.0/bfg-1.14.0.jar

# Remove sensitive files from history
java -jar bfg-1.14.0.jar --delete-files customer_token.txt
java -jar bfg-1.14.0.jar --delete-files provider_token.txt
java -jar bfg-1.14.0.jar --delete-files otp.txt

# Clean up
cd lamsa
git reflog expire --expire=now --all
git gc --prune=now --aggressive

# Force push cleaned history
git push --force
```

## Step 6: Update Team Members

Notify your team:
- Service keys have been rotated
- They need to pull the latest changes
- They need to set up environment variables locally

## Files That Were Modified:

1. **lamsa-api/.env** - Service key removed, JWT updated
2. **lamsa-api/.gitignore** - Added rules to prevent future leaks
3. **lamsa-api/.env.example** - Template for developers
4. **SECURITY.md** - Security guidelines
5. **Deleted files**: customer_token.txt, provider_token.txt, otp.txt
