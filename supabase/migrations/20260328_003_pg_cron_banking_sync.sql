-- pg_cron: sync automatico transazioni bancarie ogni 15 minuti
-- Richiede: estensione pg_cron abilitata su Supabase (Dashboard → Database → Extensions)
--
-- Il cron chiama la edge function banking-sync senza body (= sync globale per tutti gli utenti)

-- Abilita pg_cron (se non già attivo)
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Rimuovi job precedente se esiste
SELECT cron.unschedule('banking-sync-job')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'banking-sync-job'
);

-- Crea job: ogni 15 minuti
SELECT cron.schedule(
  'banking-sync-job',
  '*/15 * * * *',
  $$
  SELECT
    net.http_post(
      url := 'https://nbxxjddsypresmywigbz.supabase.co/functions/v1/banking-sync',
      headers := jsonb_build_object(
        'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key'),
        'Content-Type', 'application/json'
      ),
      body := '{}'::jsonb
    ) AS request_id;
  $$
);
