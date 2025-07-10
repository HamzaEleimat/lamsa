# Environment Variables Setup Guide

## Overview
This guide explains how to securely set up environment variables for the BeautyCort application.

## Security Best Practices

1. **Never commit real API keys** to version control
2. **Use .env files** for local development (already in .gitignore)
3. **Use platform environment variables** for production deployments
4. **Rotate compromised keys** immediately
5. **Use different keys** for development, staging, and production

## Setup Instructions

### 1. Local Development

For each project directory, copy the `.env.example` file to `.env`:

```bash
# API Backend
cd beautycort-api
cp .env.example .env

# Mobile App
cd ../beautycort-mobile
cp .env.example .env

# Web App
cd ../beautycort-web
cp .env.example .env
```

### 2. Fill in Your API Keys

Edit each `.env` file and replace placeholder values with your actual keys:

#### API Backend (.env)
- `SUPABASE_URL`: Your Supabase project URL
- `SUPABASE_SERVICE_KEY`: Service role key (keep this secret!)
- `JWT_SECRET`: Generate a secure random string
- `TAP_SECRET_KEY`: From Tap Payment dashboard
- `TWILIO_*`: From Twilio console

#### Mobile App (.env)
- `EXPO_PUBLIC_SUPABASE_URL`: Same as API
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`: Public anon key (safe for frontend)

#### Web App (.env)
- `NEXT_PUBLIC_SUPABASE_URL`: Same as API
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Public anon key (safe for frontend)

### 3. Production Deployment

For production environments, set environment variables in your hosting platform:

#### Vercel (Web)
```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
```

#### Expo EAS (Mobile)
Add to `eas.json` or use EAS Secrets:
```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL
```

#### Heroku/Railway (API)
```bash
heroku config:set SUPABASE_URL=your_url_here
heroku config:set SUPABASE_SERVICE_KEY=your_key_here
```

## Key Rotation

If keys are compromised:

1. **Immediately** regenerate keys in Supabase dashboard
2. Update all `.env` files locally
3. Update production environment variables
4. Restart all services

## Environment Variable Reference

### Shared Variables
- `SUPABASE_URL`: Your Supabase project URL
- `APP_NAME`: Application name (BeautyCort)
- `DEFAULT_LANGUAGE`: Default language (ar/en)
- `CURRENCY`: Currency code (JOD)

### Backend Only
- `SUPABASE_SERVICE_KEY`: Admin access (never expose to frontend!)
- `JWT_SECRET`: For token signing
- `PORT`: Server port
- Payment, SMS, and email credentials

### Frontend Only
- `EXPO_PUBLIC_*` / `NEXT_PUBLIC_*`: Public variables safe for client-side

## Troubleshooting

1. **"Missing environment variable" error**: Ensure .env file exists and is properly formatted
2. **Keys not working**: Check you're using the correct key type (anon vs service)
3. **Can't connect to Supabase**: Verify URL format includes https://

## Security Checklist

- [ ] All .env files are in .gitignore
- [ ] No real keys in .env.example files
- [ ] Different keys for dev/staging/prod
- [ ] Service keys only on backend
- [ ] Regular key rotation schedule
- [ ] Team uses secure password manager for sharing