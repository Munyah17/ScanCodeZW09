-- Migration 006: Confirm all existing unconfirmed users
-- Run this ONCE in Supabase Dashboard → SQL Editor
-- Purpose: bypass email confirmation for accounts already created

UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL;
