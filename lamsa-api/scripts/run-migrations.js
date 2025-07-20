#!/usr/bin/env node

/**
 * @file run-migrations.js
 * @description Script to run database migrations
 * @author BeautyCort Development Team
 * @date Created: 2025-01-14
 * @copyright BeautyCort 2025
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// ANSI color codes for console output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function runMigrations() {
  // Check for required environment variables
  const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_SERVICE_KEY'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    log('❌ Missing required environment variables:', 'red');
    missingVars.forEach(varName => log(`   - ${varName}`, 'red'));
    log('\n💡 Please set these in your .env file or environment', 'yellow');
    process.exit(1);
  }

  // Initialize Supabase client with service key for admin operations
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  );

  log('🚀 BeautyCort Database Migration Tool', 'bright');
  log('=====================================\n', 'bright');

  // Migration files directory
  const migrationsDir = path.join(__dirname, '..', 'database', 'migrations');
  
  if (!fs.existsSync(migrationsDir)) {
    log('❌ Migrations directory not found: ' + migrationsDir, 'red');
    process.exit(1);
  }

  // Get all SQL files in migrations directory
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort(); // Ensure files are run in order

  if (migrationFiles.length === 0) {
    log('⚠️  No migration files found', 'yellow');
    return;
  }

  log(`Found ${migrationFiles.length} migration file(s):\n`, 'cyan');
  migrationFiles.forEach(file => log(`   📄 ${file}`, 'blue'));
  log('');

  // Create migrations tracking table if it doesn't exist
  const createMigrationsTable = `
    CREATE TABLE IF NOT EXISTS migrations (
      id SERIAL PRIMARY KEY,
      filename VARCHAR(255) UNIQUE NOT NULL,
      executed_at TIMESTAMPTZ DEFAULT NOW(),
      execution_time_ms INTEGER,
      success BOOLEAN DEFAULT TRUE,
      error_message TEXT
    );
  `;

  try {
    log('📊 Creating migrations tracking table...', 'yellow');
    const { error: tableError } = await supabase.rpc('exec_sql', {
      sql: createMigrationsTable
    });

    if (tableError) {
      // If RPC doesn't exist, we'll need to run this manually
      log('⚠️  Note: Could not create migrations table automatically.', 'yellow');
      log('   Please run the following SQL manually:', 'yellow');
      log(createMigrationsTable, 'cyan');
    }
  } catch (err) {
    log('⚠️  Could not create migrations table: ' + err.message, 'yellow');
  }

  // Process each migration file
  for (const migrationFile of migrationFiles) {
    log(`\n🔄 Processing: ${migrationFile}`, 'bright');
    
    const filePath = path.join(migrationsDir, migrationFile);
    const sql = fs.readFileSync(filePath, 'utf8');
    
    const startTime = Date.now();
    
    try {
      // Check if migration was already executed
      const { data: existing } = await supabase
        .from('migrations')
        .select('*')
        .eq('filename', migrationFile)
        .single();

      if (existing) {
        log(`   ✓ Already executed on ${new Date(existing.executed_at).toLocaleString()}`, 'green');
        continue;
      }
    } catch (err) {
      // Table might not exist or migration not found - proceed with execution
    }

    // For Supabase, we need to execute SQL differently
    // Since Supabase doesn't expose direct SQL execution via the JS client,
    // we'll output instructions for manual execution
    
    log(`\n   ⚠️  Supabase requires manual SQL execution.`, 'yellow');
    log(`   📋 Please run the following migration in your Supabase SQL Editor:`, 'yellow');
    log(`\n   1. Go to: ${process.env.SUPABASE_URL}/project/_/sql`, 'cyan');
    log(`   2. Copy and paste the contents of: ${filePath}`, 'cyan');
    log(`   3. Execute the SQL`, 'cyan');
    log(`   4. Record the migration:`, 'cyan');
    log(`\n   INSERT INTO migrations (filename) VALUES ('${migrationFile}');`, 'magenta');
  }

  log('\n✅ Migration instructions complete!', 'green');
  log('\n📝 Next steps:', 'bright');
  log('   1. Execute each migration file in your Supabase SQL Editor', 'cyan');
  log('   2. Test your application to ensure migrations were successful', 'cyan');
  log('   3. Commit the migration tracking records', 'cyan');
}

// Run migrations
runMigrations().catch(err => {
  log('\n❌ Migration failed:', 'red');
  log(err.message, 'red');
  process.exit(1);
});