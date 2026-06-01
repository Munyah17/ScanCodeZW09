-- Fix RLS policy to allow INSERT into products table
-- The existing "Users manage own products" policy only has a USING clause,
-- which does not apply to INSERT operations. We need a WITH CHECK clause.

-- Drop the old policy
DROP POLICY IF EXISTS "Users manage own products" ON public.products;

-- Create separate policies for each operation
CREATE POLICY "Users can view own products"
  ON public.products FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own products"
  ON public.products FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own products"
  ON public.products FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own products"
  ON public.products FOR DELETE
  USING (auth.uid() = user_id);
