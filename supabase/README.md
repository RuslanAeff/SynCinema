# Supabase — server-side definitions

The client calls four Postgres functions that currently exist **only in the Supabase
dashboard**, so they are not reviewable, diffable, or reproducible in a fresh project:

| RPC | Called from | Purpose |
| --- | --- | --- |
| `verify_admin_password(p_secret)` | `src/components/AdminPanel.tsx` | Admin login check |
| `admin_delete_preset(p_id, p_secret)` | `src/components/AdminPanel.tsx` | Delete a community preset |
| `safe_insert_preset(p_video_id, p_audio_id, p_offset_ms)` | `src/hooks/useCloudSync.ts` | Insert a preset with server-side rate limiting |
| `safe_increment_vote(p_row_id, p_voter_hash)` | `src/hooks/useCloudSync.ts` | Upvote with server-side deduplication |

Export each function's definition into `migrations/` (`pg_dump --schema-only`, or copy
from the dashboard's SQL editor) together with the RLS policies on `sync_presets`.
Only real secrets belong in `.gitignore` — the function bodies do not.

## Open issue: admin brute-force protection is client-side only

`AdminPanel.tsx` counts failed attempts and locks the form for 30 seconds, but that
state lives in React. It resets on reload, and more importantly the RPCs above are
reachable directly with the public anon key — from the browser console, or curl —
which bypasses the UI entirely.

The lockout has to live in `verify_admin_password` and `admin_delete_preset`:
record failed attempts per caller (IP via `inet_client_addr()`, or a passed hash),
and reject while a cooldown is active. Treat the client-side lock as UX only.

Longer term, replace the shared password with Supabase Auth and a real admin account
so the check is delegated to an audited system instead of a secret compared in SQL.
