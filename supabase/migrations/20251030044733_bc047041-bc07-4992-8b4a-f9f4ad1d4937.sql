-- Add trial period to the user's account
UPDATE public.profiles
SET 
  trial_start_date = now(),
  trial_ends_at = now() + interval '7 days'
WHERE user_id = '3176f2d7-cebd-4324-ae10-eddca7d4a3b6';