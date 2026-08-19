-- Phase 1 migration: profiles table linked to auth.users.
-- Run this in the Supabase SQL editor or via the Supabase CLI.

-- Enable the pgcrypto extension for gen_random_uuid() if needed.
create extension if not exists pgcrypto;

-- Profiles table (1:1 with auth.users).
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null,
  employee_code text unique,
  role text not null default 'employee'
    check (role in ('admin', 'employee')),
  status text not null default 'active'
    check (status in ('active', 'inactive')),
  department text,
  position text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Indexes for common lookups.
create index if not exists profiles_email_idx on public.profiles (email);
create index if not exists profiles_employee_code_idx on public.profiles (employee_code);
create index if not exists profiles_role_idx on public.profiles (role);
create index if not exists profiles_status_idx on public.profiles (status);

-- Keep updated_at in sync.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
  before update on public.profiles
  for each row
  execute function public.set_updated_at();

-- Automatically create a profile when a new auth user is created (optional
-- convenience; the backend also creates profiles explicitly).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, full_name, role, status)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    'employee',
    'active'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
