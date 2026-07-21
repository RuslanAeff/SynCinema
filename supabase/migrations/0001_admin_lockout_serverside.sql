-- Faz2.2 — Server-side brute-force lockout for the admin RPCs.
--
-- Closes AUTOPSY-P1-01: verify_admin_password/admin_delete_preset are
-- reachable directly with the public anon key (browser console, curl),
-- which bypasses AdminPanel.tsx's client-side-only lockout entirely.
-- supabase/README.md already named this fix; this migration implements it.
--
-- Design: a small per-caller attempt-tracking table, keyed by
-- inet_client_addr(). Known, accepted limitation: callers sharing a NAT/
-- proxy share a caller_key, so one bad actor can lock out unrelated
-- legitimate attempts from the same IP -- accepted for a low-traffic
-- personal project (see Faz2.2 sub-plan, Section 11).
--
-- IMPORTANT — integration note:
-- This migration does NOT redefine verify_admin_password or
-- admin_delete_preset, because their current password-comparison
-- expression is not readable from this repository (no live Supabase
-- access in this environment; see Faz2.3's still-pending baseline
-- export). Redefining those functions here would mean guessing at
-- production logic this session cannot verify. Instead, this migration
-- provides the complete, reviewable lockout mechanism as three helper
-- functions; wire them into the existing function bodies by hand
-- (see the integration snippet at the bottom of this file) so the
-- existing password check is preserved exactly as-is.

create table if not exists admin_login_attempts (
    caller_key    text primary key,
    attempt_count integer not null default 0,
    locked_until  timestamptz,
    updated_at    timestamptz not null default now()
);

-- Threshold/cooldown match the existing client-side UX values
-- (AdminPanel.tsx: MAX_FAILED_ATTEMPTS = 3, LOCKOUT_DURATION_MS = 30000ms)
-- so the server-side gate is not perceptibly stricter for a normal user.

create or replace function admin_lockout_is_locked(p_caller_key text)
returns boolean
language sql
security definer
set search_path = public
as $$
    select coalesce(
        (select locked_until > now()
         from admin_login_attempts
         where caller_key = p_caller_key),
        false
    );
$$;

create or replace function admin_lockout_record_failure(p_caller_key text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
    v_count integer;
begin
    insert into admin_login_attempts (caller_key, attempt_count, updated_at)
    values (p_caller_key, 1, now())
    on conflict (caller_key) do update
        set attempt_count = admin_login_attempts.attempt_count + 1,
            updated_at = now()
    returning attempt_count into v_count;

    if v_count >= 3 then
        update admin_login_attempts
            set locked_until = now() + interval '30 seconds'
            where caller_key = p_caller_key;
    end if;
end;
$$;

create or replace function admin_lockout_reset(p_caller_key text)
returns void
language sql
security definer
set search_path = public
as $$
    delete from admin_login_attempts where caller_key = p_caller_key;
$$;

-- ─────────────────────────────────────────────────────────────────────────
-- Integration (apply by hand against the existing live function bodies via
-- the Supabase dashboard SQL editor; do not blindly overwrite
-- verify_admin_password/admin_delete_preset from this file):
--
--   at the top of verify_admin_password(p_secret):
--     declare v_caller_key text := coalesce(inet_client_addr()::text, 'unknown');
--     begin
--       if admin_lockout_is_locked(v_caller_key) then
--         return false;  -- do not leak lockout state to an unauthenticated caller
--       end if;
--       -- <existing password comparison, unchanged> --
--       if <existing comparison> then
--         perform admin_lockout_reset(v_caller_key);
--         return true;
--       else
--         perform admin_lockout_record_failure(v_caller_key);
--         return false;
--       end if;
--     end;
--
--   apply the same pattern to admin_delete_preset(p_id, p_secret), using
--   the same caller_key derivation and lockout calls around its own
--   existing p_secret comparison.
-- ─────────────────────────────────────────────────────────────────────────
