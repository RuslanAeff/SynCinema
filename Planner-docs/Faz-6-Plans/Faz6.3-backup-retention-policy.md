# Faz 6.3 — Backup/Retention Policy for Supabase `sync_presets`

## 1. Context

`Main-Planing.md` Section 6, Phase 6 description: "document a backup/retention policy for the Supabase `sync_presets` table." `Autopsy.md` Section 10 confirms: "Backup/restore or rollback signals: None for the Supabase `sync_presets` table (community data) or for the RPC definitions themselves (see Section 7 — the RPCs cannot even be reconstructed from this repository, let alone rolled back)." The RPC-reconstruction half of that gap is already addressed by **Faz2.3** (Supabase RPC Versioning); this sub-phase addresses the remaining half — the actual table *data* (community-contributed sync presets), not the schema/function definitions.

## 2. Goal

A documented, deliberate answer exists for what happens to `sync_presets` table data if it is accidentally deleted, corrupted, or needs to be rolled back — even if that answer, for a low-traffic community feature, is an explicit and reasoned "accept the risk, no automated backup needed yet."

## 3. Description

**Problem solved:** `sync_presets` is described in `Project-Ontology.md` Section 4 as "the only persistent backend" data the app owns beyond user-local storage — community-contributed offset presets with vote counts. There is currently no documented answer to "what happens if this table is accidentally truncated by a bug in `admin_delete_preset`, or corrupted, or needs point-in-time recovery."

**Why it belongs at this point:** Sequenced last in Phase 6 because it is the lowest-urgency of the three Phase 6 items — `sync_presets` is described throughout the Main Plan and Autopsy as low-risk, community-contributed, non-critical data (unlike the admin-lockout security gap or the general error-visibility gap) — but still deserves an explicit decision rather than silence, consistent with `Main-Planing.md`'s broader theme of "reconciliation between what the documentation claims and what the code actually does."

**Risk reduction:** Converts an unexamined gap into either a real safety net or a consciously accepted risk — either outcome is better than the current silent absence of any policy at all, especially now that Faz2.2 introduces a new server-side admin `DELETE` code path (the lockout fix touches the same RPCs that perform deletions) which is a reasonable moment to also confirm deletion safety more broadly.

