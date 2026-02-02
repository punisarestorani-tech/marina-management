-- Marina Management System - Add username field to profiles
-- Run this in Supabase SQL Editor

-- Add username column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS username TEXT;

-- Create unique index for username
CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username) WHERE username IS NOT NULL;

-- Update existing users to have username based on their name
UPDATE profiles
SET username = LOWER(REPLACE(REPLACE(full_name, ' ', '.'), '''', ''))
WHERE username IS NULL;
