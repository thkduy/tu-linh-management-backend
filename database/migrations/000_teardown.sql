-- Teardown: remove all database objects created by the migrations.
-- Run this in the Supabase SQL editor or via the Supabase CLI.
--
-- WARNING: This is destructive and irreversible. It drops the `profiles`
-- table (and all its data), the triggers, functions, policies, and indexes
-- created by 001–004. It does NOT touch `auth.users` (Supabase manages that
-- schema) — auth users are left intact.
--
-- Order matters: drop dependent objects (triggers, policies) before the
-- table, and drop the table before the extension.

-- 1. Drop triggers (on auth.users and on profiles).
drop trigger if exists on_auth_user_created on auth.users;
drop trigger if exists profiles_set_updated_at on public.profiles;

-- 2. Drop functions.
drop function if exists public.handle_new_user();
drop function if exists public.set_updated_at();

-- 3. Drop RLS policies (also disables RLS implicitly when the table is dropped,
--    but dropping explicitly keeps this script idempotent).
drop policy if exists "profiles_select_own" on public.profiles;
drop policy if exists "profiles_update_own" on public.profiles;

-- 4. Drop the profiles table (cascades to its indexes and constraints).
drop table if exists public.profiles cascade;

-- 5. Drop the pgcrypto extension (only if nothing else depends on it).
--    Uncomment if you want to fully remove it; leaving it is harmless.
-- drop extension if exists pgcrypto;
