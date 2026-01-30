-- Setup Cron Job for Auto Rekap Harian
-- Run this SQL in Supabase SQL Editor AFTER deploying the edge function

-- Enable pg_cron extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Grant usage to postgres user
GRANT USAGE ON SCHEMA cron TO postgres;

-- Enable pg_net extension for HTTP calls
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Schedule auto rekap harian at 23:59 WIB (16:59 UTC)
-- The cron expression: minute hour day month weekday
-- 59 16 * * * = 16:59 UTC every day = 23:59 WIB

SELECT cron.schedule(
  'auto-rekap-harian-job',  -- job name
  '59 16 * * *',            -- 23:59 WIB (16:59 UTC)
  $$
  SELECT net.http_post(
    url := current_setting('app.settings.supabase_url') || '/functions/v1/auto-rekap-harian',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key')
    ),
    body := '{}'::jsonb
  ) AS request_id;
  $$
);

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To view job run history:
-- SELECT * FROM cron.job_run_details ORDER BY start_time DESC LIMIT 20;

-- To unschedule a job:
-- SELECT cron.unschedule('auto-rekap-harian-job');
