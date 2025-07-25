# Supabase Setup Guide for Lamsa

This guide walks you through connecting your Lamsa application to Supabase.

## Prerequisites

- Node.js installed (v16+)
- A Supabase account (free tier is fine)
- Basic knowledge of SQL and environment variables

## Step 1: Create Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign up/login
2. Click **"New Project"**
3. Fill in the project details:
   - **Organization**: Select or create one
   - **Project name**: `lamsa` (or your preferred name)
   - **Database Password**: Create a strong password and **save it securely**
   - **Region**: Choose **Frankfurt (eu-central-1)** for Middle East proximity
   - **Pricing Plan**: Start with **Free tier**

4. Click **"Create new project"** and wait 1-2 minutes for setup

## Step 2: Get Your API Keys

Once your project is created:

1. Go to **Settings → API** in the Supabase dashboard
2. Copy these values:
   - **Project URL**: `https://[your-project-ref].supabase.co`
   - **anon public**: Your public anonymous key (safe for client-side)
   - **service_role**: Your service role key (**⚠️ NEVER expose this publicly**)

## Step 3: Run Database Migrations

### Using Supabase CLI (Recommended)

We've automated the entire database setup process. Simply run:

```bash
# From the project root directory
./setup-database.sh
```

This script will:
- Check if Supabase CLI is installed
- Guide you through connecting to your project
- Run all migrations automatically
- Provide clear next steps

#### Manual CLI Commands

If you prefer to run commands manually:

```bash
# Install Supabase CLI
npm install -g supabase

# Login to Supabase (optional, for remote projects)
supabase login

# Link your project
supabase link --project-ref [your-project-ref]

# Run migrations
supabase db push

# Or reset database (drops all data)
supabase db reset
```

### Alternative: Using Supabase Dashboard

If you can't use the CLI, you can still run migrations manually:

1. In Supabase dashboard, go to **SQL Editor**
2. Click **"New query"**
3. Copy the content from each file in `supabase/migrations/` in order:
   - First: `20250122000001_initial_schema.sql`
   - Second: `20250122000002_add_performance_functions.sql`
   - Third: `20250122000003_row_level_security.sql`
   - Fourth (optional): `20250122000004_seed_data.sql`

⚠️ **Note**: Manual migration is error-prone. We strongly recommend using the CLI method.

## Step 4: Configure Environment Variables

### 4.1 API Configuration (`lamsa-api/.env`)

Create `.env` file in the `lamsa-api` directory:

```bash
cd lamsa-api
cp .env.example .env
```

Edit `.env` with your values:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# JWT Authentication (generate secure secret)
JWT_SECRET=your-secure-64-character-secret-here
JWT_EXPIRES_IN=7d
REFRESH_TOKEN_EXPIRES_IN=30d

# Supabase Configuration (from Step 2)
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_KEY=your-service-role-key-here

# Redis (optional - leave blank for development)
REDIS_URL=

# Default Settings
DEFAULT_CURRENCY=JOD
DEFAULT_LANGUAGE=ar
DEFAULT_TIMEZONE=Asia/Amman
```

Generate a secure JWT secret:
```bash
# On Linux/Mac:
openssl rand -hex 64

# Or use Node.js:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

### 4.2 Mobile App Configuration (`lamsa-mobile/.env`)

Create `.env` file in the `lamsa-mobile` directory:

```bash
cd ../lamsa-mobile
cp .env.example .env
```

Edit `.env`:

```env
# API Configuration
API_URL=http://localhost:3000/api

# Supabase Configuration
SUPABASE_URL=https://your-project-ref.supabase.co
SUPABASE_ANON_KEY=your-anon-key-here
```

### 4.3 Web Dashboard Configuration (`lamsa-web/.env.local`)

Create `.env.local` file in the `lamsa-web` directory:

```bash
cd ../lamsa-web
cp .env.example .env.local
```

Edit `.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

## Step 5: Enable Supabase Features

### 5.1 Enable Phone Authentication

1. In Supabase dashboard, go to **Authentication → Providers**
2. Enable **Phone** provider
3. Configure SMS settings (you'll need Twilio for production)
4. For testing, use Supabase's built-in SMS testing

### 5.2 Configure Storage (Optional)

1. Go to **Storage** in Supabase dashboard
2. Create buckets:
   - `avatars` - For user profile pictures
   - `provider-images` - For salon photos
   - `service-images` - For service photos

3. Set bucket policies to public or authenticated as needed

### 5.3 Enable Realtime (Optional)

1. Go to **Database → Replication**
2. Enable replication for tables:
   - `bookings` - For real-time booking updates
   - `notifications` - For push notifications

## Step 6: Test the Connection

### 6.1 Start the API Server

```bash
cd lamsa-api
npm install
npm run dev
```

You should see:
```
🚀 Server is running on http://localhost:3000
✅ Connected to Supabase successfully
```

### 6.2 Test Basic Operations

Test the health endpoint:
```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2025-07-21T12:00:00.000Z",
  "database": "connected"
}
```

### 6.3 Create a Test User

```bash
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0791234567",
    "name": "Test User",
    "email": "test@example.com"
  }'
```

## Step 7: Common Issues & Solutions

### Issue: "Missing required Supabase environment variables"
**Solution**: Ensure all three Supabase variables are set in `.env`

### Issue: "Database connection failed"
**Solution**: 
- Check your Supabase project is active
- Verify the URL and keys are correct
- Ensure your IP is not blocked (check Supabase dashboard logs)

### Issue: "relation does not exist"
**Solution**: Run the migrations in order, starting with `000_initial_schema.sql`

### Issue: "permission denied for schema public"
**Solution**: Use the service role key for admin operations

## Step 8: Production Checklist

Before going to production:

- [ ] Use strong, unique passwords for all services
- [ ] Enable RLS (Row Level Security) on all tables
- [ ] Set up proper backup strategy
- [ ] Configure rate limiting
- [ ] Enable SSL/TLS for all connections
- [ ] Set up monitoring and alerts
- [ ] Review and tighten security policies
- [ ] Test all authentication flows
- [ ] Configure proper CORS origins
- [ ] Set up error logging and tracking

## Next Steps

1. **Configure SMS Provider**: Set up Twilio for OTP verification
2. **Set up Payment Gateway**: Integrate Tap Payment for Jordan
3. **Configure Push Notifications**: Set up Expo push tokens
4. **Add Google Maps**: For location services
5. **Set up Redis**: For improved performance (production)

## Support

- Supabase Documentation: https://supabase.com/docs
- Supabase Discord: https://discord.supabase.com
- Project Issues: Create an issue in your repository

Remember to never commit `.env` files to version control!