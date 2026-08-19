-- Phase 2 migration: decouple profiles from auth.users.
-- Run this in the Supabase SQL editor or via the Supabase CLI.
--
-- Before this migration, `profiles.id` was a foreign key to `auth.users(id)`,
-- which forced every profile to have a corresponding auth user. This migration
-- makes profiles standalone:
--   * `id` becomes an independent UUID (generated automatically).
--   * A new nullable `auth_user_id` column optionally links a profile to an
--     auth user (used only for login). Regular profiles have `auth_user_id = null`.

-- 1. Drop the foreign key that tied profiles.id to auth.users.
alter table public.profiles
  drop constraint if exists profiles_id_fkey;

-- 2. Make `id` generate a UUID automatically when not supplied.
alter table public.profiles
  alter column id set default gen_random_uuid();

-- 3. Add the optional link to auth.users.
alter table public.profiles
  add column if not exists auth_user_id uuid references auth.users(id) on delete set null;

-- 3a. Ensure at most one profile per auth user (needed for `on conflict`).
create unique index if not exists profiles_auth_user_id_unique_idx
  on public.profiles (auth_user_id)
  where auth_user_id is not null;

-- 4. Index the new column for login lookups.
create index if not exists profiles_auth_user_id_idx on public.profiles (auth_user_id);

-- 5. The auto-provisioning trigger now links the profile to the auth user via
--    auth_user_id instead of using the auth user's id as the primary key.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (auth_user_id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'employee',
    'active'
  )
  on conflict (auth_user_id) where auth_user_id is not null do nothing;
  return new;
end;
$$;

-- 6. Update RLS policies to match on auth_user_id instead of id.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = auth_user_id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = auth_user_id)
  with check (auth.uid() = auth_user_id);
