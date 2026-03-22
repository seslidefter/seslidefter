-- SesliDefter v2 — Supabase şeması (SQL Editor'de çalıştırın)
-- Eski `records` tablosu varsa önce yedek alıp kaldırın / migrate edin.

CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  business_name TEXT,
  phone TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE contacts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  category TEXT CHECK (category IN ('gelir', 'gider', 'alacak', 'verecek')) NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  description TEXT,
  audio_url TEXT,
  transcript TEXT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --- Migrations (mevcut DB için güvenli tekrar çalıştırma) ---
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS balance_after DECIMAL(12,2) DEFAULT 0;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS category_tag TEXT;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS due_date DATE;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT true;
ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring TEXT;

CREATE TABLE IF NOT EXISTS categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '💰',
  color TEXT DEFAULT '#2E7D32',
  type TEXT CHECK (type IN ('gelir','gider','alacak','verecek','hepsi')) DEFAULT 'hepsi',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS default_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  icon TEXT NOT NULL,
  color TEXT NOT NULL,
  type TEXT NOT NULL
);

INSERT INTO default_categories (name, icon, color, type) VALUES
('Maaş', '💼', '#2E7D32', 'gelir'),
('Serbest Gelir', '💻', '#388E3C', 'gelir'),
('Kira Geliri', '🏠', '#43A047', 'gelir'),
('Diğer Gelir', '💰', '#4CAF50', 'gelir'),
('Market', '🛒', '#D32F2F', 'gider'),
('Kira', '🏠', '#C62828', 'gider'),
('Fatura', '⚡', '#E53935', 'gider'),
('Ulaşım', '🚗', '#F44336', 'gider'),
('Yemek', '🍽️', '#EF5350', 'gider'),
('Sağlık', '💊', '#E91E63', 'gider'),
('Eğitim', '📚', '#9C27B0', 'gider'),
('Giyim', '👕', '#673AB7', 'gider'),
('Eğlence', '🎮', '#3F51B5', 'gider'),
('Diğer Gider', '💸', '#FF5722', 'gider'),
('Ticari Alacak', '📥', '#1565C0', 'alacak'),
('Kişisel Alacak', '🤝', '#1976D2', 'alacak'),
('Ticari Verecek', '📤', '#E65100', 'verecek'),
('Kişisel Verecek', '🤲', '#F57C00', 'verecek')
ON CONFLICT (name) DO NOTHING;

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own" ON profiles FOR ALL USING (auth.uid() = id);

-- Davet sayısı: davet eden kullanıcı, kendisini invited_by olarak işaretleyen profilleri görebilir
DROP POLICY IF EXISTS "profiles_select_invited_by_me" ON profiles;
CREATE POLICY "profiles_select_invited_by_me" ON profiles
  FOR SELECT TO authenticated
  USING (invited_by = auth.uid());

CREATE POLICY "own" ON contacts FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own" ON transactions FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "own_categories" ON categories;
CREATE POLICY "own_categories" ON categories FOR ALL USING (auth.uid() = user_id);

ALTER TABLE default_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "default_categories_read" ON default_categories;
CREATE POLICY "default_categories_read" ON default_categories FOR SELECT TO authenticated USING (true);

-- --- Davet kodu, bütçe, tekrar bitiş (SQL Editor'de güvenle tekrar çalıştırın) ---
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invite_code TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS profiles_invite_code_key ON profiles (invite_code) WHERE invite_code IS NOT NULL;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invited_by UUID REFERENCES auth.users(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS premium_until TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'light';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS invite_count INTEGER DEFAULT 0;

ALTER TABLE transactions ADD COLUMN IF NOT EXISTS recurring_end DATE;

CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  taken BOOLEAN;
BEGIN
  LOOP
    code := upper(substring(md5(random()::text) from 1 for 8));
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE invite_code = code) INTO taken;
    EXIT WHEN NOT taken;
  END LOOP;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_code TEXT;
BEGIN
  new_code := public.generate_invite_code();
  INSERT INTO public.profiles (id, full_name, invite_code)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    new_code
  )
  ON CONFLICT (id) DO UPDATE SET
    invite_code = COALESCE(
      NULLIF(TRIM(profiles.invite_code), ''),
      EXCLUDED.invite_code
    );
  RETURN NEW;
END;
$$;

UPDATE public.profiles
SET invite_code = public.generate_invite_code()
WHERE invite_code IS NULL OR TRIM(invite_code) = '';

CREATE TABLE IF NOT EXISTS budgets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  category_tag TEXT NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  period TEXT DEFAULT 'monthly',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE budgets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_budgets" ON budgets;
CREATE POLICY "own_budgets" ON budgets FOR ALL USING (auth.uid() = user_id);

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

INSERT INTO storage.buckets (id, name, public)
VALUES ('recordings', 'recordings', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "rec_own_ins"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'recordings' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "rec_own_sel"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'recordings' AND (storage.foldername(name))[1] = auth.uid()::text);

-- --- Ödeme planları, profil plan alanları (SQL Editor — idempotent) ---
ALTER TABLE transactions ALTER COLUMN recurring SET DEFAULT 'none';

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS plan TEXT DEFAULT 'free';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS monthly_transaction_count INTEGER DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_count_reset DATE DEFAULT CURRENT_DATE;

CREATE TABLE IF NOT EXISTS payment_plans (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  total_amount DECIMAL(12,2) NOT NULL,
  paid_amount DECIMAL(12,2) DEFAULT 0,
  installment_amount DECIMAL(12,2) NOT NULL,
  installment_count INTEGER NOT NULL,
  paid_count INTEGER DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_day INTEGER NOT NULL DEFAULT 1 CHECK (due_day BETWEEN 1 AND 31),
  category TEXT DEFAULT 'gider',
  icon TEXT DEFAULT '💳',
  color TEXT DEFAULT '#1976D2',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_payment_plans" ON payment_plans;
CREATE POLICY "own_payment_plans" ON payment_plans FOR ALL USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS payment_plan_payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  plan_id UUID REFERENCES payment_plans(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  installment_number INTEGER NOT NULL,
  amount DECIMAL(12,2) NOT NULL,
  due_date DATE NOT NULL,
  paid_date DATE,
  is_paid BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE payment_plan_payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "own_plan_payments" ON payment_plan_payments;
CREATE POLICY "own_plan_payments" ON payment_plan_payments FOR ALL USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_monthly_transaction_count(p_user_id UUID)
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INTEGER
  FROM public.transactions
  WHERE user_id = p_user_id
    AND date_trunc('month', created_at AT TIME ZONE 'UTC') = date_trunc('month', NOW() AT TIME ZONE 'UTC');
$$;

-- Ödeme planları varsayılanları + boş davet kodlarını doldur (SQL Editor — idempotent)
ALTER TABLE payment_plans ALTER COLUMN start_date SET DEFAULT CURRENT_DATE;
ALTER TABLE payment_plans ALTER COLUMN due_day SET DEFAULT 1;

UPDATE public.profiles
SET invite_code = upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 8))
WHERE invite_code IS NULL OR trim(invite_code) = '';
