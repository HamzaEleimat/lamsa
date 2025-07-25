#!/bin/bash

# Lamsa Database Setup Script
# This script helps you set up the database schema in Supabase using Supabase CLI

set -e

echo "🚀 Lamsa Database Setup with Supabase CLI"
echo "========================================"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed."
    echo ""
    echo "Please install it using one of the following methods:"
    echo ""
    echo "Using npm (recommended):"
    echo "  npm install -g supabase"
    echo ""
    echo "Using Homebrew (macOS/Linux):"
    echo "  brew install supabase/tap/supabase"
    echo ""
    echo "Or download from: https://github.com/supabase/cli/releases"
    echo ""
    exit 1
fi

echo "✅ Supabase CLI is installed: $(supabase --version)"
echo ""

# Check if we're in the project root
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Error: supabase/config.toml not found."
    echo "Please run this script from the project root directory."
    exit 1
fi

# Function to check if environment variables are set
check_env() {
    if [ ! -f "lamsa-api/.env" ]; then
        echo "⚠️  Warning: lamsa-api/.env file not found."
        echo "You'll need to create it with your Supabase credentials."
        echo ""
        return 1
    fi
    
    # Check if service key is set
    if grep -q "SUPABASE_SERVICE_KEY=your-service-role-key-here" "lamsa-api/.env" || \
       grep -q "SUPABASE_SERVICE_KEY=$" "lamsa-api/.env"; then
        echo "⚠️  Warning: SUPABASE_SERVICE_KEY is not set in lamsa-api/.env"
        echo "You'll need to update it with your actual service key."
        echo ""
        return 1
    fi
    
    return 0
}

# Main menu
echo "What would you like to do?"
echo ""
echo "1) Set up a NEW Supabase project (local development)"
echo "2) Connect to an EXISTING Supabase project"
echo "3) Run migrations on connected project"
echo "4) Reset database (drops all data and reruns migrations)"
echo "5) Check migration status"
echo ""

read -p "Enter your choice (1-5): " choice

case $choice in
    1)
        echo ""
        echo "📦 Setting up local Supabase project..."
        echo ""
        
        # Start local Supabase
        supabase start
        
        echo ""
        echo "✅ Local Supabase is running!"
        echo ""
        
        # Get local Supabase URLs dynamically
        LOCAL_API_URL=$(supabase status --output json 2>/dev/null | jq -r .api_url || echo "http://localhost:54321")
        LOCAL_DASHBOARD_URL=$(supabase status --output json 2>/dev/null | jq -r .studio_url || echo "http://localhost:54323")
        
        echo "Dashboard: $LOCAL_DASHBOARD_URL"
        echo "API URL: $LOCAL_API_URL"
        echo ""
        echo "Default credentials:"
        echo "  Email: admin@example.com"
        echo "  Password: admin123"
        echo ""
        
        # Run migrations
        echo "Running migrations..."
        supabase db push
        
        echo ""
        echo "✅ Migrations completed!"
        echo ""
        echo "Next steps:"
        echo "1. Update lamsa-api/.env with local Supabase credentials:"
        echo "   SUPABASE_URL=$LOCAL_API_URL"
        echo "   SUPABASE_ANON_KEY=$(supabase status --output json | jq -r .auth.anon_key)"
        echo "   SUPABASE_SERVICE_KEY=$(supabase status --output json | jq -r .auth.service_role_key)"
        echo ""
        echo "2. Start the API server:"
        echo "   cd lamsa-api && npm run dev"
        ;;
        
    2)
        echo ""
        echo "🔗 Connecting to existing Supabase project..."
        echo ""
        
        if ! check_env; then
            echo "Please ensure you have:"
            echo "1. Created a Supabase project at https://app.supabase.com"
            echo "2. Copied your project credentials"
            echo ""
        fi
        
        read -p "Enter your project reference ID (e.g., abcdefghijklmnop): " project_ref
        
        if [ -z "$project_ref" ]; then
            echo "❌ Project reference ID is required"
            exit 1
        fi
        
        # Link to remote project
        supabase link --project-ref "$project_ref"
        
        echo ""
        echo "✅ Successfully linked to project: $project_ref"
        echo ""
        echo "You can now run migrations using option 3"
        ;;
        
    3)
        echo ""
        echo "🚀 Running migrations..."
        echo ""
        
        # Check if linked to a project
        if ! supabase db remote list &> /dev/null; then
            echo "❌ Not linked to any Supabase project."
            echo "Please run option 2 first to link to a project."
            exit 1
        fi
        
        # Run migrations
        supabase db push
        
        echo ""
        echo "✅ Migrations completed successfully!"
        echo ""
        
        if ! check_env; then
            echo "Don't forget to update your .env file with the correct credentials!"
        fi
        ;;
        
    4)
        echo ""
        echo "⚠️  WARNING: This will DROP all data and recreate the database!"
        echo ""
        read -p "Are you sure? (yes/no): " confirm
        
        if [ "$confirm" = "yes" ]; then
            echo ""
            echo "🔄 Resetting database..."
            
            # Reset database
            supabase db reset
            
            echo ""
            echo "✅ Database reset completed!"
            echo "All migrations have been rerun and seed data loaded."
        else
            echo "Cancelled."
        fi
        ;;
        
    5)
        echo ""
        echo "📊 Checking migration status..."
        echo ""
        
        # List migrations
        supabase migration list
        
        echo ""
        echo "To view a specific migration:"
        echo "  cat supabase/migrations/<migration_file>"
        ;;
        
    *)
        echo "Invalid choice. Please run the script again."
        exit 1
        ;;
esac

echo ""
echo "For more information, see:"
echo "- Supabase CLI docs: https://supabase.com/docs/guides/cli"
echo "- Project setup guide: SUPABASE_SETUP.md"