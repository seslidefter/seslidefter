-- Run in Supabase SQL Editor if migrations are not applied via CLI

-- Transactions: plan_id + indexes
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS plan_id UUID REFERENCES payment_plans(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_plan_id ON transactions(plan_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date);
CREATE INDEX IF NOT EXISTS idx_transactions_user_created ON transactions(user_id, created_at);

-- Profiles: invite_count + backfill from invited_by
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invite_count INTEGER DEFAULT 0;

UPDATE profiles p
SET invite_count = (
  SELECT COUNT(*)::integer FROM profiles c
  WHERE c.invited_by = p.id
)
WHERE EXISTS (SELECT 1 FROM profiles c WHERE c.invited_by = p.id)
   OR p.invite_count IS NULL;

UPDATE profiles SET invite_count = 0 WHERE invite_count IS NULL;
