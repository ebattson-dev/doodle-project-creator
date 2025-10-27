-- Add streak tracking columns to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS current_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS longest_streak integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS last_completed_date date;

-- Create function to update streak when a rep is completed
CREATE OR REPLACE FUNCTION public.update_user_streak(p_user_id uuid, p_completed_date date)
RETURNS TABLE(current_streak integer, longest_streak integer, is_new_record boolean)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_last_completed_date date;
  v_current_streak integer;
  v_longest_streak integer;
  v_is_new_record boolean := false;
  v_day_diff integer;
BEGIN
  -- Get current streak data
  SELECT last_completed_date, profiles.current_streak, profiles.longest_streak
  INTO v_last_completed_date, v_current_streak, v_longest_streak
  FROM profiles
  WHERE user_id = p_user_id;

  -- If no previous completion, start streak at 1
  IF v_last_completed_date IS NULL THEN
    v_current_streak := 1;
  ELSE
    -- Calculate days between completions
    v_day_diff := p_completed_date - v_last_completed_date;
    
    -- If completed yesterday or today, continue/maintain streak
    IF v_day_diff = 1 THEN
      v_current_streak := v_current_streak + 1;
    ELSIF v_day_diff = 0 THEN
      -- Same day, don't change streak
      v_current_streak := v_current_streak;
    ELSE
      -- Streak broken, reset to 1
      v_current_streak := 1;
    END IF;
  END IF;

  -- Check if new record
  IF v_current_streak > v_longest_streak THEN
    v_longest_streak := v_current_streak;
    v_is_new_record := true;
  END IF;

  -- Update the profile
  UPDATE profiles
  SET 
    current_streak = v_current_streak,
    longest_streak = v_longest_streak,
    last_completed_date = p_completed_date
  WHERE user_id = p_user_id;

  -- Return the updated values
  RETURN QUERY SELECT v_current_streak, v_longest_streak, v_is_new_record;
END;
$$;