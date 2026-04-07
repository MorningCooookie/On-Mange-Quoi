# Substitution History Table Schema

## SQL Migration

Run this in Supabase SQL Editor to create the substitution_history table:

```sql
-- Create substitution_history table for tracking meal substitutions
CREATE TABLE IF NOT EXISTS substitution_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  meal_id TEXT NOT NULL,
  substitute_id TEXT NOT NULL,
  used_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Add foreign key constraint if users table exists
  CONSTRAINT fk_user_id FOREIGN KEY (user_id) 
    REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create indexes for fast lookups
CREATE INDEX idx_substitution_user ON substitution_history(user_id);
CREATE INDEX idx_substitution_meal ON substitution_history(user_id, meal_id);
CREATE INDEX idx_substitution_date ON substitution_history(used_date DESC);

-- Enable RLS (Row Level Security)
ALTER TABLE substitution_history ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only see their own history
CREATE POLICY "Users see their own substitution history"
  ON substitution_history
  FOR SELECT
  USING (auth.uid() = user_id);

-- RLS Policy: Only authenticated users can insert
CREATE POLICY "Users can insert own substitution history"
  ON substitution_history
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);
```

## Table Structure

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Supabase user ID |
| meal_id | TEXT | ID of original meal that triggered substitution |
| substitute_id | TEXT | ID of the meal used as substitute |
| used_date | DATE | Date the substitution was used |
| created_at | TIMESTAMP | When the record was created |

## Query Examples

```sql
-- Get all substitutions for a user in last 14 days
SELECT * FROM substitution_history
WHERE user_id = $1 
AND used_date > CURRENT_DATE - INTERVAL '14 days'
ORDER BY used_date DESC;

-- Get substitution history for a specific meal
SELECT * FROM substitution_history
WHERE user_id = $1 
AND meal_id = $2
ORDER BY used_date DESC;

-- Get recent substitutes used
SELECT substitute_id, COUNT(*) as times_used, MAX(used_date) as last_used
FROM substitution_history
WHERE user_id = $1
AND used_date > CURRENT_DATE - INTERVAL '14 days'
GROUP BY substitute_id
ORDER BY last_used DESC;
```
