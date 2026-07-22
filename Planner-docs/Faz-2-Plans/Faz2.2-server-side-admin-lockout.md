# Faz 2.2 — Server-Side Admin Brute-Force Lockout

## 1. Context

`Main-Planing.md` Section 6, Phase 2 description: "move admin brute-force lockout logic server-side into `verify_admin_password`/`admin_delete_preset`." `Autopsy.md` **AUTOPSY-P1-01** ranks this as Phase 2's highest-priority item specifically because — unlike most findings in this audit — it is not newly discovered: `supabase/README.md:17-29` (read directly this session) already documents it as an open, unresolved issue, meaning it has been known for some time without a fix. `Main-Planing.md` Section 7 (Critical Risks) states the same: "it has been known and unresolved for some time."

## 2. Goal

Make the admin panel's brute-force protection effective against direct RPC calls (browser console, curl, or any client bypassing the UI entirely), not only against requests that go through `AdminPanel.tsx`'s own React state.

## 3. Description

**Problem solved:** `AdminPanel.tsx:7-8,61-65` (read directly this session) implements a 3-attempt, 30-second client-side lockout entirely in React state (`failedAttempts`, `lockedUntil`). Because the Supabase anon key is, by design, exposed to the browser (`Project-Ontology.md` Section 7, an accepted invariant of the Supabase model), any caller can invoke `verify_admin_password` or `admin_delete_preset` directly via the Supabase JS client or a raw HTTP call, bypassing `AdminPanel.tsx`'s lockout state entirely, as `supabase/README.md` itself already states.

**Why it belongs at this point:** It is the highest-priority Phase 2 item per both the Autopsy and the Main Plan's own risk section, and — critically — the project's own `supabase/README.md` already names the correct fix, so this sub-phase should implement the documented remediation rather than re-deriving a design from scratch, per `Autopsy.md` Section 12's explicit instruction.

**Risk reduction:** Closes the single most consequential open security issue in the repository: an unlimited-attempt password oracle against the admin panel's shared secret.

**How it prepares later phases:** Establishes the pattern (server-side state, keyed by caller) that Faz2.3's RPC-versioning work will also need to represent in the exported SQL migration files.

