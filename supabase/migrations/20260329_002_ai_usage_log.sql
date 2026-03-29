-- Tabella per tracciare l'utilizzo AI e prevenire costi fuori controllo
-- Ogni riga = un utente + un giorno
CREATE TABLE IF NOT EXISTS ai_usage_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) NOT NULL,
  date date NOT NULL DEFAULT CURRENT_DATE,
  ai_calls integer NOT NULL DEFAULT 0,
  total_input_tokens integer NOT NULL DEFAULT 0,
  total_output_tokens integer NOT NULL DEFAULT 0,
  transactions_classified integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);

-- Indice per query giornaliere
CREATE INDEX IF NOT EXISTS idx_ai_usage_user_date ON ai_usage_log(user_id, date);
CREATE INDEX IF NOT EXISTS idx_ai_usage_date ON ai_usage_log(date);

-- RLS: solo service_role può scrivere (la funzione usa service_role_key)
ALTER TABLE ai_usage_log ENABLE ROW LEVEL SECURITY;

-- Nessuna policy per utenti normali = nessun accesso dal frontend
-- Solo service_role_key (usato dalla Edge Function) può leggere/scrivere

-- Vista per monitoraggio rapido dei costi (accessibile solo da dashboard SQL)
-- Costo stimato Haiku: $0.25/1M input + $1.25/1M output
CREATE OR REPLACE VIEW ai_cost_summary AS
SELECT
  date,
  COUNT(DISTINCT user_id) AS active_users,
  SUM(ai_calls) AS total_calls,
  SUM(total_input_tokens) AS total_input_tokens,
  SUM(total_output_tokens) AS total_output_tokens,
  SUM(transactions_classified) AS total_classified,
  ROUND(
    (SUM(total_input_tokens) * 0.25 / 1000000.0) +
    (SUM(total_output_tokens) * 1.25 / 1000000.0),
    6
  ) AS estimated_cost_usd
FROM ai_usage_log
GROUP BY date
ORDER BY date DESC;

-- Pulizia automatica: rimuovi log più vecchi di 90 giorni (opzionale, con pg_cron)
-- SELECT cron.schedule('cleanup-ai-logs', '0 3 * * 0',
--   $$DELETE FROM ai_usage_log WHERE date < CURRENT_DATE - INTERVAL '90 days'$$);
