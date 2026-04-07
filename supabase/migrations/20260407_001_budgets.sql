-- Envelope Budgeting
-- budget_templates: importo mensile desiderato per categoria (stabile)
-- budgets: istanza mensile effettiva (generata dal template, modificabile per mese)

CREATE TABLE IF NOT EXISTS budget_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id text NOT NULL REFERENCES categories(id),
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category_id)
);

ALTER TABLE budget_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own budget templates" ON budget_templates;
CREATE POLICY "Users manage own budget templates"
  ON budget_templates FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_budget_templates_user
  ON budget_templates(user_id);

-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS budgets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category_id text NOT NULL REFERENCES categories(id),
  month_key text NOT NULL,  -- formato 'YYYY-MM'
  amount numeric NOT NULL CHECK (amount > 0),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, category_id, month_key)
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own budgets" ON budgets;
CREATE POLICY "Users manage own budgets"
  ON budgets FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_budgets_user_month
  ON budgets(user_id, month_key);
