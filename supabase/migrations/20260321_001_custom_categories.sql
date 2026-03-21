-- Phase 1: Custom Categories Migration
-- Adds sort_order, is_active to categories table + RLS policies

-- Add missing columns (icon and color already exist per DbCategory interface)
ALTER TABLE categories ADD COLUMN IF NOT EXISTS sort_order int NOT NULL DEFAULT 0;
ALTER TABLE categories ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true;

-- Ensure user_id has FK constraint
-- ALTER TABLE categories ADD CONSTRAINT fk_categories_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;

-- Seed system categories if not already present
INSERT INTO categories (id, label, icon, color, user_id, is_default, sort_order, is_active) VALUES
  ('Ristoranti',      'Ristoranti e Bar',   '🍽️', '#F59E0B', NULL, true, 0,  true),
  ('Spesa',           'Spesa Alimentare',   '🛒', '#10B981', NULL, true, 1,  true),
  ('Casa',            'Casa e Affitto',     '🏠', '#3B82F6', NULL, true, 2,  true),
  ('Bollette',        'Bollette e Utenze',  '⚡', '#FBBF24', NULL, true, 3,  true),
  ('Trasporti',       'Trasporti',          '🚗', '#374151', NULL, true, 4,  true),
  ('Salute',          'Salute e Benessere', '💪', '#EF4444', NULL, true, 5,  true),
  ('Intrattenimento', 'Intrattenimento',    '🎬', '#8B5CF6', NULL, true, 6,  true),
  ('Abbonamenti',     'Abbonamenti',        '📱', '#6366F1', NULL, true, 7,  true),
  ('Shopping',        'Shopping',           '🛍️', '#EC4899', NULL, true, 8,  true),
  ('Altro',           'Altro',              '📦', '#6B7280', NULL, true, 9,  true),
  ('Stipendio',       'Stipendio',          '💼', '#10B981', NULL, true, 10, true),
  ('Regalo',          'Regalo',             '🎁', '#F59E0B', NULL, true, 11, true),
  ('Donazione',       'Donazione',          '🤝', '#8B5CF6', NULL, true, 12, true),
  ('Freelance',       'Freelance',          '💻', '#3B82F6', NULL, true, 13, true),
  ('Investimento',    'Investimento',       '📈', '#06B6D4', NULL, true, 14, true),
  ('AltroEntrata',    'Altro',              '💰', '#6B7280', NULL, true, 15, true)
ON CONFLICT (id) DO UPDATE SET
  label = EXCLUDED.label,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order;

-- Add transaction_type column to categories for expense/income distinction
ALTER TABLE categories ADD COLUMN IF NOT EXISTS transaction_type text NOT NULL DEFAULT 'expense'
  CHECK (transaction_type IN ('expense', 'income'));

-- Set income categories
UPDATE categories SET transaction_type = 'income'
WHERE id IN ('Stipendio', 'Regalo', 'Donazione', 'Freelance', 'Investimento', 'AltroEntrata');

-- Prevent hard delete of categories that have transactions
CREATE OR REPLACE FUNCTION prevent_category_hard_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM expenses WHERE category_id = OLD.id LIMIT 1) THEN
    RAISE EXCEPTION 'Cannot delete category "%" because it has associated transactions. Use soft delete (is_active = false) instead.', OLD.label;
  END IF;
  IF EXISTS (SELECT 1 FROM recurring_expenses WHERE category_id = OLD.id LIMIT 1) THEN
    RAISE EXCEPTION 'Cannot delete category "%" because it has associated recurring transactions. Use soft delete (is_active = false) instead.', OLD.label;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_category_hard_delete ON categories;
CREATE TRIGGER trg_prevent_category_hard_delete
  BEFORE DELETE ON categories
  FOR EACH ROW
  EXECUTE FUNCTION prevent_category_hard_delete();

-- ============================================================
-- RLS Policies for categories
-- ============================================================

ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DROP POLICY IF EXISTS "Users can view system and own categories" ON categories;
DROP POLICY IF EXISTS "Users can create own categories" ON categories;
DROP POLICY IF EXISTS "Users can update own categories" ON categories;
DROP POLICY IF EXISTS "Users can delete own categories" ON categories;

-- SELECT: system categories (user_id IS NULL) + own categories
CREATE POLICY "Users can view system and own categories" ON categories
  FOR SELECT USING (
    user_id IS NULL OR user_id = auth.uid()
  );

-- INSERT: only own categories
CREATE POLICY "Users can create own categories" ON categories
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
  );

-- UPDATE: only own categories
CREATE POLICY "Users can update own categories" ON categories
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- DELETE: only own categories (trigger prevents if has transactions)
CREATE POLICY "Users can delete own categories" ON categories
  FOR DELETE USING (
    user_id = auth.uid()
  );
