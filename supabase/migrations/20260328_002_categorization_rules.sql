-- Regole di auto-categorizzazione: create automaticamente dalle categorizzazioni manuali
-- Quando l'utente categorizza "COOP ITALIA" come "Spesa", la regola viene salvata
-- e applicata automaticamente alle future transazioni con lo stesso counterpart

CREATE TABLE IF NOT EXISTS categorization_rules (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  match_field text NOT NULL DEFAULT 'counterpart_name',  -- 'counterpart_name', 'description', 'merchant_category_code'
  match_value text NOT NULL,
  match_type text NOT NULL DEFAULT 'exact',               -- 'exact', 'contains'
  category_id text NOT NULL REFERENCES categories(id),
  priority int NOT NULL DEFAULT 0,                        -- higher = applied first
  usage_count int NOT NULL DEFAULT 1,                     -- quante volte è stata usata
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, match_field, match_value)
);

-- RLS
ALTER TABLE categorization_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own rules"
  ON categorization_rules FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Indice per lookup veloce durante auto-categorizzazione
CREATE INDEX IF NOT EXISTS idx_cat_rules_user_field
  ON categorization_rules(user_id, match_field);

-- ── Funzione: applica regole alle transazioni non categorizzate ──

CREATE OR REPLACE FUNCTION apply_categorization_rules(p_user_id uuid)
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  affected int := 0;
BEGIN
  -- Match per counterpart_name (exact)
  WITH matched AS (
    UPDATE bank_transactions bt
    SET
      category_id = cr.category_id,
      categorization_source = 'auto',
      reviewed = false
    FROM categorization_rules cr
    WHERE bt.user_id = p_user_id
      AND bt.category_id IS NULL
      AND cr.user_id = p_user_id
      AND cr.match_field = 'counterpart_name'
      AND cr.match_type = 'exact'
      AND LOWER(TRIM(bt.counterpart_name)) = LOWER(TRIM(cr.match_value))
    RETURNING bt.id
  )
  SELECT count(*) INTO affected FROM matched;

  -- Match per counterpart_name (contains)
  WITH matched AS (
    UPDATE bank_transactions bt
    SET
      category_id = cr.category_id,
      categorization_source = 'auto',
      reviewed = false
    FROM categorization_rules cr
    WHERE bt.user_id = p_user_id
      AND bt.category_id IS NULL
      AND cr.user_id = p_user_id
      AND cr.match_field = 'counterpart_name'
      AND cr.match_type = 'contains'
      AND LOWER(bt.counterpart_name) LIKE '%' || LOWER(TRIM(cr.match_value)) || '%'
    RETURNING bt.id
  )
  SELECT affected + count(*) INTO affected FROM matched;

  -- Match per description (exact)
  WITH matched AS (
    UPDATE bank_transactions bt
    SET
      category_id = cr.category_id,
      categorization_source = 'auto',
      reviewed = false
    FROM categorization_rules cr
    WHERE bt.user_id = p_user_id
      AND bt.category_id IS NULL
      AND cr.user_id = p_user_id
      AND cr.match_field = 'description'
      AND cr.match_type = 'exact'
      AND LOWER(TRIM(bt.description)) = LOWER(TRIM(cr.match_value))
    RETURNING bt.id
  )
  SELECT affected + count(*) INTO affected FROM matched;

  -- Match per merchant_category_code
  WITH matched AS (
    UPDATE bank_transactions bt
    SET
      category_id = cr.category_id,
      categorization_source = 'auto',
      reviewed = false
    FROM categorization_rules cr
    WHERE bt.user_id = p_user_id
      AND bt.category_id IS NULL
      AND cr.user_id = p_user_id
      AND cr.match_field = 'merchant_category_code'
      AND bt.merchant_category_code IS NOT NULL
      AND bt.merchant_category_code = cr.match_value
    RETURNING bt.id
  )
  SELECT affected + count(*) INTO affected FROM matched;

  RETURN affected;
END;
$$;
