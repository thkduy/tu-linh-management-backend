-- First admin setup helper.
--
-- This script creates the first administrator. It is intended to be run
-- manually by an operator with access to the Supabase project. It does NOT
-- contain any hard-coded credentials.
--
-- Usage (Supabase SQL editor):
--   1. Create the admin user in Supabase Auth (Dashboard → Authentication →
--      Users → Add user) with a strong password.
--   2. Copy the new user's UUID and email.
--   3. Replace the placeholders below and run this script.
--
-- Alternatively, use the CLI helper: `npm run create-admin -- --email ... --full-name ...`

-- Replace these placeholders with the real values.
-- The user must already exist in auth.users.
do $$
declare
  admin_id uuid := 'd132863a-ad84-44f0-bf33-6d46aa7847c9';
  admin_email text := 'thkduy123@gmail.com';
  admin_full_name text := 'Administrator';
  admin_employee_code text := 'ADMIN001';
begin
  if not exists (select 1 from auth.users where id = admin_id) then
    raise exception 'No auth user found with id %', admin_id;
  end if;

  insert into public.profiles (auth_user_id, email, full_name, employee_code, role, status)
  values (admin_id, admin_email, admin_full_name, admin_employee_code, 'admin', 'active')
  on conflict (auth_user_id) where auth_user_id is not null do update
    set role = 'admin', status = 'active', full_name = excluded.full_name,
        employee_code = excluded.employee_code, updated_at = now();

  raise notice 'Admin profile created/updated for %', admin_email;
end;
$$;
