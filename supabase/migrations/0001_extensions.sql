-- =============================================================================
-- 0001_extensions.sql
-- Yellow Point Lodge — Supabase base objects
-- =============================================================================
-- Production application objects live in one schema: `ypl`.
--
-- The original MS Access database remains the source for migration/import shape,
-- but production table names, views, and RPCs should read as the new Yellow Point
-- Lodge system rather than as an old-system compatibility layer.
-- =============================================================================

create extension if not exists "pgcrypto";
create extension if not exists "pg_trgm";

-- The lodge is a single property on Vancouver Island: business dates
-- (booking dates, printed dates, cancellation dates, "today" defaults in the
-- business-logic triggers) must follow lodge-local time, not UTC — otherwise
-- an evening shift books and prints under tomorrow's date.
do $$
begin
  execute format('alter database %I set timezone = %L', current_database(), 'America/Vancouver');
end
$$;
set timezone = 'America/Vancouver';

create schema if not exists ypl;

comment on schema ypl is
  'Yellow Point Lodge production schema. Contains imported Access-compatible tables renamed to snake_case plus app views and report/search RPCs.';

-- Shared updated_at helper reserved for future app-owned tables. The current
-- imported tables intentionally preserve Access columns without adding audit
-- columns so data can be loaded losslessly from the source database.
create or replace function ypl.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

comment on function ypl.set_updated_at is
  'Generic timestamp helper for future app-owned tables, if explicitly added later.';
