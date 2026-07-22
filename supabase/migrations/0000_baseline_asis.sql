-- Baseline snapshot of verify_admin_password / admin_delete_preset AS THEY EXISTED
-- LIVE, before Faz2.2's IP-based lockout layer (0001) was wired in.
--
-- Captured 2026-07-22 by copying the live "Edit Function" definitions directly
-- from the Supabase dashboard (Database > Functions) during the Faz2.2 Step 4
-- live-execution session. This is NOT a full schema dump (pg_dump was not
-- available in any authoring session) -- it covers only these two functions,
-- reconstructed from their confirmed signature (Database > Functions:
-- verify_admin_password(p_secret text) returns boolean;
-- admin_delete_preset(p_id uuid, p_secret text) returns boolean; both
-- confirmed SECURITY DEFINER via `select proname, prosecdef from pg_proc`)
-- plus the exact DECLARE/BEGIN/END body text as pasted from the dashboard.
--
-- Also confirmed live at the same time: a pre-existing `login_attempts` table
-- (columns used: attempted_at, success) and an `admin_config` table
-- (key/value, holding 'admin_password_hash') already existed and were NOT
-- created by any migration authored in this repo -- they predate this
-- session's ClaudeQB-planned work entirely. Neither table's own DDL was
-- captured here (out of scope for this baseline; only the two RPC bodies
-- that Faz2.2 modifies are captured).
--
-- safe_insert_preset / safe_increment_vote and sync_presets' RLS policies
-- are still NOT captured anywhere -- that remains an open follow-up (see
-- Planing-Ledger.md Section 8).

CREATE OR REPLACE FUNCTION public.verify_admin_password(p_secret text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_hash TEXT;
    v_recent_failures INT;
    v_is_valid BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO v_recent_failures
    FROM login_attempts
    WHERE attempted_at > (NOW() - INTERVAL '5 minutes')
      AND success = FALSE;

    IF v_recent_failures >= 5 THEN
        INSERT INTO login_attempts (success) VALUES (FALSE);
        RAISE EXCEPTION 'Rate limited: too many failed attempts. Try again in 5 minutes.';
    END IF;

    PERFORM pg_sleep(1);

    SELECT value INTO v_stored_hash
    FROM admin_config WHERE key = 'admin_password_hash';

    IF v_stored_hash IS NULL THEN
        INSERT INTO login_attempts (success) VALUES (FALSE);
        RETURN FALSE;
    END IF;

    v_is_valid := crypt(p_secret, v_stored_hash) = v_stored_hash;
    INSERT INTO login_attempts (success) VALUES (v_is_valid);
    DELETE FROM login_attempts WHERE attempted_at < (NOW() - INTERVAL '1 hour');
    RETURN v_is_valid;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_delete_preset(p_id uuid, p_secret text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_hash TEXT;
    v_recent_failures INT;
    v_rows_deleted INT;
BEGIN
    SELECT COUNT(*) INTO v_recent_failures
    FROM login_attempts
    WHERE attempted_at > (NOW() - INTERVAL '5 minutes')
      AND success = FALSE;

    IF v_recent_failures >= 5 THEN
        INSERT INTO login_attempts (success) VALUES (FALSE);
        RAISE EXCEPTION 'Rate limited: too many failed attempts. Try again in 5 minutes.';
    END IF;

    PERFORM pg_sleep(1);

    SELECT value INTO v_stored_hash
    FROM admin_config WHERE key = 'admin_password_hash';

    IF v_stored_hash IS NULL THEN
        INSERT INTO login_attempts (success) VALUES (FALSE);
        RAISE EXCEPTION 'Unauthorized: Admin not configured.';
    END IF;

    IF crypt(p_secret, v_stored_hash) != v_stored_hash THEN
        INSERT INTO login_attempts (success) VALUES (FALSE);
        RAISE EXCEPTION 'Unauthorized: Invalid admin secret.';
    END IF;

    INSERT INTO login_attempts (success) VALUES (TRUE);
    DELETE FROM sync_presets WHERE id = p_id;
    GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
    DELETE FROM login_attempts WHERE attempted_at < (NOW() - INTERVAL '1 hour');

    IF v_rows_deleted > 0 THEN RETURN TRUE; ELSE RETURN FALSE; END IF;
END;
$$;
