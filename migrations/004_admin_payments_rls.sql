-- ═══════════════════════════════════════════════════════════════════════════
-- ScanCodeZW — Migration 004: Admin Payment Visibility
-- Run in: Supabase Dashboard → SQL Editor → New query → Run
-- ═══════════════════════════════════════════════════════════════════════════

-- Allow admin and super_admin users to SELECT all payments from the frontend
-- (the anon key / authenticated role — not the service role which already bypasses RLS).

DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;

CREATE POLICY "Admins can view all payments"
  ON public.payments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.user_type IN ('admin', 'super_admin')
    )
  );
