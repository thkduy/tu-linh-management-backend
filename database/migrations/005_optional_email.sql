-- Phase 2 migration: make profiles.email optional.
-- Run this in the Supabase SQL editor or via the Supabase CLI.
--
-- Employees are standalone profiles and do not log in, so they may have no
-- email. Admins still require an email (enforced at the application layer).

alter table public.profiles
  alter column email drop not null;
