-- Aggiunge connection_id alla view all_expenses
-- Per le transazioni bancarie → connection_id della bank_transaction
-- Per le transazioni manuali → NULL

DROP VIEW IF EXISTS all_expenses;
CREATE VIEW all_expenses AS

-- 1. Transazioni manuali
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
  'manual'::text AS source,
  NULL::uuid AS connection_id,
  true AS reviewed,
  false AS is_internal_transfer
FROM expenses

UNION ALL

-- 2. Transazioni bancarie (solo categorizzate e NON trasferimenti interni)
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
  'bank'::text AS source,
  connection_id,
  reviewed,
  is_internal_transfer
FROM bank_transactions
WHERE category_id IS NOT NULL
  AND is_internal_transfer = false;

-- Mantieni security_invoker per RLS corretto
ALTER VIEW all_expenses SET (security_invoker = true);
