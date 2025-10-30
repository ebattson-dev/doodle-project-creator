-- Add web_push_subscription column to profiles table
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS web_push_subscription JSONB;