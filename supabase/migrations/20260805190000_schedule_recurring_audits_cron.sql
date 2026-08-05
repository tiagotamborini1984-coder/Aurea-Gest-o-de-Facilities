CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-recurring-audits-daily') THEN
    PERFORM cron.unschedule('process-recurring-audits-daily');
  END IF;
END
$$;

SELECT cron.schedule(
  'process-recurring-audits-daily',
  '0 6 * * *',
  $$
  SELECT net.http_post(
    url := 'https://wmohkugddlxspjckbgae.supabase.co/functions/v1/process-recurring-audits',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtb2hrdWdkZGx4c3BqY2tiZ2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODQ0NzQsImV4cCI6MjA4OTE2MDQ3NH0.hd3AWrx0hv9J2f-r-DEGZweLrzH9itYqYlKe5k_kLSQ',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indtb2hrdWdkZGx4c3BqY2tiZ2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM1ODQ0NzQsImV4cCI6MjA4OTE2MDQ3NH0.hd3AWrx0hv9J2f-r-DEGZweLrzH9itYqYlKe5k_kLSQ'
    ),
    body := '{}'::jsonb
  );
  $$
);
