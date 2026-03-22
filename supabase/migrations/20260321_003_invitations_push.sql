-- Phase 5: Wallet Invitations + Push Notifications

-- ============================================================
-- Push Subscriptions table
-- Stores Web Push subscriptions per user/device
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint text NOT NULL,
  p256dh text NOT NULL,
  auth text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, endpoint)
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage own push subscriptions" ON push_subscriptions
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ============================================================
-- Wallet Invitations table
-- ============================================================

CREATE TABLE IF NOT EXISTS wallet_invitations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  wallet_id uuid NOT NULL REFERENCES shared_wallets(id) ON DELETE CASCADE,
  invited_by uuid NOT NULL REFERENCES auth.users(id),
  invited_user_id uuid NOT NULL REFERENCES auth.users(id),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(wallet_id, invited_user_id, status)
);

ALTER TABLE wallet_invitations ENABLE ROW LEVEL SECURITY;

-- Inviter (wallet owner) can create invitations
CREATE POLICY "Owners can create invitations" ON wallet_invitations
  FOR INSERT WITH CHECK (
    invited_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM shared_wallet_members
      WHERE wallet_id = wallet_invitations.wallet_id
        AND user_id = auth.uid()
        AND role = 'owner'
        AND is_active = true
    )
  );

-- Both inviter and invited can view
CREATE POLICY "Involved users can view invitations" ON wallet_invitations
  FOR SELECT USING (
    invited_by = auth.uid() OR invited_user_id = auth.uid()
  );

-- Invited user can update (accept/reject)
CREATE POLICY "Invited user can respond to invitations" ON wallet_invitations
  FOR UPDATE USING (
    invited_user_id = auth.uid()
  );

-- Owner can delete/cancel invitations
CREATE POLICY "Owners can cancel invitations" ON wallet_invitations
  FOR DELETE USING (
    invited_by = auth.uid()
  );

-- ============================================================
-- Function: Accept invitation (adds member + updates status)
-- ============================================================

CREATE OR REPLACE FUNCTION accept_wallet_invitation(invitation_id uuid)
RETURNS void AS $$
DECLARE
  inv RECORD;
BEGIN
  -- Get the invitation
  SELECT * INTO inv FROM wallet_invitations
  WHERE id = invitation_id
    AND invited_user_id = auth.uid()
    AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Invitation not found or already processed';
  END IF;

  -- Update invitation status
  UPDATE wallet_invitations
  SET status = 'accepted', updated_at = now()
  WHERE id = invitation_id;

  -- Add user as member (upsert in case of re-invitation)
  INSERT INTO shared_wallet_members (wallet_id, user_id, role, is_active)
  VALUES (inv.wallet_id, inv.invited_user_id, 'member', true)
  ON CONFLICT (wallet_id, user_id)
  DO UPDATE SET is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Function: Reject invitation
-- ============================================================

CREATE OR REPLACE FUNCTION reject_wallet_invitation(invitation_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE wallet_invitations
  SET status = 'rejected', updated_at = now()
  WHERE id = invitation_id
    AND invited_user_id = auth.uid()
    AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- Function: Get wallet name for push notification
-- ============================================================

CREATE OR REPLACE FUNCTION get_invitation_details(p_invitation_id uuid)
RETURNS TABLE(
  wallet_name text,
  inviter_email text,
  inviter_display_name text,
  invited_user_id uuid
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    sw.name::text AS wallet_name,
    inviter.email::text AS inviter_email,
    COALESCE(inviter.raw_user_meta_data->>'display_name', '')::text AS inviter_display_name,
    wi.invited_user_id
  FROM wallet_invitations wi
  JOIN shared_wallets sw ON sw.id = wi.wallet_id
  JOIN auth.users inviter ON inviter.id = wi.invited_by
  WHERE wi.id = p_invitation_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