**Vibecoding slice strategy:**
- First useful slice: check what Supabase's own platform already provides by default for the project's current plan tier (Supabase's paid tiers include automatic point-in-time recovery; free tier has more limited backup retention) — this may fully or partially answer the question with zero new work required.
- Fastest validation signal: a documented answer, cross-referenced against the actual Supabase project's plan/settings, not assumed from general Supabase documentation.
- What not to over-plan yet: do not build a custom backup/export script unless Supabase's platform-level backup is confirmed insufficient for the project's actual risk tolerance — for community-contributed, re-derivable-by-users data (presets can be re-submitted by the community if lost), a heavy custom backup system is very likely disproportionate.

## 4. Scope

- Confirming what backup/retention Supabase's platform provides by default for the project's actual current plan tier.
- Documenting the practical impact of `sync_presets` data loss (community presets would need to be re-contributed by users; no user-owned/critical data is at risk, since `sync_presets` is explicitly community-shared, not user-private, per `Project-Ontology.md` Section 4's persistence-boundary description).
- Writing an explicit backup/retention policy statement — even if that statement is "rely on Supabase's platform-level backup at the current plan tier; no additional application-level backup is needed given the data's re-derivable, non-critical nature" — recorded as a deliberate decision, not a silent gap.
- If Supabase's platform-level backup is confirmed insufficient for the user's actual risk tolerance, scoping (but not necessarily implementing) a lightweight periodic export as a documented follow-up option.

## 5. Out of Scope

- Any change to `sync_presets`'s schema or RLS policies (Faz2.3's territory).
- Building a custom automated backup pipeline unless F6.3-01/F6.3-02 conclude Supabase's platform-level backup is genuinely insufficient — this sub-phase's default expectation is that documenting reliance on the platform's existing capability is likely sufficient for this specific, low-criticality, re-derivable dataset.
- Any change to `localStorage` or `.sync` file persistence — those are separate persistence boundaries per `Project-Ontology.md` Section 4, not covered by this sub-phase's `sync_presets`-specific scope.

## 6. Current Repository Evidence

- `Autopsy.md` Section 10 — "Backup/restore or rollback signals: None for the Supabase `sync_presets` table (community data) or for the RPC definitions themselves."
- `Project-Ontology.md` Section 4 — "Supabase owns only the community `sync_presets` table — a narrow, well-scoped use of a backend, not over-engineered," and Section 6: "Supabase (Postgres + RPC) — the only persistent backend."
- `Project-Ontology.md` Section 2 — defines `sync_presets` as community-contributed, votable rows, inherently re-derivable if lost (a new user can re-contribute an offset for the same video/audio pair).
- `Main-Planing.md` Section 6, Phase 6 — "document a backup/retention policy for the Supabase `sync_presets` table" (a documentation deliverable, not necessarily an implementation one, per the Main Plan's own phrasing).

## 7. Planned Work Breakdown

- **F6.3-01 — Confirm Supabase's platform-level backup for the current plan**
  - Description: Check the Supabase dashboard/plan settings for what backup/point-in-time-recovery capability is included at the project's current tier.
  - Output: A confirmed, factual answer (not assumed from general documentation).
- **F6.3-02 — Assess actual risk tolerance for this specific dataset**
  - Description: Confirm the practical impact of data loss is genuinely low (community presets are re-contributable, not user-private data) and that no other feature quietly depends on `sync_presets`'s durability beyond what's already understood.
  - Output: A confirmed risk assessment.
- **F6.3-03 — Write the policy decision**
  - Description: Document the decision — rely on platform-level backup as sufficient, or add a specific lightweight mitigation — with rationale grounded in F6.3-01 and F6.3-02's findings.
  - Output: A recorded policy statement (in `supabase/README.md`, alongside the other RPC/schema documentation Faz2.3 already establishes as living there, or in `Planing-Ledger.md`).

## 8. Acceptance Criteria

- Supabase's actual platform-level backup capability for the current project tier is confirmed, not assumed.
- A written policy decision exists, with rationale, addressing what happens if `sync_presets` data is lost or corrupted.
- The decision explicitly accounts for the data's community-contributed, re-derivable nature rather than treating it as if it were irreplaceable user data.
- If a mitigation beyond platform defaults is deemed necessary, it is scoped as a follow-up, not silently implemented without being named as a deliberate addition.

## 9. Validation and Test Approach

- **Document/decision validation (primary):** the recorded policy statement itself (VAL-DOCS-DECISION), following the same pattern as Faz5.1 and Faz6.1.
- **Platform confirmation:** direct check of the Supabase dashboard's actual current plan/backup settings (VAL-LIVE-PLATFORM-CHECK) — this is a live, read-only check, not a local one.
- No code changes are expected for this sub-phase's default path (relying on platform backup); if a mitigation is scoped as a follow-up, that follow-up's own validation approach would be defined when it is actually planned in detail.

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| supabase/README.md | modified | Document the backup/retention policy decision for sync_presets, alongside the RPC documentation Faz2.3 already maintains there. | VAL-DOCS-DECISION, VAL-LIVE-PLATFORM-CHECK |
```

## 10. Dependencies and Sequencing

- Loosely follows **Faz2.3** (Supabase RPC Versioning) in sequencing, since both touch `supabase/README.md` and it is more coherent to document the full backup/versioning picture together, though there is no hard technical dependency.
- Requires access to the Supabase dashboard for F6.3-01's platform confirmation.
- No human approval required for the documentation itself; if a mitigation beyond platform defaults is scoped, that future work would need its own approval when planned in detail.
- Fresh Claude Code session token/context risk: **Low**. A bounded documentation task with one live confirmation check. No subagent needed.

## 11. Risks and Mitigations

- **Risk:** Assuming Supabase's platform-level backup exists at a given tier without actually confirming it for the project's real plan.
  - Impact: A false sense of safety net that doesn't actually exist.
  - Mitigation: F6.3-01 explicitly requires confirming against the actual project's dashboard/plan settings, not general Supabase documentation about what "Supabase" offers in the abstract.
- **Risk:** Treating `sync_presets` as more critical than it actually is, leading to disproportionate backup engineering effort.
  - Impact: Wasted effort relative to the Main Plan's stated preference for evidence-based, appropriately-scoped work.
  - Mitigation: F6.3-02 explicitly grounds the risk assessment in the data's actual re-derivable, community-contributed nature before any mitigation beyond documentation is considered.

## 12. Desired End State

A confirmed, factual understanding of Supabase's actual backup capability for this project's plan tier, and an explicit, reasoned policy decision about `sync_presets` data durability — whether that decision is "rely on the platform" or "add a specific lightweight mitigation." The Step 4 ledger entry should record the platform confirmation result and the final policy decision.

## 13. Next Sub-Phase Transition Criteria

- The platform-level backup capability is confirmed and the policy decision is documented.
- With this sub-phase complete, Phase 6 (Production-Grade Operational Readiness) is closed at its currently evidence-appropriate scope.
- Phase 7 (Commercialization Readiness Gate) remains explicitly deferred per `Main-Planing.md` Section 6 and Section 9, and should not be expanded beyond its placeholder sub-plan (Faz7.1) until the user signals commercialization intent is becoming concrete.
