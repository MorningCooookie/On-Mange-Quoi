-- ============================================
-- FAMILY SHARING — Supabase Tables & RLS
-- ============================================
-- Run this SQL in your Supabase dashboard (SQL Editor)
-- 1. Go to https://app.supabase.com/project/pozhsrnsezklfyqjoues/sql/new
-- 2. Copy and paste this entire file
-- 3. Click "Run"

-- Table: profiles
-- Stores user profiles (free: 1 per user, premium: unlimited)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'Profile',
  dietary_type TEXT DEFAULT 'standard', -- 'standard', 'vegetarian', 'vegan', 'gluten_free', etc.
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, name)
);

-- Table: subscriptions
-- Tracks who has paid for Family Sharing
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_customer_id TEXT NOT NULL,
  stripe_subscription_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- 'active', 'past_due', 'canceled'
  current_period_start TIMESTAMP,
  current_period_end TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own profiles
CREATE POLICY "Users can read own profiles"
  ON profiles FOR SELECT
  USING (user_id = auth.uid());

-- Policy: Users can insert their own profiles
CREATE POLICY "Users can insert own profiles"
  ON profiles FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Policy: Users can update their own profiles
CREATE POLICY "Users can update own profiles"
  ON profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Policy: Users can delete their own profiles
CREATE POLICY "Users can delete own profiles"
  ON profiles FOR DELETE
  USING (user_id = auth.uid());

-- Enable RLS on subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own subscriptions
CREATE POLICY "Users can read own subscription"
  ON subscriptions FOR SELECT
  USING (user_id = auth.uid());

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_customer ON subscriptions(stripe_customer_id);
