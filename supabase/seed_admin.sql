-- =============================================================================
-- seed_admin.sql
-- The admin login, admin@yellowpointlodge.com: the one login the admin area
-- (/admin) opens for, and the only one that can change the tax rates and the
-- price list (0033).
--
-- Loaded after seed.sql by `supabase db reset` (config.toml), and applied to
-- the hosted project with run_remote_sql.py once its signup allowlist names
-- the login (staging/staging_hardening.sql). Leaves an existing login as it
-- is, and does nothing on a PostgreSQL without Supabase's auth schema.
--
-- The repository is public, so only the password's bcrypt hash is kept here.
-- =============================================================================

do $$
declare
  v_id uuid := gen_random_uuid();
begin
  if to_regclass('auth.users') is null then
    return;
  end if;
  if exists (select 1 from auth.users where lower(email) = 'admin@yellowpointlodge.com') then
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated',
    'admin@yellowpointlodge.com',
    '$2a$12$3E/P/sz4XEMNYjXvbEptKO1yyP4Ze7DBpprdDkXCnnUKR95WtpKDO',
    now(),
    '{"provider": "email", "providers": ["email"]}', '{}', now(), now(),
    '', '', '', ''
  );

  insert into auth.identities (
    id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at
  ) values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', 'admin@yellowpointlodge.com', 'email_verified', true),
    'email', now(), now(), now()
  );
end$$;
