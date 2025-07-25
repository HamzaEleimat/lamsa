# Database Migrations

This directory contains all database migrations for the Lamsa platform.

## Migration Files

- `20250122000001_initial_schema.sql` - Core database schema with all tables
- `20250122000002_add_performance_functions.sql` - Performance optimization functions
- `20250122000003_row_level_security.sql` - Security policies and RLS rules
- `20250122000004_seed_data.sql` - Initial seed data (development only)

## Running Migrations

### Quick Start
```bash
# From project root
./setup-database.sh
```

### Manual Commands
```bash
# Run all pending migrations
supabase db push

# Reset database (warning: drops all data!)
supabase db reset

# Check migration status
supabase migration list

# Create a new migration
supabase migration new <description>
```

## Creating New Migrations

1. Create a new migration file:
   ```bash
   npm run db:new <description>
   # or
   supabase migration new <description>
   ```

2. Write your SQL in the generated file

3. Test locally:
   ```bash
   supabase db reset
   ```

4. Commit and push - CI/CD will handle deployment

## Best Practices

1. **Always test migrations locally first** using `supabase db reset`
2. **Make migrations idempotent** - use `IF NOT EXISTS` and `IF EXISTS`
3. **Never modify existing migrations** - create new ones instead
4. **Include rollback logic** when possible
5. **Keep migrations focused** - one logical change per migration

## Troubleshooting

### Migration Failed
- Check SQL syntax
- Ensure dependencies exist (tables, columns, etc.)
- Verify permissions

### Can't Connect
- Ensure you're linked: `supabase link --project-ref <id>`
- Check credentials in `.env` files

### Local Development
- Start local Supabase: `supabase start`
- Access dashboard: http://localhost:54323