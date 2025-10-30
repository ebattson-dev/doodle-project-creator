-- Add auto-generation preferences to profiles table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS auto_generate_reps boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS preferred_delivery_time time DEFAULT '12:00:00';

-- Add index for efficient cron queries
CREATE INDEX IF NOT EXISTS idx_profiles_auto_generate 
ON public.profiles(auto_generate_reps, preferred_delivery_time) 
WHERE auto_generate_reps = true;