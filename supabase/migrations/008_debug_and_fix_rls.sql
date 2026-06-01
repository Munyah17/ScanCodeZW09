-- Debug and fix RLS for products and variations tables
-- Run this in Supabase SQL Editor to diagnose and fix permission issues

-- Step 1: Check current policies
-- (Run these SELECTs separately to see what exists)

-- Show current policies on products:
-- SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products';

-- Show current policies on variations:
-- SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename = 'variations';

-- Step 2: Drop all existing policies on products to start fresh
DROP POLICY IF EXISTS "Users manage own products" ON public.products;
DROP POLICY IF EXISTS "Users can view own products" ON public.products;
DROP POLICY IF EXISTS "Users can insert own products" ON public.products;
DROP POLICY IF EXISTS "Users can update own products" ON public.products;
DROP POLICY IF EXISTS "Users can delete own products" ON public.products;

-- Step 3: Create a simple, working policy for ALL operations
-- This single policy uses FOR ALL with both USING and WITH CHECK
CREATE POLICY "Users manage own products"
  ON public.products FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Step 4: Do the same for variations table (same issue exists there)
DROP POLICY IF EXISTS "Users manage own variations" ON public.variations;
DROP POLICY IF EXISTS "Users can view own variations" ON public.variations;
DROP POLICY IF EXISTS "Users can insert own variations" ON public.variations;
DROP POLICY IF EXISTS "Users can update own variations" ON public.variations;
DROP POLICY IF EXISTS "Users can delete own variations" ON public.variations;

CREATE POLICY "Users manage own variations"
  ON public.variations FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Verify policies exist
-- SELECT * FROM pg_policies WHERE schemaname = 'public' AND tablename IN ('products', 'variations');
