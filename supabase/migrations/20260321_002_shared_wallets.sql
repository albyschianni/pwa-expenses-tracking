-- Phase 4: Shared Wallets Migration

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE IF NOT EXISTS shared_wallets (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  currency text DEFAULT 'EUR',
  is_deleted boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shared_wallet_members (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id uuid NOT NULL REFERENCES shared_wallets(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  is_active boolean DEFAULT true,
  joined_at timestamptz DEFAULT now(),
  UNIQUE(wallet_id, user_id)
);

-- Extend expenses table for shared wallets
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS shared_wallet_id uuid REFERENCES shared_wallets(id);
CREATE INDEX IF NOT EXISTS idx_expenses_shared_wallet ON expenses(shared_wallet_id) WHERE shared_wallet_id IS NOT NULL;

-- Extend categories for shared wallets
ALTER TABLE categories ADD COLUMN IF NOT EXISTS shared_wallet_id uuid REFERENCES shared_wallets(id);

-- ============================================================
-- Helper function to check wallet membership (SECURITY DEFINER bypasses RLS)
-- ============================================================

CREATE OR REPLACE FUNCTION is_wallet_member(p_wallet_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM shared_wallet_members
    WHERE wallet_id = p_wallet_id
      AND user_id = p_user_id
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Auto-insert creator as owner trigger
-- ============================================================

CREATE OR REPLACE FUNCTION auto_add_wallet_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO shared_wallet_members (wallet_id, user_id, role, is_active)
  VALUES (NEW.id, NEW.created_by, 'owner', true);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_auto_add_wallet_owner ON shared_wallets;
CREATE TRIGGER trg_auto_add_wallet_owner
  AFTER INSERT ON shared_wallets
  FOR EACH ROW
  EXECUTE FUNCTION auto_add_wallet_owner();

-- ============================================================
-- RLS: shared_wallets
-- ============================================================

ALTER TABLE shared_wallets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view their wallets" ON shared_wallets;
CREATE POLICY "Members can view their wallets" ON shared_wallets
  FOR SELECT USING (
    NOT is_deleted AND (
      created_by = auth.uid()
      OR
      is_wallet_member(id, auth.uid())
    )
  );

DROP POLICY IF EXISTS "Authenticated users can create wallets" ON shared_wallets;
CREATE POLICY "Authenticated users can create wallets" ON shared_wallets
  FOR INSERT WITH CHECK (
    created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Owners can update wallets" ON shared_wallets;
CREATE POLICY "Owners can update wallets" ON shared_wallets
  FOR UPDATE USING (
    created_by = auth.uid()
  );

DROP POLICY IF EXISTS "Owners can delete wallets" ON shared_wallets;
CREATE POLICY "Owners can delete wallets" ON shared_wallets
  FOR DELETE USING (
    created_by = auth.uid()
  );

-- ============================================================
-- RLS: shared_wallet_members
-- ============================================================

ALTER TABLE shared_wallet_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view co-members" ON shared_wallet_members;
CREATE POLICY "Members can view co-members" ON shared_wallet_members
  FOR SELECT USING (
    is_wallet_member(wallet_id, auth.uid())
  );

DROP POLICY IF EXISTS "Owners can add members" ON shared_wallet_members;
CREATE POLICY "Owners can add members" ON shared_wallet_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM shared_wallet_members AS m
      WHERE m.wallet_id = shared_wallet_members.wallet_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
        AND m.is_active = true
    )
    OR
    -- Allow the auto_add_wallet_owner trigger (first member)
    NOT EXISTS (
      SELECT 1 FROM shared_wallet_members AS m
      WHERE m.wallet_id = shared_wallet_members.wallet_id
    )
  );

DROP POLICY IF EXISTS "Owners can remove members or self-remove" ON shared_wallet_members;
CREATE POLICY "Owners can remove members or self-remove" ON shared_wallet_members
  FOR DELETE USING (
    -- Owner can remove anyone
    EXISTS (
      SELECT 1 FROM shared_wallet_members AS m
      WHERE m.wallet_id = shared_wallet_members.wallet_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
        AND m.is_active = true
    )
    OR
    -- Members can remove themselves
    user_id = auth.uid()
  );

-- Allow updating is_active for deactivation
DROP POLICY IF EXISTS "Owners or self can update members" ON shared_wallet_members;
CREATE POLICY "Owners or self can update members" ON shared_wallet_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM shared_wallet_members AS m
      WHERE m.wallet_id = shared_wallet_members.wallet_id
        AND m.user_id = auth.uid()
        AND m.role = 'owner'
        AND m.is_active = true
    )
    OR user_id = auth.uid()
  );

-- ============================================================
-- RLS: Update expenses policies for shared wallets
-- ============================================================

-- Drop existing expense policies to recreate with shared wallet support
DROP POLICY IF EXISTS "Users can view own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can insert own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can update own expenses" ON expenses;
DROP POLICY IF EXISTS "Users can delete own expenses" ON expenses;

-- SELECT: personal OR shared wallet member
CREATE POLICY "Users can view own expenses" ON expenses
  FOR SELECT USING (
    (shared_wallet_id IS NULL AND user_id = auth.uid())
    OR
    (shared_wallet_id IS NOT NULL AND is_wallet_member(shared_wallet_id, auth.uid()))
  );

-- INSERT: personal OR into shared wallet where user is member
CREATE POLICY "Users can insert own expenses" ON expenses
  FOR INSERT WITH CHECK (
    user_id = auth.uid() AND (
      shared_wallet_id IS NULL
      OR is_wallet_member(shared_wallet_id, auth.uid())
    )
  );

-- UPDATE: only own transactions
CREATE POLICY "Users can update own expenses" ON expenses
  FOR UPDATE USING (
    user_id = auth.uid()
  );

-- DELETE: only own transactions
CREATE POLICY "Users can delete own expenses" ON expenses
  FOR DELETE USING (
    user_id = auth.uid()
  );

-- ============================================================
-- RLS: Categories for shared wallets
-- ============================================================

-- Update categories SELECT to include shared wallet categories
DROP POLICY IF EXISTS "Users can view system and own categories" ON categories;
CREATE POLICY "Users can view system and own categories" ON categories
  FOR SELECT USING (
    user_id IS NULL
    OR user_id = auth.uid()
    OR (shared_wallet_id IS NOT NULL AND is_wallet_member(shared_wallet_id, auth.uid()))
  );

-- ============================================================
-- Helper: search users by email for invitations
-- ============================================================

CREATE OR REPLACE FUNCTION search_users_by_email(search_email text)
RETURNS TABLE(id uuid, email text, display_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    COALESCE(u.raw_user_meta_data->>'display_name', '')::text AS display_name
  FROM auth.users u
  WHERE u.email ILIKE '%' || search_email || '%'
    AND u.id != auth.uid()
  LIMIT 10;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Helper: get user info by IDs (for populating member details)
-- ============================================================

CREATE OR REPLACE FUNCTION get_users_by_ids(user_ids uuid[])
RETURNS TABLE(id uuid, email text, display_name text) AS $$
BEGIN
  RETURN QUERY
  SELECT
    u.id,
    u.email::text,
    COALESCE(u.raw_user_meta_data->>'display_name', '')::text AS display_name
  FROM auth.users u
  WHERE u.id = ANY(user_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Add shared_wallet_id to recurring_expenses
-- ============================================================

ALTER TABLE recurring_expenses
  ADD COLUMN IF NOT EXISTS shared_wallet_id uuid REFERENCES shared_wallets(id) ON DELETE CASCADE;
