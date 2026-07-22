# Faz 4.4 — Drift/Offset Math and Compressor Bypass Regression Tests

## 1. Context

`Autopsy.md` Section 8 places "offset/drift math in `AudioTrackRow.tsx`" last in the ordered pure-function backlog specifically because of its complexity/browser-API coupling, and separately identifies "Missing integration coverage: The full Web Audio graph wiring/rewiring in `AudioGraphManager.tsx` (compressor bypass logic specifically, since it is described in README as a deliberately corrected past bug — regressing it silently is a real risk without a test)." `Main-Planing.md` Section 6, Phase 4 goal names both explicitly: "The riskiest logic in the app (drift correction, fingerprinting, SRT parsing, EQ presets, cloud-sync offset grouping) has automated regression coverage." This is the final Phase 4 sub-phase and the first one requiring genuine `AudioContext`/Web Audio API mocking, consistent with `Main-Planing.md`'s explicit sequencing: pure-function tests (Faz4.2, Faz4.3) "before attempting any DOM/`AudioContext`-dependent component tests."

## 2. Goal

The core drift-correction decision logic (when and how much to resync an audio track against the video clock) and the compressor-bypass graph-rewiring logic both have automated regression coverage, protecting the two pieces of logic `Main-Planing.md` and `Project-Ontology.md` both identify as deliberately-engineered, previously-buggy-now-fixed, and central to the product's reason to exist.

## 3. Description

**Problem solved:** `AudioTrackRow.tsx`'s drift-correction math (`targetTime = videoCurrentTime - track.offset`; resync if `Math.abs(audioTime - targetTime) > syncThreshold`) is currently inline inside a `useEffect`/callback within the component body, not an independently callable pure function — same structural issue Faz4.3 solved for `parseSRT`. `AudioGraphManager.tsx`'s compressor-bypass logic (`AudioGraphManager.tsx:131-156`) performs a true Web Audio graph rewire (`eq.high.disconnect()` / `comp.disconnect()`, then either `eq.high → comp → gain` or `eq.high → gain` depending on `useCompressor`) — `Project-Ontology.md` Section 7 lists this as an explicit **invariant**: "Compressor bypass must remain a graph rewire, not a parameter trick ... the correct bypass is `disconnect()`/`connect()` around the compressor node," and `README.md`'s "Design Decisions & Gotchas" section documents this as a deliberately-fixed past bug (per `Main-Planing.md` Section 5). Both are exactly the kind of logic that could regress silently — a wrong drift threshold comparison or a reverted-to-parameter-trick compressor bypass would not throw an error, it would simply degrade audio sync or audio quality in a way only a careful listener would notice.

**Why it belongs at this point:** Last in Phase 4 because it is the most complex extraction (two different subsystems: drift math and Web Audio graph state) and the first requiring `AudioContext` mocking, consistent with the Autopsy's and Main Plan's explicit "pure functions first" sequencing.

**Risk reduction:** Directly protects `Main-Planing.md` Section 2's stated non-negotiable ("The sync precision that is the product's entire reason to exist") and the specific graph-rewire invariant `Project-Ontology.md` Section 7 calls out as something that "must not be reintroduced" if regressed.

**Vibecoding slice strategy:**
- First useful slice: extract the drift-correction decision (given `videoCurrentTime`, `track.offset`, `audioTime`, `syncThreshold`, return whether to resync and to what target time) into a pure, exported function first — this is the lower-complexity half of this sub-phase and needs no `AudioContext` mocking at all.
- Fastest validation signal: the extracted drift-decision function's unit tests, which are pure and fast, before attempting the harder compressor-bypass graph test.
- What not to over-plan yet: for the compressor-bypass test, do not attempt to test the full `AudioGraphManager` component's entire lifecycle (EQ filters, gain, device routing) — scope the test narrowly to the bypass-toggle behavior specifically (does toggling `useCompressor` result in the correct `connect`/`disconnect` call sequence on mock nodes), which is the one invariant actually at risk of silent regression.

