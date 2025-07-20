# Vercel Setup Guide for Lamsa Web Dashboard

This guide walks you through deploying the Lamsa web dashboard (Next.js) to Vercel.

## Overview

The Lamsa web dashboard is a Next.js application for service providers to manage their bookings, services, and profile. Vercel provides:

- **Automatic deployments** from Git
- **Global CDN** for fast content delivery
- **Serverless functions** for API routes
- **Environment variable management**
- **Custom domain support**
- **Built-in analytics and monitoring**

## Prerequisites

Before starting, ensure you have:
- [x] Supabase production database set up
- [x] Upstash Redis configured
- [x] GitHub repository with your code
- [ ] Vercel account
- [ ] Domain name (optional)

## Step 1: Create Vercel Account

1. Go to [vercel.com](https://vercel.com)
2. Sign up with your GitHub account (recommended)
3. This will automatically connect your GitHub repositories

## Step 2: Prepare Your Web Dashboard

Let's first check the current state of your web dashboard:

### Check Package.json

```bash
cd lamsa-web
cat package.json
```

### Install Dependencies

```bash
npm install
```

### Test Local Build

```bash
npm run build
npm run dev
```

## Step 3: Create Vercel Project

### Option A: Using Vercel CLI (Recommended)

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**:
   ```bash
   vercel login
   ```

3. **Deploy from web dashboard directory**:
   ```bash
   cd lamsa-web
   vercel
   ```

4. **Follow the prompts**:
   ```
   ? Set up and deploy "lamsa-web"? [Y/n] y
   ? Which scope do you want to deploy to? [Your username]
   ? Link to existing project? [y/N] n
   ? What's your project's name? lamsa-web
   ? In which directory is your code located? ./
   ```

### Option B: Using Vercel Dashboard

1. **Access Vercel Dashboard**:
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"

2. **Import Git Repository**:
   - Select your GitHub repository
   - Choose the `lamsa-web` directory
   - Click "Import"

3. **Configure Project Settings**:
   ```
   Project Name: lamsa-web
   Framework: Next.js
   Root Directory: lamsa-web
   Build Command: npm run build
   Output Directory: .next
   Install Command: npm install
   ```

## Step 4: Configure Environment Variables

### Required Environment Variables

In Vercel dashboard, go to your project → Settings → Environment Variables:

```bash
# Database Configuration
NEXT_PUBLIC_SUPABASE_URL=https://libwbqgceovhknljmuvh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key_here
SUPABASE_SERVICE_KEY=your_service_key_here

# Redis Configuration
REDIS_URL=redis://eu1-driven-cat-12345.upstash.io:6379
REDIS_PASSWORD=your_redis_password_here
REDIS_TLS=true

# App Configuration
NEXT_PUBLIC_APP_URL=https://lamsa-web.vercel.app
NEXT_PUBLIC_API_URL=https://your-api-domain.com
NODE_ENV=production

# Authentication
NEXTAUTH_URL=https://lamsa-web.vercel.app
NEXTAUTH_SECRET=your_nextauth_secret_here

# Optional: Analytics
NEXT_PUBLIC_ANALYTICS_ID=your_analytics_id_here
```

### Environment Variable Types

For each variable, set the appropriate environment:
- **Production**: Live environment
- **Preview**: Branch deployments
- **Development**: Local development

## Step 5: Configure Custom Domain (Optional)

### Add Domain to Vercel

1. **Go to Project Settings**:
   - Navigate to your project → Settings → Domains

2. **Add Domain**:
   ```
   Domain: dashboard.lamsa.com
   ```

3. **Configure DNS**:
   - Add CNAME record: `dashboard.lamsa.com` → `cname.vercel-dns.com`
   - Or A record: `dashboard.lamsa.com` → `76.76.19.19`

### SSL Certificate

Vercel automatically provides SSL certificates for custom domains.

## Step 6: Configure Build Settings

### Next.js Configuration

Create or update `next.config.js`:

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  
  // Image optimization
  images: {
    domains: ['libwbqgceovhknljmuvh.supabase.co'],
    formats: ['image/webp', 'image/avif'],
  },

  // Internationalization
  i18n: {
    locales: ['en', 'ar'],
    defaultLocale: 'en',
  },

  // Environment variables
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },

  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
    ];
  },

  // Redirects
  async redirects() {
    return [
      {
        source: '/',
        destination: '/dashboard',
        permanent: false,
      },
    ];
  },
};

