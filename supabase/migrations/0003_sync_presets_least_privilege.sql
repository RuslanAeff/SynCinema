-- ═══════════════════════════════════════════════════════════════════════════
--  sync_presets: leave one write path open, and close the rest
-- ═══════════════════════════════════════════════════════════════════════════
--
-- Every client write already goes through a SECURITY DEFINER function
-- (safe_insert_preset, safe_increment_vote, admin_delete_preset), each running
-- as the table owner and therefore unaffected by everything below. The browser
-- touches the table directly only to SELECT -- confirmed in useCloudSync.ts and
-- AdminPanel.tsx, which use .select('*') and nothing else.
--
-- State captured before applying (2026-09-20):
--   rls           = true (forced = false)
--   policies      = "Allow anonymous read"   SELECT USING (true)
--                   "Allow anonymous insert" INSERT WITH CHECK (true)
--   anon grants   = INSERT, SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
--   columns       = id, video_id, audio_id, offset_ms, votes, created_at
--   rows          = 0
--
-- This also finally captures the sync_presets RLS state that
-- supabase/README.md and Planing-Ledger.md Section 8 list as never recorded.

-- ── 1. The insert policy walked straight around safe_insert_preset ──────────
-- PostgREST exposes POST /rest/v1/sync_presets, and WITH CHECK (true) accepted
-- anything, so the function's server-side rate limiting could simply be skipped
-- with the public anon key.
DROP POLICY IF EXISTS "Allow anonymous insert" ON public.sync_presets;

-- ── 2. Privileges the browser never uses ───────────────────────────────────
-- RLS already neutralises UPDATE and DELETE for anon, since no policy covers
-- them -- but that is a single layer: turning RLS off in the dashboard would
-- hand back full write access in one click. TRUNCATE is worse, because Postgres
-- does not apply RLS to TRUNCATE at all, leaving the grant as the only thing in
-- the way.
REVOKE INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER
    ON public.sync_presets FROM anon, authenticated;

-- ── 3. SELECT stays ────────────────────────────────────────────────────────
-- Reading community presets is the feature, the rows carry nothing identifying
-- (the voter fingerprint lives in safe_increment_vote's own table, not here),
-- so "Allow anonymous read" USING (true) is intentional and kept.

-- ── Deliberately NOT done ──────────────────────────────────────────────────
-- ALTER TABLE public.sync_presets FORCE ROW LEVEL SECURITY;
--   FORCE applies RLS to the table owner as well, which is exactly who the
--   SECURITY DEFINER functions run as. It would break every write path in the
--   app. forced = false is correct here.

-- ── Verify after applying ──────────────────────────────────────────────────
-- Expect one policy (read/SELECT) and anon holding SELECT only:
--
--   select polname, polcmd from pg_policy
--   where polrelid = 'public.sync_presets'::regclass;
--
--   select grantee, privilege_type
--   from information_schema.role_table_grants
--   where table_schema = 'public' and table_name = 'sync_presets'
--     and grantee in ('anon', 'authenticated');
