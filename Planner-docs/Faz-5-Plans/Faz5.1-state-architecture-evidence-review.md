# Faz 5.1 — Prop-Drilling and State Composition Evidence Review

## 1. Context

`Main-Planing.md` Section 6, Phase 5 description: "Audit prop-drilling depth (`Sidebar.tsx` already receives 30+ props); decide keep-as-is vs. scoped context per subsystem (audio/video/UI) based on concrete pain points observed, not a preemptive rewrite. This phase should only be expanded when a concrete new feature makes prop-drilling actively painful — not before." `Main-Planing.md` Section 9 (Step 2 Preparation Notes) is explicit: "Phase 5 (state-architecture review) should only be expanded once a concrete pain point exists." Per the Second-Planner's own instruction ("If a phase is future/uncertain, plan it at a lower detail level and explicitly mark unresolved decisions"), this sub-phase is intentionally the only sub-phase for Phase 5, and it is scoped as a **decision-producing review**, not an implementation or refactor task.

## 2. Goal

Produce a written, evidence-based decision — not a completed refactor — on whether the current hooks-only state composition (five hooks wired together in `App.tsx`, threaded through `Sidebar.tsx`'s 30+ props) still fits the codebase's actual needs, or whether a concrete pain point justifies introducing scoped React Context for one or more subsystems.

## 3. Description

**Problem this addresses:** `App.tsx` (632 lines) composes `useVideoPlayer`, `useAudioTracks`, `useTheme`, `useAnalytics`, `useCloudSync` and threads their state through `Sidebar.tsx`, which `Autopsy.md` Section 3 table confirms receives 30+ props. This is a real, observable structural fact, but `Main-Planing.md` explicitly frames it as "adequate today; growing prop-drilling surface ... Not currently a blocker" (Section 5) rather than an active problem.

**Why it belongs at this point in the roadmap:** Sequenced after Phases 1–4 (validation, security, docs, tests) because none of those phases depend on this one, and because the Main Plan explicitly does not want this phase expanded speculatively — doing so before a concrete pain point exists would itself violate the vibecoding principle of preferring "the next useful verified move over a frozen speculative mega-plan."

**How it reduces risk:** Prevents two opposite failure modes: silently accumulating prop-drilling debt with no documented decision trail, and speculatively introducing a state-management abstraction (Context, or a heavier library) without evidence it is actually needed — `Main-Planing.md` Section 5 explicitly calls out "the user's own constraint answer ('no strict tool preference, use what fits') argues for evidence-based timing, not a preemptive rewrite."

**Vibecoding slice strategy:** This entire sub-phase *is* the vibecoding-appropriate slice for Phase 5 at this point in time — a bounded evidence review producing a written decision, explicitly deferring any actual refactor until a concrete pain point (a specific new feature or a specific maintenance cost incident) makes the case on its own. This is lower planning depth than Phases 1–4 by design, per the Second-Planner's explicit instruction for future/uncertain phases.

## 4. Scope

- Auditing `Sidebar.tsx`'s current prop count and categorizing them by subsystem (audio, video, UI/theme, analytics, cloud-sync) to produce a concrete, current-state count (not relying on the Autopsy's "30+" approximation alone).
- Auditing whether any concrete pain point already exists: has a bug been traced to prop-drilling specifically, has a recent feature addition required touching an unusually large number of files just to pass one new value through, or is this purely a structural observation with no incident behind it.
- Producing a written decision: **keep hooks-composition as-is** (if no concrete pain point is found) or **introduce scoped context for a specific, named subsystem** (if one is found), with rationale either way.
- If the decision is "introduce scoped context," scoping *which* subsystem specifically (audio/video/UI, per the Main Plan's own suggested split) and a rough sketch of the boundary — not an implementation.

## 5. Out of Scope

- Actually implementing React Context, a state-management library, or any refactor of `App.tsx`/`Sidebar.tsx`'s prop-passing structure — this sub-phase produces a decision document, not code changes.
- Introducing any new state-management dependency (Context is a built-in React feature and requires no new dependency, but any heavier library such as Zustand/Redux is explicitly not evidenced as needed and is out of scope for this review).
- Revisiting this decision on a fixed schedule — the decision should instead explicitly define what future evidence (a concrete pain point) would trigger revisiting it, consistent with vibecoding's "update planning assumptions when real implementation feedback contradicts the original plan."

## 6. Current Repository Evidence

- `Autopsy.md` Section 3 (Project Areas and Ownership Boundaries table) — "State orchestration | `src/App.tsx` (632 lines), `src/components/Sidebar.tsx` (30+ props) | Wires five hooks together, distributes state to ~10 child components | Adequate today; growing prop-drilling surface | Not currently a blocker; flagged for Phase 5 evidence-gathering, not immediate action."
- `Main-Planing.md` Section 5 — "No global state library is used; all state lives in composed React hooks ... wired together in `App.tsx` (632 lines) and threaded through `Sidebar.tsx` (30+ props). This has scaled adequately so far; whether it continues to scale is a question for a later phase (Phase 5), not a reason to introduce a state library speculatively."
- `Project-Ontology.md` Section 4 — confirms the same module/state-orchestration boundary description, consistent across both documents.
- Current repository evidence is limited beyond these structural observations — no incident report, bug trace, or specific development-friction anecdote tied to prop-drilling exists in any reviewed document from this session.

## 7. Planned Work Breakdown

- **F5.1-01 — Exact current prop-count audit**
  - Description: Read `Sidebar.tsx`'s prop interface directly and count/categorize the actual current props by subsystem, replacing the Autopsy's "30+" approximation with an exact, current number.
  - Output: A concrete count and subsystem breakdown.
- **F5.1-02 — Concrete pain-point search**
  - Description: Review recent git history (commit messages, diff sizes) for any commit whose primary friction appears to be "had to thread a new prop through many files/components" versus commits that added features cleanly despite the current structure.
  - Output: A confirmed finding — either a real incident exists, or none is found (a "none found" result is itself a valid, useful outcome, not a failure of this sub-phase).
- **F5.1-03 — Write the decision**
  - Description: Based on F5.1-01 and F5.1-02, write an explicit keep-as-is or introduce-scoped-context decision with rationale, and, if the latter, a rough subsystem boundary sketch.
  - Output: A short decision record (can live in this sub-plan's own evolving content, or in `Planing-Ledger.md`'s "Open Decisions" section, whichever the Step 4 session finds more durable).
- **F5.1-04 — Define the future trigger condition**
  - Description: Regardless of the decision in F5.1-03, write down what future evidence (e.g., "a third state-touching feature requires threading a new prop through 4+ intermediate components") would justify revisiting this decision.
  - Output: An explicit, evidence-based trigger condition for future replanning.

## 8. Acceptance Criteria

- An exact, current prop count for `Sidebar.tsx` is recorded, replacing the approximate "30+" figure.
- A concrete pain-point search has been performed against git history, with its result (found or not found) explicitly recorded either way.
- A written decision (keep-as-is or introduce-scoped-context-for-X) exists with stated rationale.
- If context is recommended, the specific subsystem boundary is named, but no implementation is performed as part of this sub-phase.
- A future trigger condition for revisiting the decision is explicitly written down.

## 9. Validation and Test Approach

- **Document/decision validation (primary):** the decision record itself is the deliverable and its own validation artifact (VAL-DOCS-DECISION) — there is no code to run.
- No build, lint, typecheck, or live validation applies, since this sub-phase produces no source code changes.
- If the decision is "introduce scoped context," that decision becomes the acceptance criterion input for a future, not-yet-planned sub-phase — this sub-plan does not pre-author that future work, consistent with vibecoding's "preserve room for discovery" principle.

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| src/components/Sidebar.tsx | existing | Read-only source for the exact prop-count audit; not modified by this sub-phase. | VAL-DOCS-DECISION |
| Planner-docs/Planing-Ledger.md | modified | Record the written decision and future trigger condition in the ledger's Open Decisions section, once the ledger exists (see Faz2.2/Faz2.3's ledger-adjacent work and this Step 2 session's own ledger initialization). | VAL-DOCS-DECISION |
```

## 10. Dependencies and Sequencing

- No dependency on Phases 1–4 completing first, though it is sequenced after them in the roadmap since it is lower-priority and explicitly non-urgent per the Main Plan.
- Requires no credentials, live endpoints, or external infrastructure — fully local, read-only repository/history review.
- Requires no human approval to perform the review itself; if the decision recommends introducing scoped context, that recommendation itself should be confirmed with the user before any future implementation sub-phase is planned for it (this sub-phase does not have standing to silently schedule that follow-up work).
- Fresh Claude Code session token/context risk: **Low**. A bounded review and a short written decision. No subagent needed.

## 11. Risks and Mitigations

- **Risk:** This sub-phase is executed as if it were a mandate to refactor, silently expanding into an actual Context implementation.
  - Impact: A speculative rewrite the Main Plan explicitly warns against ("not a reason to introduce a state library speculatively").
  - Mitigation: Section 5 explicitly puts implementation out of scope; Step 3's audit should flag any Step 4 execution of this sub-plan that produces code changes beyond the decision document as a scope violation.
- **Risk:** The pain-point search (F5.1-02) is too shallow (e.g., only checking the last few commits) to fairly represent whether prop-drilling has caused real friction over the project's full 90-commit history.
  - Impact: A decision made on incomplete evidence.
  - Mitigation: F5.1-02 should scan the full commit history's messages for friction signals (not just recent commits), consistent with how the original Autopsy read the full 90-commit history rather than a recent sample.

## 12. Desired End State

An exact current prop count, a concrete pain-point-search result, a written keep-as-is or introduce-scoped-context decision with rationale, and an explicit future trigger condition — all recorded, with no source code changed. The Step 4 ledger entry should record this decision in `Planing-Ledger.md`'s Open Decisions section so future replanning sessions do not have to re-derive it from scratch.

## 13. Next Sub-Phase Transition Criteria

- The prop-count audit, pain-point search, decision, and trigger condition are all recorded.
- No source code was changed as part of this sub-phase.
- Phase 5 is complete at its currently-appropriate depth; if the decision recommends scoped context, a new, more detailed Faz5.2 sub-plan should be authored in a future ClaudeQB Step 2 replanning session once the user confirms intent to proceed with it — not authored speculatively now.
- Phase 6 (Production-Grade Operational Readiness) has no dependency on this sub-phase and may proceed independently.
