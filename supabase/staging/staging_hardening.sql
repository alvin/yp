-- =============================================================================
-- Staging-only hardening for the client review environment.
--
-- NOT part of supabase/migrations/ — this is deliberately excluded from the
-- production migration path. Apply it only to the staging project:
--
--   python3 supabase/tools/run_remote_sql.py <project-ref> \
--     supabase/staging/staging_hardening.sql
--
-- Why this exists: staging carries the full Access import, including guest PII
-- and legacy payment-card fields. 0004_security.sql grants the `authenticated`
-- role access to `ypl`, so ANY account that can sign up gains staff-level read
-- access. Supabase projects allow self-service signup by default, so the
-- reviewer link would otherwise be a public door to real guest data.
--
-- The durable fix is Dashboard → Authentication → Sign In / Providers →
-- "Allow new users to sign up" = off. This trigger is the belt-and-braces
-- version that survives someone flipping that toggle back on.
-- =============================================================================

create schema if not exists ypl_staging;

comment on schema ypl_staging is
  'Staging-only guards. Must not be created in production.';

-- Emails permitted to hold an account on staging. Add reviewer accounts here
-- rather than loosening the trigger.
create table if not exists ypl_staging.allowed_signups (
  email text primary key,
  note  text,
  added_at timestamptz not null default now()
);

insert into ypl_staging.allowed_signups (email, note) values
  ('frontdesk@yellowpointlodge.com', 'Shared staff account for client review')
on conflict (email) do nothing;

create or replace function ypl_staging.enforce_signup_allowlist()
returns trigger
language plpgsql
security definer
set search_path = ypl_staging, pg_catalog
as $$
begin
  if not exists (
    select 1 from ypl_staging.allowed_signups
    where lower(email) = lower(new.email)
  ) then
    raise exception
      'Sign-ups are disabled on this environment.'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists enforce_signup_allowlist on auth.users;

create trigger enforce_signup_allowlist
  before insert on auth.users
  for each row
  execute function ypl_staging.enforce_signup_allowlist();
