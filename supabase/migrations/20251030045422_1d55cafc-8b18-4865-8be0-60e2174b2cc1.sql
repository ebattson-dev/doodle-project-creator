-- Mark the Oct 27 rep as completed for testing
UPDATE public.daily_rep_assignments
SET 
  completed = true,
  completed_at = '2025-10-27 10:30:00+00'
WHERE id = 'e153d2c5-cfef-449b-b1f7-2460c8ecefd4';