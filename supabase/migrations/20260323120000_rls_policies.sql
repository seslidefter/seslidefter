-- Supabase SQL Editor veya CLI ile çalıştırın.
-- Mevcut policy adlarıyla çakışmıyorsa DROP satırları güvenlidir.
--
-- RLS durumunu kontrol için (isteğe bağlı):
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_plan_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own_transactions" ON transactions;
CREATE POLICY "own_transactions" ON transactions
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_contacts" ON contacts;
CREATE POLICY "own_contacts" ON contacts
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_profiles" ON profiles;
CREATE POLICY "own_profiles" ON profiles
  FOR ALL USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "own_payment_plans" ON payment_plans;
CREATE POLICY "own_payment_plans" ON payment_plans
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_plan_payments" ON payment_plan_payments;
CREATE POLICY "own_plan_payments" ON payment_plan_payments
  FOR ALL USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
