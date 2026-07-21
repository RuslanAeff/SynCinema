# Supabase — server-side definitions

The client calls four Postgres functions. Historically these existed **only in the
Supabase dashboard**; `supabase/migrations/` is now the source of truth going forward
for any new/changed RPC logic (see Faz2.2/Faz2.3), though the dashboard still holds
the authoritative current state until each function is captured here:

| RPC | Called from | Purpose |
| --- | --- | --- |
| `verify_admin_password(p_secret)` | `src/components/AdminPanel.tsx` | Admin login check |
| `admin_delete_preset(p_id, p_secret)` | `src/components/AdminPanel.tsx` | Delete a community preset |
| `safe_insert_preset(p_video_id, p_audio_id, p_offset_ms)` | `src/hooks/useCloudSync.ts` | Insert a preset with server-side rate limiting |
| `safe_increment_vote(p_row_id, p_voter_hash)` | `src/hooks/useCloudSync.ts` | Upvote with server-side deduplication |

`supabase/migrations/0000_baseline_asis.sql` (still pending — requires live dashboard/
CLI access not available in the environment that authored `0001`) should capture each
function's current definition (`pg_dump --schema-only`, or copy from the dashboard's
SQL editor) together with the RLS policies on `sync_presets`, before `0001` below is
applied live, so the baseline reflects pre-fix reality. Only real secrets belong in
`.gitignore` — the function bodies do not (`.gitignore` now allows
`supabase/migrations/*.sql` specifically).

## Admin brute-force protection: server-side lockout designed, not yet live

`AdminPanel.tsx` counts failed attempts and locks the form for 30 seconds, but that
state lives in React. It resets on reload, and more importantly the RPCs above are
reachable directly with the public anon key — from the browser console, or curl —
which bypasses the UI entirely.

`supabase/migrations/0001_admin_lockout_serverside.sql` implements the fix: a
per-caller (`inet_client_addr()`-keyed) attempt-tracking table plus lockout-check/
record/reset helper functions, matching the existing 3-attempt/30-second UX values.
**This migration is not yet applied to the live project** — applying it requires
wiring the helper functions into `verify_admin_password`/`admin_delete_preset`'s
existing bodies (see the integration note at the bottom of the migration file) via
the dashboard, and confirming with a direct RPC call that bypasses `AdminPanel.tsx`.
Treat the client-side lock as UX only until that live step is done and confirmed.

Longer term, replace the shared password with Supabase Auth and a real admin account
so the check is delegated to an audited system instead of a secret compared in SQL.
