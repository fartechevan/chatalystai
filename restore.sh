#!/bin/bash
# Supabase Database Restoration Script
# Generated: 2025-06-13T08:05:00.984Z

set -e  # Exit on any error

echo "🚀 Starting Supabase database restoration..."

# Check if supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI is not installed. Please install it first:"
    echo "npm install -g supabase"
    exit 1
fi

# Check if we're in a Supabase project
if [ ! -f "supabase/config.toml" ]; then
    echo "❌ Not in a Supabase project directory. Please run 'supabase init' first."
    exit 1
fi

echo "📋 Restoring schema..."
supabase db reset

echo "📊 Loading schema..."
psql -h localhost -p 54322 -U postgres -d postgres -f complete_schema.sql

echo "📈 Loading data..."
for file in data/*.sql; do
    if [ -f "$file" ]; then
        echo "  Loading $(basename "$file")..."
        psql -h localhost -p 54322 -U postgres -d postgres -f "$file"
    fi
done

echo "✅ Database restoration complete!"
echo "🔗 Your local Supabase is available at: http://localhost:54323"
echo "📊 Database URL: postgresql://postgres:postgres@localhost:54322/postgres"
