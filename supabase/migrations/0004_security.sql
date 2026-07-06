-- =============================================================================
-- 0004_security.sql
-- Supabase grants/RLS for the YPL production schema.
-- =============================================================================
-- Yellow Point Lodge remains a trusted back-office application: authenticated
-- staff can read/write production tables; anon/public access receives nothing.
-- The service role and SQL editor remain available for controlled migration/admin.
-- =============================================================================

set search_path = ypl, public;

grant usage on schema ypl to authenticated, service_role;

grant all on all tables in schema ypl to authenticated, service_role;
grant all on all sequences in schema ypl to authenticated, service_role;
grant execute on all functions in schema ypl to authenticated, service_role;

alter default privileges in schema ypl grant all on tables to authenticated, service_role;
alter default privileges in schema ypl grant all on sequences to authenticated, service_role;
alter default privileges in schema ypl grant execute on functions to authenticated, service_role;

-- Enable RLS on every production table and create one staff policy per table.
do $$
declare
  r record;
  policy_name text;
begin
  for r in
    select schemaname, tablename
      from pg_tables
     where schemaname = 'ypl'
     order by tablename
  loop
    execute format('alter table %I.%I enable row level security', r.schemaname, r.tablename);
    policy_name := r.tablename || '_staff_all';
    if not exists (
      select 1
        from pg_policies
       where schemaname = r.schemaname
         and tablename = r.tablename
         and policyname = policy_name
    ) then
      execute format(
        'create policy %I on %I.%I for all to authenticated using (true) with check (true)',
        policy_name, r.schemaname, r.tablename
      );
    end if;
  end loop;
end$$;

comment on schema ypl is
  'RLS enabled: authenticated staff have full access; anon has no grants. Contains Yellow Point Lodge production tables, views, and RPCs.';
