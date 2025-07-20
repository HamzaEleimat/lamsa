# Database Migrations

## Overview

This directory contains database migration files for the Lamsa platform. Migrations should be run in order based on their filename.

## Migration Files

1. **v2_enhanced_provider_schema.sql** - Adds comprehensive provider features including:
   - Enhanced provider profiles
   - Multi-step onboarding tracking
   - Availability and scheduling system
   - Service management enhancements
   - Gallery and portfolio management
   - Certifications and awards
   - Prayer time integration
   - Ramadan scheduling

## How to Run Migrations

### Option 1: Using Supabase Dashboard (Recommended)

1. Log in to your Supabase project dashboard
2. Navigate to the SQL Editor
3. Open each migration file in order
4. Copy the entire contents
5. Paste into the SQL Editor
6. Click "Run" to execute
7. Verify successful execution

### Option 2: Using Supabase CLI

```bash
# Install Supabase CLI if not already installed
npm install -g supabase

# Link to your project
supabase link --project-ref your-project-ref

# Run migrations
supabase db push
```

### Option 3: Using the Migration Script

```bash
# From the lamsa-api directory
npm run migrate

# Or directly
node scripts/run-migrations.js
```

**Note:** The script will provide instructions for manual execution as Supabase requires SQL to be run through their interface.

## Migration Best Practices

1. **Always backup your database before running migrations**
2. **Test migrations in a development environment first**
3. **Run migrations in order** - they may depend on each other
4. **Document any manual steps** required after migration
5. **Track migration execution** in the migrations table

## Rollback Strategy

Each migration should have a corresponding rollback script. For v2_enhanced_provider_schema.sql, you would need to:

1. Drop all new tables in reverse order
2. Remove new columns from existing tables
3. Drop new enum types
4. Remove indexes

**Warning:** Rollbacks may result in data loss. Always backup before attempting.

## Environment-Specific Notes

### Development
- Use a separate Supabase project for development
- Test all migrations thoroughly
- Verify RLS policies work correctly

### Staging
- Mirror production environment closely
- Run full test suite after migrations
- Check performance impact

### Production
- Schedule migrations during low-traffic periods
- Have rollback plan ready
- Monitor application logs during and after migration
- Notify team before and after migration

## Troubleshooting

### Common Issues

1. **"Permission denied" errors**
   - Ensure you're using the service key, not anon key
   - Check RLS policies aren't blocking operations

2. **"Type already exists" errors**
   - Migration may have been partially applied
   - Check existing types with: `SELECT typname FROM pg_type WHERE typname LIKE 'business_type';`

3. **Foreign key violations**
   - Ensure referenced tables exist
   - Check data integrity before adding constraints

4. **Performance issues after migration**
   - Run `ANALYZE` on affected tables
   - Check query plans for missing indexes

## Migration Checklist

- [ ] Backup database
- [ ] Review migration SQL
- [ ] Test in development
- [ ] Document any manual steps
- [ ] Prepare rollback script
- [ ] Schedule maintenance window (if needed)
- [ ] Execute migration
- [ ] Verify application functionality
- [ ] Update migration tracking table
- [ ] Monitor performance
- [ ] Document completion

---

Last Updated: 2025-01-14