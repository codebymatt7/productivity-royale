# Database Setup Instructions

## Required SQL Migrations

Run these SQL scripts in your Supabase SQL Editor in order:

### 1. Create journal_logs table
**File:** `supabase/create_journal_table.sql`

This creates the table for Daily Chronicle entries. **You must run this** or you'll get "table not found" errors when trying to save affirmations/reflections.

### 2. Add value column to logs table
**File:** `supabase/add_value_column.sql`

This adds the `value` column needed for storing specific amounts (pages read, people met, hours slept).

### 3. Add display_name column
**File:** `supabase/add_display_name.sql`

This adds the `display_name` column for custom leaderboard names.

### 4. Fix RLS policies
**File:** `supabase/fix_rls_complete.sql`

This ensures the INSERT policy exists for user signups.

## How to Run

1. Go to Supabase Dashboard → SQL Editor
2. Click "New Query"
3. Copy and paste the contents of each SQL file
4. Click "Run" (or press Cmd/Ctrl + Enter)
5. Verify success message

## Order Matters

Run them in this order:
1. `create_journal_table.sql`
2. `add_value_column.sql`
3. `add_display_name.sql`
4. `fix_rls_complete.sql`

