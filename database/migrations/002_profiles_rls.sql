-- Row Level Security for the profiles table.
-- Run this in the Supabase SQL editor or via the Supabase CLI.

alter table public.profiles enable row level security;

-- Users can read their own profile.
drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
  on public.profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- Users can update their own profile (limited fields are enforced at the
-- application layer; this policy only scopes the row).
drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
  on public.profiles
  for update
  to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- NOTE: The service-role client bypasses RLS entirely. All privileged
-- operations (creating users, listing all users, updating other users) are
-- performed through the backend service layer using the service-role key and
-- are never exposed to the client.
