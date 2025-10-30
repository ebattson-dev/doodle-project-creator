-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net extension for making HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Create a cron job that runs every hour to check for users needing rep generation
SELECT cron.schedule(
  'auto-generate-daily-reps',
  '0 * * * *', -- Every hour at minute 0
  $$
  SELECT
    net.http_post(
        url:='https://ychuzkpkdaqaztlawowi.supabase.co/functions/v1/auto-generate-daily-reps',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljaHV6a3BrZGFxYXp0bGF3b3dpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwMDM0NTcsImV4cCI6MjA3NDU3OTQ1N30.ewRVZUg_bg-l4ZVMJTOenkQU38wOWohIxWJrNup06UU"}'::jsonb,
        body:=concat('{"time": "', now(), '"}')::jsonb
    ) as request_id;
  $$
);