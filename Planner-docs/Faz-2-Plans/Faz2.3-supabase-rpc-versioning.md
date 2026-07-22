# Faz 2.3 — Supabase RPC Versioning and Migrations Directory

## 1. Context

`Main-Planing.md` Section 4 (Target End State, Operational target): "the four Supabase RPC functions ... exist as versioned SQL migrations in the repository, not only in the Supabase dashboard." `Autopsy.md` **AUTOPSY-P1-02** frames this as a governance gap distinct from a pure security gap: "nobody can review, diff, or safely reconstruct this logic if lost." `Main-Planing.md` Section 5 independently calls this out: "RPC definitions currently live outside version control, which is a governance gap, not just a code gap." `Autopsy.md` Section 12 explicitly recommends narrowing (not removing) `.gitignore`'s blanket `*.sql` exclusion to allow versioned migrations while still excluding genuinely local/scratch SQL.

## 2. Goal

Bring all four Supabase RPC function definitions (`verify_admin_password`, `admin_delete_preset`, `safe_insert_preset`, `safe_increment_vote`) and the `sync_presets` table's RLS policies into version control as reviewable, diffable SQL migration files, closing the bus-factor and audit gap `Autopsy.md` identifies.

## 3. Description

**Problem solved:** The entire server-side authorization and rate-limiting logic for the admin panel and community sync feature exists only in the Supabase dashboard. `.gitignore` currently excludes all `*.sql` files, and no `supabase/migrations/` directory exists. If the Supabase project were lost or the dashboard state diverged from what anyone remembers, this logic is unrecoverable from the repository alone.

**Why it belongs at this point:** Sequenced third in Phase 2 — after Faz2.1 (self-contained, no dependency) and closely coordinated with Faz2.2 (which produces the first real migration content, the admin-lockout fix) — because it is most efficient to create the migrations directory structure at the same time as the first substantive migration lands, rather than as a separate empty-scaffold step.

**Risk reduction:** Directly closes AUTOPSY-P1-02; converts an entirely undocumented-in-code system into an auditable one.

**How it prepares later phases:** Phase 6 (Production Readiness) references backup/retention policy for `sync_presets` (Faz6.3), which is far more concrete once the actual schema and RLS policies are known and versioned rather than assumed.

**Vibecoding slice strategy:**
- First useful slice: export the four RPC definitions and the `sync_presets` table's RLS policies from the live Supabase dashboard exactly as they currently exist (no redesign), and commit them as a baseline migration — capturing current reality before changing anything.
- Fastest validation signal: the exported SQL, when reviewed, should exactly describe the behavior already observed from the client-side call sites (`useCloudSync.ts`, `AdminPanel.tsx`) — any mismatch between exported SQL and observed client behavior is itself a new finding worth surfacing, not silently reconciling.
- What not to over-plan yet: do not redesign the RLS policies or RPC logic as part of this export — that is Faz2.2's job for the admin-lockout piece specifically; this sub-phase's default scope is capture-as-is plus directory/gitignore plumbing.

## 4. Scope

- Creating a `supabase/migrations/` directory.
- Narrowing `.gitignore`'s blanket `*.sql` exclusion so files under `supabase/migrations/` are tracked while other, genuinely local/scratch `*.sql` files remain excluded (e.g., `!supabase/migrations/*.sql` exception pattern, or scoping the ignore rule to a specific local-scratch path instead of a blanket extension match).
- Exporting the current, as-is definitions of `verify_admin_password`, `admin_delete_preset`, `safe_insert_preset`, `safe_increment_vote`, and the `sync_presets` table's RLS policies from the live Supabase project (via `pg_dump --schema-only` or the dashboard's SQL editor, per `supabase/README.md`'s own suggested method).
- Committing the export as a baseline migration file (or set of files), timestamped/numbered in a way that composes cleanly with Faz2.2's admin-lockout migration (coordinate numbering so Faz2.2's migration is either included in or clearly sequenced after this baseline).
- Updating `supabase/README.md` to reference the new `migrations/` directory as the source of truth going forward, superseding its current "only in the dashboard" framing.

