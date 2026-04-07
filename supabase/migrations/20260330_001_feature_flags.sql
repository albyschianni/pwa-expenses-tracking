-- Feature Flags Management
-- Adds feature_flags table for controlling feature rollout, including maintenance mode

CREATE TABLE IF NOT EXISTS feature_flags (
  feature text PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  allowed_users text[] DEFAULT '{}' :: text[],
  description text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS
ALTER TABLE feature_flags ENABLE ROW LEVEL SECURITY;

-- Policy: Public read access (anyone can read flags)
CREATE POLICY "Public read feature flags"
  ON feature_flags
  FOR SELECT
  USING (true);

-- Insert default feature flags
INSERT INTO feature_flags (feature, enabled, description) VALUES
  ('banking', false, 'Enable bank account connections and transaction sync'),
  ('maintenance_mode', false, 'Put the app in maintenance mode - blocks all users except admins'),
  ('recurring_expenses', true, 'Enable recurring expense creation and auto-generation'),
  ('shared_wallets', true, 'Enable shared wallet functionality'),
  ('ai_categorization', true, 'Enable AI-powered transaction categorization'),
  ('push_notifications', true, 'Enable push notification support')
ON CONFLICT (feature) DO NOTHING;

-- Optional: Add admin-only update if you want to restrict flag changes to admins
-- CREATE POLICY "Admins manage feature flags"
--   ON feature_flags
--   FOR UPDATE
--   USING (auth.role() = 'authenticated' AND auth.uid() IN (SELECT id FROM admin_users))
--   WITH CHECK (auth.role() = 'authenticated' AND auth.uid() IN (SELECT id FROM admin_users));