## 4. Scope

- Extracting the drift-correction decision logic from `AudioTrackRow.tsx` into a pure, exported function (e.g., `computeDriftCorrection(videoCurrentTime: number, offset: number, audioTime: number, syncThreshold: number): { shouldResync: boolean; targetTime: number }`), with `AudioTrackRow.tsx`'s existing `useEffect` updated to call it — behavior-preserving only.
- Unit tests for the extracted drift function covering: no drift (well within threshold, no resync), drift exactly at the threshold boundary, drift just over the threshold (resync triggered), negative offset handling, and the `targetTime >= 0` floor clamp already present at `AudioTrackRow.tsx:100` (`Math.max(0, videoCurrentTime - track.offset)`).
- A scoped, mocked test of `AudioGraphManager.tsx`'s compressor-bypass toggle (`AudioGraphManager.tsx:131-156`), using minimal mock objects standing in for the relevant `AudioNode`s (mock `connect`/`disconnect` functions to assert call sequence), confirming: enabling the compressor connects `eq.high → comp → gain` and disconnects any direct `high → gain` link; disabling it connects `eq.high → gain` directly and disconnects the compressor.
- Documenting, as part of this sub-phase's evidence, exactly which parts of `AudioGraphManager.tsx` remain untested (full graph initialization, EQ filter parameter application, device routing via `setSinkId`) so Phase 4's coverage boundary is explicit, not implied to be complete.

## 5. Out of Scope

