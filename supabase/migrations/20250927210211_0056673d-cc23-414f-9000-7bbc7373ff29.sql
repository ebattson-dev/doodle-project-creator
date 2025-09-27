-- Create cron job to run daily rep assignment every day at 6 AM
SELECT cron.schedule(
  'daily-rep-assignment',
  '0 6 * * *', -- Every day at 6:00 AM
  $$
  SELECT
    net.http_post(
        url:='https://ychuzkpkdaqaztlawowi.supabase.co/functions/v1/assign-daily-reps',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljaHV6a3BrZGFxYXp0bGF3b3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDM0NTcsImV4cCI6MjA3NDU3OTQ1N30.ewRVZUg_bg-l4ZVMJTOenkQU38wOWohIxWJrNup06UU"}'::jsonb,
        body:='{"trigger": "cron"}'::jsonb
    ) as request_id;
  $$
);