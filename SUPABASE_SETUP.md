# Supabase Configuration — On Mange Quoi

## Critical: Create the Preferences Table

The application expects a `preferences` table in your Supabase database. This table does not exist yet, which is why preferences are not saving.

### SQL: Create the Preferences Table

Run this SQL in your Supabase SQL Editor (go to SQL → New Query):

```sql
-- Create preferences table for dietary preferences
CREATE TABLE IF NOT EXISTS public.preferences (
  id BIGSERIAL PRIMARY KEY,
  profile_id BIGINT NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  allergies TEXT[] DEFAULT '{}',
  restrictions TEXT[] DEFAULT '{}',
  dislikes TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(profile_id, user_id)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS preferences_profile_id_idx ON public.preferences(profile_id);
CREATE INDEX IF NOT EXISTS preferences_user_id_idx ON public.preferences(user_id);

-- Enable RLS
ALTER TABLE public.preferences ENABLE ROW LEVEL SECURITY;

-- Policy 1: Users can view their own preferences
CREATE POLICY "Users can view their own preferences" ON public.preferences
  FOR SELECT USING (auth.uid() = user_id);

-- Policy 2: Users can insert their own preferences
CREATE POLICY "Users can insert their own preferences" ON public.preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Policy 3: Users can update their own preferences
CREATE POLICY "Users can update their own preferences" ON public.preferences
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy 4: Users can delete their own preferences
CREATE POLICY "Users can delete their own preferences" ON public.preferences
  FOR DELETE USING (auth.uid() = user_id);
```

### Steps to Execute:

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire SQL block above
5. Click **Run** (⚡ button)
6. Wait for success confirmation

### Verify the Table Was Created:

1. Click **Table Editor** in the left sidebar
2. Look for `preferences` table in the list
3. Click it to see the columns: `id`, `profile_id`, `user_id`, `allergies`, `restrictions`, `dislikes`, `created_at`, `updated_at`
4. Verify RLS is enabled (lock icon should appear next to the table name)

---

## What Happens Now

Once the table exists with proper RLS policies:

1. **PreferenceManager.savePreferences()** will successfully upsert dietary preferences
2. **PreferenceManager.loadPreferences()** will retrieve saved preferences for each profile
3. **Menu filtering** will work — dishes will be filtered based on allergies, restrictions, dislikes
4. **The warning banner** can be removed from index.html

---

## Troubleshooting

### Error: "42P01 — relation 'preferences' does not exist"
- The table wasn't created. Run the SQL above again.

### Error: "new row violates row level security policy"
- RLS policies weren't created correctly. Delete the table and run the full SQL block again.

### Error: "insert or update on table 'preferences' violates foreign key constraint"
- Make sure:
  - The user is logged in (has a valid auth session)
  - The profile exists in the profiles table
  - The profile_id matches a profile created by this user

### Preferences are blank after saving
- Check the browser console (F12 → Console tab) for error messages
- Make sure you're logged in and have created a profile first
- Try refreshing the page — preferences should load automatically

---

## Testing the Fix

After creating the table:

1. Go to https://onmangequoi.eu (or your staging URL)
2. Log in or create an account
3. Create a profile (if not already done)
4. Click "Mon compte ▾" → "Profil" → "Préférences"
5. Check an allergy (e.g., "Arachides")
6. Click "Sauvegarder"
7. You should see: ✅ "Succès — Préférences mises à jour"
8. Refresh the page
9. Open preferences again — the allergy should still be checked ✅

---

## Next: Remove the Warning Banner

Once preferences are saving successfully, remove line 65-68 from index.html:

```html
<!-- 🔧 Maintenance Banner -->
<div style="background:linear-gradient(90deg, #fef3c7 0%, #fcd34d 50%, #fef3c7 100%);border-bottom:2px solid #f59e0b;padding:0.75rem 1.5rem;text-align:center;color:#78350f;font-weight:600;font-size:0.9rem;font-family:'Work Sans', system-ui, sans-serif;letter-spacing:0.5px;">
  🔧 Amélioration en cours — Les préférences alimentaires peuvent ne pas se sauvegarder. Nous travaillons sur la stabilité du service.
</div>
```

This can be done once testing confirms preferences are persisting correctly.

---

## User Preferences Table (New Schema)

**Created:** 2026-04-06  
**Purpose:** Store user allergies and food dislikes per profile using structured JSONB format  

### Schema

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key (auto-generated) |
| user_id | UUID | Foreign key to auth.users (CASCADE on delete) |
| profile_id | TEXT | Profile identifier |
| hard_constraints | JSONB | Array of allergies/must-avoid items (default: []) |
| soft_preferences | JSONB | Array of dislikes/prefer-to-avoid items (default: []) |
| created_at | TIMESTAMP | Record creation time |
| updated_at | TIMESTAMP | Last update time |

**Constraints:** UNIQUE(user_id, profile_id)  
**RLS Status:** Enabled  
**Policies:** SELECT/INSERT/UPDATE restricted to authenticated user's own data

### SQL to Create Table

Run this in your Supabase SQL Editor:

```sql
-- user_preferences table
CREATE TABLE user_preferences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  profile_id TEXT NOT NULL,
  hard_constraints JSONB DEFAULT '[]'::jsonb,
  soft_preferences JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP DEFAULT now(),
  updated_at TIMESTAMP DEFAULT now(),
  UNIQUE(user_id, profile_id)
);

-- Enable RLS
ALTER TABLE user_preferences ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can only access their own preferences (SELECT)
CREATE POLICY "Users can access own preferences" ON user_preferences
  FOR SELECT USING (auth.uid() = user_id);

-- RLS Policy: Users can insert their own preferences
CREATE POLICY "Users can insert own preferences" ON user_preferences
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- RLS Policy: Users can update their own preferences
CREATE POLICY "Users can update own preferences" ON user_preferences
  FOR UPDATE USING (auth.uid() = user_id);
```

### Steps to Execute

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the SQL block above
5. Click **Run** (⚡ button)
6. Wait for success confirmation

### Verify Table Creation

1. Click **Table Editor** in the left sidebar
2. Look for `user_preferences` table in the list
3. Click it and confirm columns: id, user_id, profile_id, hard_constraints, soft_preferences, created_at, updated_at
4. Verify RLS is enabled (lock icon next to table name)

### Data Format Examples

**Hard Constraints (allergies):**
```json
[
  "Peanuts",
  "Tree Nuts",
  "Shellfish"
]
```

**Soft Preferences (dislikes):**
```json
[
  "Onions",
  "Mushrooms",
  "Olives"
]
```