**Vibecoding slice strategy:**
- First useful slice: this fix necessarily happens partly *outside* this repository, in the Supabase SQL/dashboard layer, since the RPC bodies are not currently version-controlled (that gap is Faz2.3's job). This sub-phase should therefore produce a concrete, reviewable SQL design (a lockout table or a rate-limit column keyed by caller identity) as its primary deliverable, deferring actual application against the live Supabase project to an explicit, separately-approved live-execution step.
- Fastest validation signal: a scripted repeated-call test against `verify_admin_password` directly (bypassing `AdminPanel.tsx`), before and after, showing the direct-call path is now also rate-limited.
- What not to over-plan yet: do not attempt the full Supabase Auth migration `supabase/README.md` names as the "longer term" fix — that is explicitly framed as a future direction, not this sub-phase's scope.

## 4. Scope

- Designing a server-side lockout mechanism inside `verify_admin_password` and `admin_delete_preset`, keyed by a caller-identifying value (`inet_client_addr()` as `supabase/README.md` suggests, or a passed hash) with a cooldown window equivalent to or stricter than the existing client-side 30-second/3-attempt policy.
- Producing the SQL migration/definition for the updated RPC bodies (this is also foundational content for Faz2.3's migrations directory).
- Verifying, via a direct RPC call bypassing `AdminPanel.tsx`, that the new server-side lockout actually triggers.
- Leaving `AdminPanel.tsx`'s existing client-side lockout in place as UX (faster perceived feedback), per `supabase/README.md`'s own framing: "Treat the client-side lock as UX only."

## 5. Out of Scope

- Migrating from a shared admin password to Supabase Auth with a real admin account — explicitly named as a longer-term direction, not this sub-phase.
- Any change to the community sync-preset RPCs (`safe_insert_preset`, `safe_increment_vote`) beyond what Faz2.3's versioning work covers generically — those RPCs already have server-side rate limiting per `supabase/README.md`'s table.
- Actually applying the SQL change to the live Supabase project without an explicit human-approved live-execution step (see Section 10) — this sub-phase's primary output is the reviewed SQL design/migration file.

## 6. Current Repository Evidence

- `AdminPanel.tsx:7-8` — `MAX_FAILED_ATTEMPTS = 3`, `LOCKOUT_DURATION_MS = 30000`.
- `AdminPanel.tsx:61-65` (`triggerLockout`) and `AdminPanel.tsx:67-103` (`handleLogin`) — confirm the lockout is pure React state, reset on page reload, and only enforced client-side.
- `supabase/README.md` (full file, read this session) — "Open issue: admin brute-force protection is client-side only ... the RPCs above are reachable directly with the public anon key ... which bypasses the UI entirely. The lockout has to live in `verify_admin_password` and `admin_delete_preset`: record failed attempts per caller (IP via `inet_client_addr()`, or a passed hash), and reject while a cooldown is active."
- `Autopsy.md` Section 13, AUTOPSY-P1-01 — "should reference the project's own already-written remediation guidance rather than re-deriving a fix."
- The four RPC function bodies themselves are **not present in this repository** (`.gitignore` excludes `*.sql`; no `supabase/migrations/` directory exists) — this sub-phase's SQL design work happens without being able to read the current live RPC implementation directly from the repo, which is itself evidence for why Faz2.3 (RPC versioning) matters.

## 7. Planned Work Breakdown

- **F2.2-01 — Design the server-side lockout schema/logic**
  - Description: Define a lockout-tracking mechanism (e.g., a `admin_login_attempts` table keyed by caller identity with `attempt_count`, `locked_until` columns, or an equivalent in-function `PERFORM pg_sleep`-free counter) and the exact `verify_admin_password`/`admin_delete_preset` logic changes to check and update it.
  - Output: A documented SQL design (function bodies + supporting table DDL if needed), reviewable independent of live execution.
- **F2.2-02 — Produce the SQL migration content**
  - Description: Write the migration as a file under the `supabase/migrations/` directory this phase is introducing (coordinated with Faz2.3, since both sub-phases write into the same new directory — see Dependencies).
  - Output: A new, reviewable `.sql` file (or files) containing the updated RPC definitions.
- **F2.2-03 — Verify against a live/staging Supabase environment (gated, human-approved)**
  - Description: Apply the migration to the live Supabase project (no staging environment is evidenced to exist, per `Main-Planing.md` Section 6 — this is a live-environment action) and confirm via a direct RPC call (not through `AdminPanel.tsx`) that repeated failed attempts now trigger a server-side lockout independent of client state.
  - Output: Confirmed live evidence that the bypass is closed; this step requires explicit human approval before execution since it mutates the live database's function definitions (see Section 10, Dependencies and Sequencing).
- **F2.2-04 — Confirm client-side UX lockout still complements, not conflicts with, the server-side one**
  - Description: Re-test `AdminPanel.tsx`'s existing UI flow end-to-end after the RPC change, confirming the client-side lockout still fires first (fast feedback) and the server-side one is the true enforcement backstop.
  - Output: Confirmed no UX regression in the admin panel's normal login flow.

## 8. Acceptance Criteria

- A direct RPC call to `verify_admin_password` (bypassing `AdminPanel.tsx` entirely, e.g. via the Supabase JS client in a scratch script or browser console) is rate-limited/locked out after repeated failed attempts, independent of any client-side state.
- The SQL migration defining this behavior exists as a reviewable file in `supabase/migrations/`.
- `AdminPanel.tsx`'s existing client-side lockout UX is unchanged in behavior for a normal (non-adversarial) user.
- The live-execution step (F2.2-03) is explicitly confirmed as human-approved before being performed, and its result (pass/fail) is recorded.
- No secret (the actual admin password) is written into any planning or migration file — only the mechanism, never the value.

## 9. Validation and Test Approach

- **Design validation (local, no live access needed):** SQL review of the migration file for correctness (VAL-SQL-REVIEW) — read-only reasoning about the function logic before any live application.
- **Live validation (primary, gated):** a direct RPC brute-force attempt against the live Supabase project, before and after the migration is applied (VAL-LIVE-RPC-LOCKOUT) — this is explicitly a live-readiness check, not a local one, and must be distinguished as such per the Second-Planner's "separate local readiness from live readiness" principle.
- **Regression check:** the existing `AdminPanel.tsx` login flow, manually re-tested end-to-end (VAL-MANUAL-ADMIN-FLOW).
- This sub-phase is the first in the roadmap whose primary validation cannot be fully local — it inherently touches the live Supabase project because the RPC logic does not exist as executable code inside this repository yet.

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| supabase/migrations/0001_admin_lockout_serverside.sql | proposed | New migration adding server-side lockout logic to verify_admin_password/admin_delete_preset. | VAL-SQL-REVIEW, VAL-LIVE-RPC-LOCKOUT |
| src/components/AdminPanel.tsx | existing | Read-only context for confirming client-side UX still complements the new server-side enforcement; not expected to require code changes. | VAL-MANUAL-ADMIN-FLOW |
```

## 10. Dependencies and Sequencing

- No dependency on Faz2.1, Faz2.4, or Faz2.5; can proceed in parallel with them.
- Shares the new `supabase/migrations/` directory with **Faz2.3** — Step 4 should coordinate so both sub-phases' migration files land in the same directory structure without file-naming collisions; Faz2.3's directory-creation work and this sub-phase's first migration file can be delivered together as one coherent slice if convenient, or sequenced with Faz2.3 first if that proves cleaner at implementation time.
- **Requires explicit human approval before F2.2-03 (live execution)** — this is the first sub-phase in the roadmap that mutates a live, shared backend (the Supabase project backing the production app), which falls under `Main-Planing.md` Section 5's "Human approval boundaries" and the ClaudeQB safety rule against unreviewed live/networked mutation.
- Requires Supabase project access (dashboard or CLI with appropriate credentials) to apply and test the migration — these credentials must not be written into any Planner-docs file.
- Fresh Claude Code session token/context risk: **Medium** — the SQL design itself is low-context, but live verification against a real backend, plus careful handling of not touching the admin secret, warrants a checkpoint before F2.2-03 specifically. A `security_reviewer`-style subagent pass on the SQL design (per `Main-Planing.md` Section 9's Step 2 preparation notes) would add value here if available.

## 11. Risks and Mitigations

- **Risk:** Applying the migration to the live Supabase project without a staging environment risks locking out the legitimate admin (the user themselves) during testing.
  - Impact: Temporary loss of admin panel access for the actual project owner.
  - Mitigation: Test with intentionally-wrong passwords from a context that is not the user's own admin session, and confirm the lockout duration/logic matches the intended design (30s-equivalent or a deliberately chosen server-side value) before relying on it being safe to trigger accidentally.
- **Risk:** A caller-identity key based on `inet_client_addr()` can be shared across many legitimate users behind the same NAT/proxy (e.g., a household or corporate network), causing one bad actor to lock out unrelated legitimate admin attempts from the same IP.
  - Impact: False-positive lockouts.
  - Mitigation: Document this tradeoff explicitly in the SQL design (F2.2-01) as an accepted limitation for a low-traffic personal project, consistent with how the existing in-memory proxy rate limiter's per-instance limitation is already accepted elsewhere in this plan (Faz6.2).
- **Risk:** Without Faz2.3 landing alongside or before this sub-phase, the new migration file has nowhere consistent to live.
  - Impact: Ad hoc file placement that Faz2.3 later has to reorganize.
  - Mitigation: Section 10 explicitly calls out coordinating directory creation between the two sub-phases.

## 12. Desired End State

`verify_admin_password` and `admin_delete_preset` enforce a real, server-side lockout independent of any client state; a direct RPC brute-force attempt is demonstrably blocked; the migration defining this is a reviewable file in version control; and the client-side UX lockout continues to provide fast feedback without being the actual security boundary. The Step 4 ledger entry should record the live-verification result and explicitly note that human approval was obtained before the live-execution step.

## 13. Next Sub-Phase Transition Criteria

- A direct RPC brute-force attempt is confirmed blocked server-side, independent of `AdminPanel.tsx` state.
- The migration file exists and is committed.
- The live-execution step's approval and result are both recorded.
- Faz2.3 (Supabase RPC Versioning) should be sequenced closely with or immediately after this sub-phase, since they share the same new directory and this sub-phase's migration is itself the first concrete content for that directory.
