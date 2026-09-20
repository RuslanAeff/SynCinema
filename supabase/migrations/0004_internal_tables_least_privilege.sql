-- ═══════════════════════════════════════════════════════════════════════════
--  vote_log and the admin tables: reachable only through their own functions
-- ═══════════════════════════════════════════════════════════════════════════
--
-- None of these four tables is ever named by the client. Confirmed by grep over
-- src/: only sync_presets appears in a .from() call. Everything here is reached
-- exclusively through SECURITY DEFINER functions (safe_increment_vote,
-- verify_admin_password, admin_delete_preset), which run as the table owner and
-- are therefore untouched by anything below.
--
-- State captured before applying (2026-09-20):
--   vote_log             rls=true, 1 policy: "Allow anonymous insert on
--                        vote_log" INSERT WITH CHECK (true); 0 rows
--                        columns: id, preset_id, voter_hash, created_at
--   admin_config         rls=true, 0 policies
--   login_attempts       rls=true, 0 policies
--   admin_login_attempts rls=true, 0 policies
--   all four: anon and authenticated hold
--             INSERT, SELECT, UPDATE, DELETE, TRUNCATE

-- ── 1. vote_log's insert policy turns the dedup check into a weapon ─────────
-- safe_increment_vote refuses a second vote from the same voter_hash. With a
-- direct insert path open, rows can be planted for hashes that have not voted
-- yet, which makes the real vote bounce as a duplicate. voter_hash is
-- btoa(userAgent + screen + language + timezone) truncated to 64 chars -- a
-- small, guessable space -- so seeding the common ones would suppress voting
-- for most visitors. The function inserts as owner, so it keeps working.
DROP POLICY IF EXISTS "Allow anonymous insert on vote_log" ON public.vote_log;

-- Note on what was NOT found: vote_log has no SELECT policy, so those
-- fingerprints were never readable through the API. Nothing leaked.

-- ── 2. Privileges on tables the browser never names ─────────────────────────
-- RLS with zero policies already denies SELECT/INSERT/UPDATE/DELETE to anon on
-- the three admin tables. TRUNCATE is the gap: Postgres does not apply RLS to
-- TRUNCATE, so the grant is the only barrier, and losing these tables is not
-- cosmetic --
--   login_attempts / admin_login_attempts hold the brute-force counters, so
--     emptying them resets the throttle and the lockout that protect the admin
--     password;
--   admin_config holds admin_password_hash, so emptying it makes
--     verify_admin_password find NULL and refuse every login from then on.
-- PostgREST exposes no TRUNCATE verb, so this is not reachable with the anon
-- key today. It is removed because the grant is what keeps it that way.
REVOKE ALL ON TABLE public.vote_log             FROM anon, authenticated;
REVOKE ALL ON TABLE public.admin_config         FROM anon, authenticated;
REVOKE ALL ON TABLE public.login_attempts       FROM anon, authenticated;
REVOKE ALL ON TABLE public.admin_login_attempts FROM anon, authenticated;

-- ── Verify after applying ──────────────────────────────────────────────────
-- Expect no rows at all from this: anon and authenticated should hold nothing
-- on any of the four.
--
--   select table_name, grantee, privilege_type
--   from information_schema.role_table_grants
--   where table_schema = 'public'
--     and table_name in ('vote_log', 'admin_config',
--                        'login_attempts', 'admin_login_attempts')
--     and grantee in ('anon', 'authenticated');
--
-- And vote_log should have no policies left:
--
--   select polname from pg_policy
--   where polrelid = 'public.vote_log'::regclass;
--
-- Then confirm the app still works: cast a sync vote (exercises
-- safe_increment_vote -> vote_log) and log into the admin panel
-- (exercises verify_admin_password -> admin_config + login_attempts).
