-- Explicit Data API grants
--
-- Backfills explicit GRANTs for every table/view in `public` that is reached
-- through the Supabase Data API (supabase-js / PostgREST / GraphQL).
--
-- Required to keep the project working after Supabase enforces the new default
-- on existing projects (2026-10-30): from that date on, only objects with
-- explicit grants are exposed via the Data API. Existing objects keep their
-- current grants, but we make them explicit here so dev/prod parity does not
-- depend on the implicit default — and any new migration follows the same
-- pattern documented in SECURITY.md.
--
-- RLS still enforces row-level access; GRANTs are the prerequisite that lets
-- a role reach the table at all.
--
-- Roles:
--   authenticated → logged-in users (CRUD, gated by RLS)
--   service_role  → backend / edge functions (full CRUD)
--   anon          → intentionally NOT granted (the app is auth-gated)

-- ============================================================
-- Tables accessed by the client (CRUD subject to RLS)
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.bank_connections,
  public.bank_transactions,
  public.budget_templates,
  public.budgets,
  public.categories,
  public.categorization_rules,
  public.expenses,
  public.push_subscriptions,
  public.recurring_expenses,
  public.shared_wallet_members,
  public.shared_wallets,
  public.wallet_invitations
TO authenticated;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE
  public.bank_connections,
  public.bank_transactions,
  public.budget_templates,
  public.budgets,
  public.categories,
  public.categorization_rules,
  public.expenses,
  public.push_subscriptions,
  public.recurring_expenses,
  public.shared_wallet_members,
  public.shared_wallets,
  public.wallet_invitations
TO service_role;

-- ============================================================
-- feature_flags — client reads only, writes via service_role
-- ============================================================

GRANT SELECT ON TABLE public.feature_flags TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.feature_flags TO service_role;

-- ============================================================
-- ai_usage_log — server-side only (edge functions)
-- ============================================================

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.ai_usage_log TO service_role;

-- ============================================================
-- Views
-- ============================================================

GRANT SELECT ON TABLE public.all_expenses TO authenticated;
GRANT SELECT ON TABLE public.all_expenses TO service_role;
