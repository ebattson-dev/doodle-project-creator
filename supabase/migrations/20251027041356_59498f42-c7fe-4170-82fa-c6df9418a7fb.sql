-- Drop the format check constraint if it exists and add the correct one
ALTER TABLE public.reps DROP CONSTRAINT IF EXISTS reps_format_check;

-- Add check constraint with AI Generated as a valid format
ALTER TABLE public.reps 
ADD CONSTRAINT reps_format_check 
CHECK (format IN ('Text', 'Video', 'Audio', 'Interactive', 'AI Generated'));