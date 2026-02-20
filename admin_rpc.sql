-- ═══════════════════════════════════════════════════════════════════════════
-- SynCinema - Secure Admin Deletion RPC
-- @author Ruslan Aliyev
-- ═══════════════════════════════════════════════════════════════════════════
-- This function allows the project owner to securely delete a sync preset
-- without exposing permissions to anonymous users. It bypasses RLS safely
-- using the SECURITY DEFINER attribute.
CREATE OR REPLACE FUNCTION admin_delete_preset(p_id UUID, p_secret TEXT) RETURNS BOOLEAN LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE -- REPLACE 'YourSuperSecretAdminPassword2026!' WITH your actual master password!
    -- This password should only be known to you, the project owner.
    v_master_secret TEXT := 'YourSuperSecretAdminPassword2026!';
v_rows_deleted INT;
BEGIN -- 1. Check if the provided secret matches the master secret
IF p_secret != v_master_secret THEN RAISE EXCEPTION 'Unauthorized: Invalid admin secret.';
END IF;
-- 2. Delete the record
DELETE FROM sync_presets
WHERE id = p_id;
-- 3. Check if anything was actually deleted
GET DIAGNOSTICS v_rows_deleted = ROW_COUNT;
IF v_rows_deleted > 0 THEN RETURN TRUE;
ELSE RETURN FALSE;
END IF;
END;
$$;