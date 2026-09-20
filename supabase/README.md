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

## `sync_presets` row-level security: captured and tightened

Recorded live 2026-09-20, closing the follow-up this file and Planing-Ledger.md
Section 8 both listed as never captured.

**As found:** RLS was on (`forced = false`, correctly — the SECURITY DEFINER
functions run as the owner and must bypass it), with two policies —
`Allow anonymous read` (SELECT, `USING (true)`) and `Allow anonymous insert`
(INSERT, `WITH CHECK (true)`). `anon` and `authenticated` each held INSERT,
SELECT, UPDATE, DELETE, TRUNCATE, REFERENCES and TRIGGER. The table held no
identifying columns (`id`, `video_id`, `audio_id`, `offset_ms`, `votes`,
`created_at`) and was empty.

**The hole:** the insert policy let anyone POST straight to
`/rest/v1/sync_presets` with the public anon key, skipping
`safe_insert_preset`'s server-side rate limiting entirely. UPDATE and DELETE
were already neutralised by RLS (no policy covers them), but only by that one
layer — and TRUNCATE is not subject to RLS at all, so there the grant was the
only barrier.

`supabase/migrations/0003_sync_presets_least_privilege.sql` drops the insert
policy and revokes every write privilege from `anon`/`authenticated`, leaving
SELECT. Nothing in the client breaks: `useCloudSync.ts` and `AdminPanel.tsx`
only ever `.select('*')`, and all three write paths are SECURITY DEFINER RPCs.

## `vote_log` and the admin tables

Recorded live 2026-09-20 alongside `sync_presets`, completing the sweep.

`vote_log` (`id`, `preset_id`, `voter_hash`, `created_at`) is where
`safe_increment_vote` records who has voted. **It had no SELECT policy, so the
voter fingerprints were never readable through the API** — worth stating plainly,
since `voter_hash` is `btoa()` of user agent + screen size + language + timezone
(see `useCloudSync.ts`), which is base64, not a hash, and therefore reversible.

It did carry `Allow anonymous insert on vote_log` with `WITH CHECK (true)`. That
turned the dedup check into a weapon: plant a row for a `voter_hash` that has not
voted yet and the real vote bounces as a duplicate. The fingerprint space is
small and guessable, so seeding the common ones would have suppressed voting for
most visitors.

`admin_config`, `login_attempts` and `admin_login_attempts` all had RLS on with
zero policies, which correctly denies anon everything — except TRUNCATE, which
Postgres does not subject to RLS. Emptying the two attempt tables would reset the
brute-force throttle and lockout; emptying `admin_config` would drop
`admin_password_hash` and lock the admin out for good.

`supabase/migrations/0004_internal_tables_least_privilege.sql` drops that insert
policy and revokes every privilege on all four tables from `anon` and
`authenticated`. Nothing in the client names any of them — only the SECURITY
DEFINER functions touch them, and those run as the owner.

### Applied live 2026-09-21

Both `0003` and `0004` were executed against the live database on 2026-09-21,
following the same manual SQL-editor route as `0001`/`0002`.

State was captured immediately before and after. Before: 73 rows — all seven
privileges on all five tables for both `anon` and `authenticated`, plus the two
anonymous-insert policies. After: 3 rows — `SELECT` on `sync_presets` for both
roles and the `Allow anonymous read` policy, nothing else. The before-capture was
exported to CSV and is held by the author; both captures are recorded in
`docs/thesis/research/EVIDENCE_INDEX.md` (S-15, S-16).


## Admin brute-force protection: server-side lockout designed, not yet live

`AdminPanel.tsx` counts failed attempts and locks the form for 30 seconds, but that
state lives in React. It resets on reload, and more importantly the RPCs above are
reachable directly with the public anon key — from the browser console, or curl —
which bypasses the UI entirely.

`supabase/migrations/0001_admin_lockout_serverside.sql` implements a per-caller
(`inet_client_addr()`-keyed) attempt-tracking table plus lockout-check/record/reset
helper functions, matching the existing 3-attempt/30-second UX values.

**Applied live 2026-07-22.** Live investigation at apply-time found
`verify_admin_password`/`admin_delete_preset` already had a separate,
pre-existing **global** (not per-caller) brute-force gate — a `login_attempts`
table counting all failures across all callers in the last 5 minutes, a 1s
`pg_sleep()` throttle, and a hashed (`crypt()`) password compare. This wasn't
evidenced in any planning document; AUTOPSY-P1-01 assumed no server-side
protection existed. Decision: keep the global gate untouched and layer the new
per-IP lockout on top as an independent, additional check — see
`supabase/migrations/0000_baseline_asis.sql` (pre-change bodies) and
`supabase/migrations/0002_admin_lockout_integration_applied.sql` (as-applied
bodies, both gates active). `AdminPanel.tsx`'s client-side lock is now backed by
two real server-side gates, not just UX.

Longer term, replace the shared password with Supabase Auth and a real admin account
so the check is delegated to an audited system instead of a secret compared in SQL.

## Backup/retention policy for `sync_presets`

Confirmed against the live project (2026-07-22): this project is on Supabase's **Free
tier**, which does not include automatic backups or point-in-time recovery. `sync_presets`
today has **zero automated backup coverage** — a truncation or corruption (accidental or
via a bug in `admin_delete_preset`) is currently unrecoverable except by users
re-contributing their offsets.

**Policy decision: accept this risk; no additional application-level backup is added.**
`sync_presets` holds community-contributed, votable offset presets, not user-private or
otherwise irreplaceable data (see `Project-Ontology.md` Section 4) — every row is
re-derivable because any user can re-submit the same video/audio offset pair. Building a
custom export/backup pipeline for data this cheap to regenerate would be disproportionate
engineering effort relative to the actual risk, consistent with this project's
evidence-based, appropriately-scoped approach to Phase 6.

**Revisit this decision if:**
- The project moves to Supabase's Pro tier (or higher) for other reasons — at that point,
  the included daily backups apply to `sync_presets` automatically, at no extra effort.
- `sync_presets` ever starts holding data that isn't cheaply re-derivable by users (e.g., if
  a future feature attaches non-recreatable content to a preset row).
- A real data-loss incident occurs — at that point, a lightweight manual export (e.g., a
  periodic `pg_dump`/CSV export of `sync_presets` run from the dashboard's SQL editor) is
  the appropriately-scoped first mitigation to reach for, before anything more automated.