## 5. Out of Scope

- Redesigning any RPC's logic beyond what Faz2.2 already covers for the admin-lockout piece specifically.
- Setting up an automated migration-apply pipeline (e.g., Supabase CLI in CI) — that is a reasonable future addition but not evidenced as required by any current target; note it as a deferred idea rather than building it now.
- Any change to the anon-key exposure model — that is explicitly Phase 7 (commercialization-gated) territory per `Project-Ontology.md` Section 8's open question on RLS/anon-key exposure at commercial scale.

## 6. Current Repository Evidence

- `supabase/README.md` (full file) — documents the four RPCs' names, callers, and purposes, and explicitly states "Export each function's definition into `migrations/` (`pg_dump --schema-only`, or copy from the dashboard's SQL editor) together with the RLS policies on `sync_presets`. Only real secrets belong in `.gitignore` — the function bodies do not."
- `.gitignore` — confirmed (per `Autopsy.md` Section 2) to exclude all `*.sql` files with no exception, alongside `.env`/`.env.local`/`.env.production`.
- No `supabase/migrations/` directory exists (confirmed via repository `find`).
- `Autopsy.md` Section 9 — "Least privilege: ... The admin RPCs rely entirely on a shared-password check inside the RPC itself, not on a separate privilege tier."
- `Project-Ontology.md` Section 6 — "four RPCs are the entire server-side authorization surface and are not version-controlled in this repository."

## 7. Planned Work Breakdown

- **F2.3-01 — Narrow the `.gitignore` SQL exclusion**
  - Description: Change the blanket `*.sql` rule to exclude only genuinely local/scratch SQL (e.g., a `*.local.sql` pattern or a dedicated `supabase/scratch/` path) while allowing `supabase/migrations/*.sql` to be tracked.
  - Output: Updated `.gitignore`.
- **F2.3-02 — Export current RPC and RLS definitions from the live project**
  - Description: Use `pg_dump --schema-only` (or the Supabase dashboard's SQL editor, copying each function's exact current body) to capture `verify_admin_password`, `admin_delete_preset`, `safe_insert_preset`, `safe_increment_vote`, and `sync_presets`'s RLS policies as they exist today, before any Faz2.2 redesign is applied.
  - Output: Raw exported SQL, reviewed for secrets (none expected — function bodies are not secrets per `supabase/README.md`) before committing.
- **F2.3-03 — Commit the baseline migration**
  - Description: Structure the export as one or more numbered migration files under `supabase/migrations/` (e.g., `0000_baseline_asis.sql`), coordinated with Faz2.2 so its lockout migration is numbered/sequenced after this baseline rather than colliding with it.
  - Output: Committed migration file(s).
- **F2.3-04 — Update `supabase/README.md`**
  - Description: Revise the document to point to `supabase/migrations/` as the current source of truth, retaining the existing "Open issue" section only until Faz2.2 confirms it closed, at which point this sub-phase (or Faz2.2's own completion) should mark it resolved.
  - Output: Updated `supabase/README.md`.

## 8. Acceptance Criteria

- `supabase/migrations/` exists and contains SQL definitions for all four RPCs and the `sync_presets` RLS policies.
- `.gitignore` no longer blanket-excludes `*.sql`; it excludes only an explicitly-scoped local/scratch pattern.
- The exported SQL is reviewed and confirmed to contain no secret values (only function logic, matching `supabase/README.md`'s own statement that function bodies are not secrets).
- `supabase/README.md` is updated to reference the migrations directory as current source of truth.
- If the exported SQL reveals any behavior that contradicts what the client-side code (`useCloudSync.ts`, `AdminPanel.tsx`) assumes, that mismatch is explicitly documented as a new finding rather than silently reconciled or ignored.

## 9. Validation and Test Approach

- **Live validation (primary):** the export itself is inherently a live-environment read (VAL-LIVE-EXPORT) — pulling current state from the live Supabase project; this is read-only against the live database (no mutation) and lower-risk than Faz2.2's live-execution step.
- **Secret scan:** run the bundled ClaudeQB-equivalent length-bounded secret check (or manual review) over the exported SQL before committing, confirming no credentials or tokens are embedded (VAL-SEC-SCAN).
- **Local validation:** `git diff --check` on the new files for basic formatting sanity; no build/typecheck impact expected since this sub-phase does not touch TypeScript source.
- This sub-phase is explicitly a live-readiness action (reading from production Supabase) layered on top of an otherwise local artifact (the committed file).

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| supabase/migrations/0000_baseline_asis.sql | proposed | Baseline export of current RPC and RLS definitions from the live Supabase project. | VAL-LIVE-EXPORT, VAL-SEC-SCAN |
| .gitignore | modified | Narrow blanket `*.sql` exclusion to allow tracked migrations while still excluding local/scratch SQL. | VAL-SEC-SCAN |
| supabase/README.md | modified | Point to `supabase/migrations/` as current source of truth. | none (documentation only) |
```

## 10. Dependencies and Sequencing

- Coordinate directly with **Faz2.2**: this sub-phase's baseline export should ideally be captured *before* Faz2.2's lockout migration is applied live, so the baseline accurately reflects pre-fix reality; if Faz2.2 is implemented first for any reason, this sub-phase's export will simply capture the post-fix state instead, which should be noted explicitly rather than assumed to be the original baseline.
- Requires read access to the live Supabase project (dashboard or CLI credentials) — these credentials must not be written into any Planner-docs file or committed SQL.
- No destructive live action is taken by this sub-phase itself (export is read-only); the only mutation risk lives in Faz2.2, not here.
- Fresh Claude Code session token/context risk: **Low–Medium** — mostly file/directory plumbing plus one live read; no subagent strictly needed, though the same `security_reviewer`-style pass suggested for Faz2.2 could also cover this export's secret-scan step.

## 11. Risks and Mitigations

- **Risk:** The exported SQL inadvertently includes something secret-adjacent (e.g., a hardcoded fallback value inside a function body).
  - Impact: A credential leak into version control.
  - Mitigation: F2.3-02 explicitly requires a secret scan before commit; if anything secret-like is found, it must be parameterized out (moved to a Supabase Vault secret or environment-configured value) rather than committed, and this sub-phase should stop and flag it rather than silently redacting and committing anyway.
- **Risk:** `.gitignore`'s narrowed pattern accidentally still excludes the new migration files, or accidentally stops excluding a genuinely local scratch file the developer relies on.
  - Impact: Either the migrations never get committed (silent failure) or a local scratch file leaks.
  - Mitigation: F2.3-01 should be verified with a real `git add supabase/migrations/*.sql && git status` check before considering this criterion met, not assumed correct from reading the pattern alone.
- **Risk:** The dashboard's live state has drifted from what any documentation assumes (e.g., an undocumented fifth RPC, or a policy nobody remembers adding).
  - Impact: Missing coverage in the migration baseline.
  - Mitigation: F2.3-02's export should enumerate *all* functions/policies on the project, not just the four named ones, and any unexpected extra item found should be surfaced as a new finding rather than silently dropped from the export.

## 12. Desired End State

All four RPCs and the `sync_presets` RLS policies exist as reviewable, version-controlled SQL under `supabase/migrations/`; `.gitignore` allows them to be tracked while still protecting genuinely local scratch files; `supabase/README.md` reflects the new source of truth. The Step 4 ledger entry should record the export date, confirm the secret scan passed, and note any discrepancy found between exported SQL and previously-assumed client-side behavior.

## 13. Next Sub-Phase Transition Criteria

- The migrations directory exists with a committed baseline covering all four RPCs and RLS policies.
- The secret scan on the exported SQL passed with no findings (or findings were resolved before commit).
- `supabase/README.md` reflects the new source of truth.
- Faz2.4 (Microphone Permission Gesture-Gating) and Faz2.5 (`.sync` Import Shape Validation) may proceed independently; neither depends on this sub-phase.