- Full end-to-end audio-graph integration testing (actual `AudioContext` instantiation, real audio processing/output verification) — not achievable in a headless Vitest environment without significant additional infrastructure, and not required by any current Main Plan target; note as a deferred idea for a future, evidence-driven decision (e.g., if a real regression in this area occurs).
- Device-routing (`setSinkId`) testing — a different concern from the compressor-bypass invariant this sub-phase targets.
- Cloud-sync offset-grouping tests (`useCloudSync.ts`'s ±50ms rounding-to-nearest-100ms logic) — mentioned in `Main-Planing.md` Section 6's Phase 4 goal statement but not present in `Autopsy.md`'s explicit ordered backlog (Section 8); if the user wants this covered, it is a reasonable Faz4.5 addition proposed as a follow-up rather than silently folded into this sub-phase's already-substantial scope.

## 6. Current Repository Evidence

- `src/components/AudioTrackRow.tsx:73-117` (read via targeted grep this session) — confirms `targetTime = videoCurrentTime - track.offset` (line 73, 100), `diff = Math.abs(audioTime - targetTime)` (line 101), and the `diff > syncThreshold` resync trigger (line 104), plus the `Math.max(0, ...)` floor clamp (line 100). Full extraction requires reading the complete surrounding `useEffect` at implementation time to confirm no additional closure-captured state is missed (this sub-phase's evidence here is from targeted grep, not a full-file read, so Step 4 implementation must re-read the full effect body before extracting).
- `src/components/AudioTrackRow.tsx:23,36` — `syncThreshold: number` prop, default `0.3` — matches `Project-Ontology.md` Section 2's documented "drift threshold (0.3s default resync trigger)."
- `src/components/AudioGraphManager.tsx:131-156` (read directly this session) — confirms the exact bypass rewire: `eq.high.disconnect()`, `comp.disconnect()`, then conditionally `eq.high.connect(comp); comp.connect(gain);` or `eq.high.connect(gain);` based on `useCompressor`.
- `Project-Ontology.md` Section 7 — "Compressor bypass must remain a graph rewire, not a parameter trick ... the correct bypass is `disconnect()`/`connect()` around the compressor node" — an explicit invariant this sub-phase's test directly protects.
- `Autopsy.md` Section 8 — "Missing integration coverage: The full Web Audio graph wiring/rewiring in `AudioGraphManager.tsx` (compressor bypass logic specifically ...) ... regressing it silently is a real risk without a test."

## 7. Planned Work Breakdown

- **F4.4-01 — Read the full drift-correction effect in `AudioTrackRow.tsx`**
  - Description: Before extracting, read the complete surrounding `useEffect`/function (not just the grep-matched lines already cited) to confirm the exact inputs, outputs, and any side effects (e.g., `setDriftWarning` state updates) that must be preserved or explicitly excluded from the pure extraction.
  - Output: Confirmed extraction boundary.
- **F4.4-02 — Extract the drift-decision pure function**
  - Description: Create `computeDriftCorrection` (or equivalently named) as an exported pure function taking the four numeric inputs and returning the resync decision and target time, with `AudioTrackRow.tsx` updated to call it and apply any remaining side effects (state updates, `audioRef.current.currentTime` assignment) separately.
  - Output: New utility function (e.g., in `src/utils/driftCorrection.ts`); updated `AudioTrackRow.tsx`.
- **F4.4-03 — Manual regression check of the drift extraction**
  - Description: With two tracks loaded and an intentional offset applied, manually confirm drift correction still triggers and corrects audio position identically before and after the extraction — this is core sync logic and must be manually verified, not just typechecked, per the ontology's core-domain protection principle.
  - Output: Confirmed no behavioral regression.
- **F4.4-04 — Drift-decision unit tests**
  - Description: Write tests covering no-drift, at-threshold, over-threshold, negative-offset, and floor-clamp cases.
  - Output: New test file.
- **F4.4-05 — Compressor-bypass mock test**
  - Description: Write a scoped test using minimal mock `AudioNode`-like objects (objects exposing `connect`/`disconnect` as spy/mock functions) to assert the exact connect/disconnect call sequence when toggling `useCompressor` true → false and false → true, matching `AudioGraphManager.tsx:131-156`'s logic exactly.
  - Output: New test file/section, scoped narrowly per Section 3's vibecoding note.
- **F4.4-06 — Document untested `AudioGraphManager.tsx` surface**
  - Description: Record explicitly (in the ledger or a short code comment near the test) which parts of `AudioGraphManager.tsx` remain uncovered (full graph init, EQ parameter application, device routing), so Phase 4's actual coverage boundary is clear.
  - Output: A concise, explicit coverage-boundary note.

## 8. Acceptance Criteria

- The drift-correction decision logic is extracted into an independently-tested pure function, confirmed behavior-identical to the original inline logic via manual test.
- Drift-decision unit tests pass for no-drift, at-threshold, over-threshold, negative-offset, and floor-clamp cases.
- The compressor-bypass test confirms the exact `disconnect`/`connect` sequence matches the graph-rewire invariant (not a parameter-based bypass) for both toggle directions.
- The untested surface of `AudioGraphManager.tsx` is explicitly documented, not silently implied to be fully covered.
- `npm run typecheck`, `npm run lint`, `npm run build`, and `npm test` all pass.

## 9. Validation and Test Approach

- **Local validation (primary):** `npm test` (VAL-UNIT) for both new test files.
- **Manual regression validation:** the before/after two-track drift test in F4.4-03 (VAL-MANUAL-DRIFT-REGRESSION), required because this sub-phase refactors sync-core logic explicitly protected by `Main-Planing.md` Section 5's "most protected, most tested part of the codebase" framing.
- **CI validation:** the Faz1.3/Faz4.1 pipeline's `test` step.
- No live/security validation applies; this is entirely local, client-side logic.

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| src/utils/driftCorrection.ts | proposed | Extracted, exported drift-decision pure function, behavior-identical to the original inline AudioTrackRow.tsx logic. | VAL-UNIT, VAL-MANUAL-DRIFT-REGRESSION |
| src/components/AudioTrackRow.tsx | modified | Replace inline drift-decision math with a call to the extracted function; side effects (state updates, currentTime assignment) remain in the component. | VAL-TYPECHECK, VAL-MANUAL-DRIFT-REGRESSION |
| src/utils/driftCorrection.test.ts | proposed | Unit tests for the extracted drift-decision function. | VAL-UNIT |
| src/components/AudioGraphManager.tsx | existing | Read-only for the compressor-bypass test target; not expected to require modification since the test observes existing behavior via mocks, not a refactor. | VAL-UNIT |
| src/components/AudioGraphManager.compressorBypass.test.ts | proposed | Scoped, mocked test of the compressor-bypass connect/disconnect sequence. | VAL-UNIT |
```

## 10. Dependencies and Sequencing

- Hard dependency on **Faz4.1** (test runner must exist first).
- Benefits from Faz4.2/Faz4.3's established test-file conventions but has no hard content dependency on either.
- Requires no credentials or live endpoints; requires the same care around manual sync-core verification that `Main-Planing.md` Section 5 calls for.
- Fresh Claude Code session token/context risk: **Medium** — this is the most complex Phase 4 sub-phase (two extractions, one requiring mock design for Web Audio nodes); if context pressure becomes an issue, the drift-decision half (F4.4-01 through F4.4-04) and the compressor-bypass half (F4.4-05, F4.4-06) can be split into two separately-verified implementation slices within this one sub-plan without changing its file boundary. No subagent is required, but a focused single-purpose pass on just the mock design for F4.4-05 is a reasonable internal checkpoint.

## 11. Risks and Mitigations

- **Risk:** The drift-decision extraction misses a closure-captured value not visible from the targeted grep this sub-plan's evidence was gathered from (Section 6 explicitly flags this).
  - Impact: A subtle sync regression.
  - Mitigation: F4.4-01 requires a full read of the surrounding effect before extraction, and F4.4-03 requires manual verification with a real two-track offset scenario, not just a passing test suite.
- **Risk:** The compressor-bypass mock test asserts the *current* connect/disconnect call sequence so literally that it becomes brittle to any future, behavior-preserving refactor of `AudioGraphManager.tsx` (e.g., reordering unrelated code).
  - Impact: A test that fails on harmless changes, training future developers to ignore test failures.
  - Mitigation: Scope the mock assertions to the specific invariant (compressor is graph-rewired, not parameter-bypassed) rather than asserting an exact literal call order beyond what's needed to prove that invariant.
- **Risk:** Testing `AudioGraphManager.tsx` in isolation with mocks could give false confidence that the whole audio graph is covered, when in fact only the bypass toggle is tested.
  - Impact: Overstated coverage confidence.
  - Mitigation: F4.4-06 explicitly documents the coverage boundary as part of this sub-phase's required output, not an optional nicety.

## 12. Desired End State

Drift-correction decision logic is extracted, tested, and confirmed behavior-identical via manual verification; the compressor-bypass graph-rewire invariant has a scoped, mocked regression test; the remaining untested surface of `AudioGraphManager.tsx` is explicitly documented. With this sub-phase complete, Phase 4's entire ordered backlog from `Autopsy.md` Section 8 (fingerprint → time formatting → SRT parsing → EQ presets → drift math) is closed, plus the compressor-bypass invariant test that `Autopsy.md` Section 8 separately calls out as missing integration coverage. The Step 4 ledger entry should record the manual drift-regression check result and the explicit list of `AudioGraphManager.tsx` surface still left untested.

## 13. Next Sub-Phase Transition Criteria

- Drift-decision extraction is confirmed behavior-identical via manual test, and its unit tests pass.
- The compressor-bypass mock test confirms the graph-rewire invariant holds in both toggle directions.
- The untested-surface documentation is recorded.
- With Phase 4 complete, Phase 5 (State/Architecture Scalability Review) may begin — it has no dependency on Phase 4, per `Main-Planing.md` Section 6's phase table, but is intentionally low-detail per Section 9's "should not be expanded yet" guidance (see Faz5.1).