module.exports = nextConfig;
```

### Vercel Configuration

Create `vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "outputDirectory": ".next",
  "installCommand": "npm install",
  "functions": {
    "pages/api/**/*.js": {
      "maxDuration": 30
    }
  },
  "regions": ["fra1"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

## Step 7: Optimize for Production

### Performance Optimization

1. **Image Optimization**:
   ```javascript
   // pages/components/ImageOptimized.js
   import Image from 'next/image';
   
   const OptimizedImage = ({ src, alt, ...props }) => {
     return (
       <Image
         src={src}
         alt={alt}
         placeholder="blur"
         blurDataURL="data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAhEAACAQMDBQAAAAAAAAAAAAABAgMABAUGIWGRkqGx0f/EABUBAQEAAAAAAAAAAAAAAAAAAAMF/8QAGhEAAgIDAAAAAAAAAAAAAAAAAAECEgMRkf/aAAwDAQACEQMRAD8AltJagyeH0AthI5xdrLcNM91BF5pX2HaH9bcfaSXWGaRmknyJckliyjqTzSlT54b6bk+h0R//2Q=="
         quality={85}
         {...props}
       />
     );
   };
   ```

2. **Bundle Analysis**:
   ```bash
   npm install @next/bundle-analyzer
   ```

   Update `next.config.js`:
   ```javascript
   const withBundleAnalyzer = require('@next/bundle-analyzer')({
     enabled: process.env.ANALYZE === 'true',
   });
   
   module.exports = withBundleAnalyzer(nextConfig);
   ```

### Database Optimization

```javascript
// lib/supabase.js
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-client-info': 'lamsa-web@1.0.0',
    },
  },
});
```

## Step 8: Set Up Monitoring

### Vercel Analytics

1. **Enable Analytics**:
   - Go to project → Settings → Analytics
   - Enable Web Analytics
   - Add analytics ID to environment variables

2. **Add Analytics Component**:
   ```javascript
   // pages/_app.js
   import { Analytics } from '@vercel/analytics/react';
   
   function MyApp({ Component, pageProps }) {
     return (
       <>
         <Component {...pageProps} />
         <Analytics />
       </>
     );
   }
   ```

### Error Monitoring

```javascript
// lib/errorTracking.js
export const trackError = (error, context = {}) => {
  console.error('Error:', error, context);
  
  // Send to monitoring service
  if (process.env.NODE_ENV === 'production') {
    // You can integrate with Sentry, LogRocket, etc.
    fetch('/api/errors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        error: error.message,
        stack: error.stack,
        context,
        timestamp: new Date().toISOString(),
      }),
    });
  }
};
```

## Step 9: Configure Deployment

### Automatic Deployments

Vercel automatically deploys:
- **Production**: When you push to `main` branch
- **Preview**: When you push to other branches
- **Development**: For local development

### Manual Deployment

```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel

# Deploy specific branch
vercel --prod --branch=staging
```

### Build and Deploy Hooks

```javascript
// vercel.json
{
  "github": {
    "silent": true
  },
  "builds": [
    {
      "src": "package.json",
      "use": "@vercel/next"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/$1"
    }
  ]
}
```

## Step 10: Testing and Validation

### Pre-deployment Checklist

- [ ] Environment variables configured
- [ ] Database connection working
- [ ] Redis connection working
- [ ] Authentication flow working
- [ ] API endpoints accessible
- [ ] Images loading correctly
- [ ] RTL layout working for Arabic
- [ ] Mobile responsive design
- [ ] Performance optimization applied

### Testing Scripts

```bash
# Test build locally
npm run build
npm run start

# Test with production environment
NODE_ENV=production npm run dev

# Analyze bundle size
ANALYZE=true npm run build
```

## Step 11: Post-Deployment

### Domain Configuration

1. **Update API URLs**:
   - Update your API to whitelist the new domain
   - Update CORS settings
   - Update redirect URLs

2. **Update Mobile App**:
   - Update API base URL in mobile app
   - Update web dashboard URLs

### Security Configuration

```javascript
// middleware.js
import { NextResponse } from 'next/server';

export function middleware(request) {
  // Add security headers
  const response = NextResponse.next();
  
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

export const config = {
  matcher: '/((?!api|_next/static|_next/image|favicon.ico).*)',
};
```

## Troubleshooting

### Common Issues

1. **Build Failures**:
   - Check environment variables
   - Verify dependencies in package.json
   - Review build logs in Vercel dashboard

2. **Runtime Errors**:
   - Check function logs
   - Verify API endpoints
   - Test database connectivity

3. **Performance Issues**:
   - Analyze bundle size
   - Optimize images
   - Review Core Web Vitals

### Debug Commands

```bash
# Check deployment status
vercel ls

# View logs
vercel logs

# Inspect domain configuration
vercel domains

# Check environment variables
vercel env ls
```

## Cost Estimation

### Vercel Pricing (2024)

```
Hobby (Free):
- 100GB bandwidth/month
- 1 team member
- Unlimited personal projects

Pro ($20/month):
- 1TB bandwidth/month
- 10 team members
- Advanced analytics
- Custom domains

Enterprise (Custom):
- Unlimited bandwidth
- Advanced security
- Priority support
```

### Estimated Monthly Costs

```
Development: $0 (Hobby plan)
Production (small): $20/month (Pro plan)
Production (large): $50-200/month (Pro + overages)
```

## Next Steps

1. ✅ Create Vercel account
2. ✅ Configure project settings
3. ✅ Add environment variables
4. ✅ Deploy to production
5. ✅ Configure custom domain
6. ✅ Set up monitoring
7. ✅ Test functionality
8. ✅ Update mobile app URLs

Your Lamsa web dashboard will be live at: `https://lamsa-web.vercel.app`

## Manual Actions Required

1. **Create Upstash Redis**:
   - Sign up at upstash.com
   - Create database in Frankfurt region
   - Copy connection URL and password

2. **Create Vercel Project**:
   - Sign up at vercel.com
   - Import GitHub repository
   - Configure environment variables

3. **Domain Setup** (optional):
   - Configure DNS records
   - Update environment variables

4. **Testing**:
   - Test all functionality
   - Verify performance
   - Update mobile app with new URLs