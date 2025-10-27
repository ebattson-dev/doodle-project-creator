-- Add trial and free rep tracking to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS trial_start_date timestamp with time zone,
ADD COLUMN IF NOT EXISTS trial_ends_at timestamp with time zone,
ADD COLUMN IF NOT EXISTS last_free_rep_date date;

-- Create a trigger to set trial dates on profile creation
CREATE OR REPLACE FUNCTION public.set_trial_dates()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Set trial start and end dates (7 days from creation)
  IF NEW.trial_start_date IS NULL THEN
    NEW.trial_start_date = now();
    NEW.trial_ends_at = now() + interval '7 days';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_trial_dates_on_insert
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.set_trial_dates();