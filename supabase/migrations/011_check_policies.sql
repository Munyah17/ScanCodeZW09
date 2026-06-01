-- QUICK DIAGNOSTIC: Check if policies exist and your profile is valid
-- Run this in Supabase SQL Editor and share ALL results

-- 1. Check your profile
SELECT id, username, subscription_type, user_type, created_at
FROM public.profiles
WHERE id = 'c5eb18df-38dc-4074-a148-9d8936a9ef41';

-- 2. Check ALL policies on products
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'products';

-- 3. Check ALL policies on variations
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'variations';

-- 4. Check ALL policies on profiles
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'profiles';

-- 5. If no policies show up above, run this to create them:
-- (Uncomment and run only if step 2/3/4 returns nothing)

/*
-- PRODUCTS
CREATE POLICY "Users manage own products"
  ON public.products FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- VARIATIONS  
CREATE POLICY "Users manage own variations"
  ON public.variations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- PROFILES
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
*/
