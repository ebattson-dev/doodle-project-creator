-- Update the set_trial_dates function to use 1 day instead of 7 days
CREATE OR REPLACE FUNCTION public.set_trial_dates()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  -- Set trial start and end dates (1 day from creation)
  IF NEW.trial_start_date IS NULL THEN
    NEW.trial_start_date = now();
    NEW.trial_ends_at = now() + interval '1 day';
  END IF;
  RETURN NEW;
END;
$function$;