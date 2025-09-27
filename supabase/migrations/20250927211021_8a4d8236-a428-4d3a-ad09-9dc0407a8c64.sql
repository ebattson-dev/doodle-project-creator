-- Add push notification token to user profiles
ALTER TABLE public.user_profiles 
ADD COLUMN push_token TEXT,
ADD COLUMN push_enabled BOOLEAN DEFAULT false;