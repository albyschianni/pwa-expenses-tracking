-- Vista unificata: expenses manuali + bank_transactions categorizzate
-- Usata da dashboard, grafici, export per avere una vista completa delle finanze
-- Le write operations (add/update/delete) restano sulla tabella expenses

CREATE OR REPLACE VIEW all_expenses
WITH (security_invoker = true)
AS

-- 1. Transazioni manuali
SELECT
  id,
  user_id,
  description,
  amount,
  date,
  category_id,
  transaction_type,
  shared_wallet_id,
  created_at,
  updated_at,
  'manual'::text AS source
FROM expenses

UNION ALL

-- 2. Transazioni bancarie (solo quelle categorizzate/revisionate)
SELECT
  id,
  user_id,
  COALESCE(counterpart_name, description, 'Transazione bancaria') AS description,
  amount,
  booking_date AS date,
  category_id,
  CASE
    WHEN credit_debit_indicator = 'CRDT' THEN 'income'
    ELSE 'expense'
  END AS transaction_type,
  NULL::uuid AS shared_wallet_id,
  created_at,
  created_at AS updated_at,
  'bank'::text AS source
FROM bank_transactions
WHERE category_id IS NOT NULL;
