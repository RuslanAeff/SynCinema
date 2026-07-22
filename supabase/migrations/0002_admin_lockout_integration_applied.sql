-- Faz2.2 integration step, actually applied live 2026-07-22.
--
-- 0001_admin_lockout_serverside.sql only added the IP-keyed lockout helper
-- functions (admin_lockout_is_locked/record_failure/reset) without touching
-- verify_admin_password/admin_delete_preset, because at authoring time this
-- repo had no live access to see their real bodies.
--
-- Live investigation during this Step 4 session found those two functions
-- ALREADY implement a separate, pre-existing, GLOBAL (not per-caller)
-- brute-force gate: a `login_attempts` table counting all failures across
-- all callers in the last 5 minutes, a 1s pg_sleep() throttle, and a hashed
-- (crypt()) password compare against `admin_config.admin_password_hash`.
-- This was not evidenced anywhere in Main-Planing.md/Autopsy.md/the Faz2.2
-- sub-plan -- AUTOPSY-P1-01 assumed no server-side protection existed at all.
--
-- Decision (user-confirmed): keep the existing global gate exactly as-is
-- (unchanged, zero lines touched) and layer the new per-IP lockout as an
-- ADDITIONAL, independent gate on top -- defense in depth. Rationale: the
-- global gate protects against distributed multi-IP brute force but lets one
-- bad actor lock out the real admin from any IP; the per-IP gate protects the
-- admin's own access without weakening the distributed-attack protection.
--
-- See supabase/migrations/0000_baseline_asis.sql for the pre-this-migration
-- bodies of both functions.

CREATE OR REPLACE FUNCTION public.verify_admin_password(p_secret text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_stored_hash TEXT;
    v_recent_failures INT;
    v_is_valid BOOLEAN;
    v_caller_key TEXT := coalesce(inet_client_addr()::text, 'unknown');
BEGIN
    IF admin_lockout_is_locked(v_caller_key) THEN
        RAISE EXCEPTION 'Rate limited: too many failed attempts from this location. Try again in 30 seconds.';
    END IF;

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

    IF v_is_valid THEN
        PERFORM admin_lockout_reset(v_caller_key);
    ELSE
        PERFORM admin_lockout_record_failure(v_caller_key);
    END IF;

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
    v_caller_key TEXT := coalesce(inet_client_addr()::text, 'unknown');
BEGIN
    IF admin_lockout_is_locked(v_caller_key) THEN
        RAISE EXCEPTION 'Rate limited: too many failed attempts from this location. Try again in 30 seconds.';
    END IF;

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
        PERFORM admin_lockout_record_failure(v_caller_key);
        RAISE EXCEPTION 'Unauthorized: Invalid admin secret.';
    END IF;

    PERFORM admin_lockout_reset(v_caller_key);
    INSERT INTO login_attempts (success) VALUES (TRUE);
    DELETE FROM sync_presets WHERE id = p_id;
    GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
    DELETE FROM login_attempts WHERE attempted_at < (NOW() - INTERVAL '1 hour');

    IF v_rows_deleted > 0 THEN RETURN TRUE; ELSE RETURN FALSE; END IF;
END;
$$;
