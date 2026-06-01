-- Migration 007: Sub-user (team) support for client organisations
-- Run in Supabase Dashboard → SQL Editor

-- Add parent_user_id and sub_role to profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS parent_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS sub_role text DEFAULT 'member' CHECK (sub_role IN ('member', 'manager'));

-- Index for quick team lookups
CREATE INDEX IF NOT EXISTS idx_profiles_parent_user_id ON public.profiles (parent_user_id);

-- RLS: sub-users can see their org owner's products
CREATE POLICY "Sub-users can view org products"
  ON public.products FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT parent_user_id FROM public.profiles WHERE id = auth.uid() AND parent_user_id IS NOT NULL
    )
  );

-- RLS: sub-users can insert barcodes under org owner's user_id context
-- (they generate barcodes that are attributed to org owner)
CREATE POLICY "Sub-users can view org barcodes"
  ON public.variations FOR SELECT
  USING (
    user_id = auth.uid()
    OR user_id IN (
      SELECT parent_user_id FROM public.profiles WHERE id = auth.uid() AND parent_user_id IS NOT NULL
    )
  );

-- RLS: managers can insert products
CREATE POLICY "Managers can insert org products"
  ON public.products FOR INSERT
  WITH CHECK (
    user_id = (
      SELECT COALESCE(parent_user_id, auth.uid())
      FROM public.profiles WHERE id = auth.uid()
    )
    AND EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid()
        AND sub_role = 'manager'
    )
  );
