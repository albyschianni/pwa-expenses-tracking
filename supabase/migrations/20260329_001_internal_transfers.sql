-- Aggiunge colonna per marcare trasferimenti interni
-- I trasferimenti interni (giroconto, ricarica carta, etc.) non sono spese/entrate reali
ALTER TABLE bank_transactions
ADD COLUMN IF NOT EXISTS is_internal_transfer boolean DEFAULT false;

-- Indice per query: escludi trasferimenti interni
CREATE INDEX IF NOT EXISTS idx_bank_tx_not_internal
ON bank_transactions(user_id)
WHERE is_internal_transfer = false AND category_id IS NOT NULL;

-- Aggiorna la vista all_expenses per escludere trasferimenti interni
CREATE OR REPLACE VIEW all_expenses AS
-- Transazioni manuali
SELECT
  id,
  user_id,
  description,
  amount,
  date::text AS date,
  category_id,
  transaction_type,
  shared_wallet_id,
  created_at,
  updated_at,
  'manual'::text AS source
FROM expenses

UNION ALL

-- Transazioni bancarie (solo categorizzate e NON trasferimenti interni)
SELECT
  id,
  user_id,
  COALESCE(counterpart_name, description) AS description,
  amount,
  booking_date::text AS date,
  category_id,
  CASE
    WHEN credit_debit_indicator = 'CRDT' THEN 'income'::text
    ELSE 'expense'::text
  END AS transaction_type,
  NULL::uuid AS shared_wallet_id,
  created_at,
  created_at AS updated_at,
  'bank'::text AS source
FROM bank_transactions
WHERE category_id IS NOT NULL
  AND is_internal_transfer = false;
