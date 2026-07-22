# Faz 4.2 — Fingerprint and Time-Formatting Unit Tests

## 1. Context

`Autopsy.md` Section 8 lists the initial pure-function test-target backlog "in the given order (fingerprint → time formatting → SRT parsing → EQ presets → drift math), since this is roughly increasing order of complexity/coupling to browser APIs" (Section 12). `Main-Planing.md` Section 6, Phase 4 description names `fileFingerprint.ts` and `formatTime.ts` explicitly as the starting pure-function targets, "before attempting any DOM/`AudioContext`-dependent component tests." This sub-phase implements the first two items of that ordered backlog, building directly on **Faz4.1**'s smoke test (which already exercises `formatTime` minimally).

## 2. Goal

`getVideoFingerprint`, `getAudioFingerprint`, and `formatTime` — the two lowest-complexity, zero-browser-API-dependency pure functions in the codebase — have automated regression coverage for their documented behaviors and known edge cases.

## 3. Description

**Problem solved:** These functions are the identity backbone of the community sync-preset feature (`Project-Ontology.md` Section 2: "Fingerprint — a short string uniquely identifying a video or audio source ... Prefixed by source type: `local_`, `yt_`, `gdrive_`, `url_`") — if fingerprinting logic regresses silently, community sync presets stop matching correctly, a subtle, hard-to-notice failure mode since nothing crashes, matches simply stop being found.

**Why it belongs at this point:** Sequenced first among the four coverage sub-phases per `Autopsy.md`'s explicit ordering — both functions are pure, synchronous, and require no browser API mocking, making them the lowest-friction way to prove the Faz4.1 pipeline works for real logic (not just a placeholder assertion).

**Risk reduction:** Protects the fingerprint format's four documented prefixes (`local_`, `yt_`, `gdrive_`, `url_`) and `formatTime`'s MM:SS output format, both load-bearing for correctness elsewhere in the app (cloud-sync matching for fingerprints; every visible timestamp in the UI for `formatTime`).

**How it prepares later phases:** Establishes the test file naming/structure convention (colocated `*.test.ts` next to the source file, per Faz4.1's own smoke test placement) that Faz4.3 and Faz4.4 will follow.

**Vibecoding slice strategy:**
- First useful slice: test `formatTime` first (it is genuinely the simpler of the two — single input, single deterministic output, no branching on source type), then `getVideoFingerprint`/`getAudioFingerprint`'s four source-type branches.
- Fastest validation signal: `npm test` with each new `it()`/`test()` case passing individually.
- What not to over-plan yet: do not attempt to test the DJB2 `simpleHash` internal function in isolation — it is not exported (`fileFingerprint.ts:13-20`'s `simpleHash` is a private helper), and testing it directly would require exporting an implementation detail solely for test access; test through the public `getVideoFingerprint`/`getAudioFingerprint` API instead, consistent with testing behavior over implementation.

## 4. Scope

- Unit tests for `formatTime(seconds: number): string` covering: zero, sub-minute values, exact-minute boundaries, multi-minute values, and the padding behavior for single-digit seconds (e.g., `65` → `"1:05"`).
- Unit tests for `getVideoFingerprint(file: File | null, objectUrl: string | null): string | null` covering all four branches: local file (`local_` prefix), YouTube (`yt_` prefix via the `youtube:` URL scheme), Google Drive proxy (`gdrive_` prefix via `/api/proxy?id=` URL parsing), and generic URL (`url_` prefix), plus the `null`/`null` → `null` case.
- Unit tests for `getAudioFingerprint(file: File | null, url: string | null): string | null`, covering the same branch structure (it shares `getLocalFileFingerprint` and similar URL-parsing logic with `getVideoFingerprint`, so tests should confirm both functions independently rather than assuming identical behavior from shared code).
- Deterministic-hash verification: confirming that calling `getVideoFingerprint`/`getAudioFingerprint` twice with the same inputs produces the same fingerprint (a property the community sync-preset feature depends on), and that meaningfully different inputs produce different fingerprints (not a strict collision-resistance proof, just a basic sanity check appropriate for a DJB2-based hash used for preset matching, not security).

## 5. Out of Scope

- SRT parsing and EQ preset tests (Faz4.3).
- Drift/offset math and compressor bypass tests (Faz4.4).
- Any test requiring a real `File` object with actual binary content beyond what `new File([...], name, {type})` in a test environment can construct — Vitest's Node-based default environment supports the `File`/`Blob` global (Node 20+ and modern Vitest both provide it), so this should not require `jsdom`, consistent with Faz4.1's deferral of any DOM environment setup.

## 6. Current Repository Evidence

- `src/utils/formatTime.ts` (read directly this session, full file, 10 lines) — `Math.floor(seconds / 60)` for minutes, `Math.floor(seconds % 60)` for seconds, zero-padded via `padStart(2, '0')`.
- `src/utils/fileFingerprint.ts` (read directly this session, full file, 107 lines) — confirms all four fingerprint branches, the `local_<size>_<hash>` format for local files, the `youtube:` URL-prefix parsing for YouTube, the `/api/proxy?id=` query-param extraction for Google Drive, and the `btoa(encodeURIComponent(...))`-based encoding for generic URLs with a documented reason ("prevents btoa crashes with non-Latin1 chars").
- `Project-Ontology.md` Section 2 — confirms the fingerprint prefix convention (`local_`, `yt_`, `gdrive_`, `url_`) as documented domain vocabulary, giving this sub-phase's tests a stable contract to assert against.
- `Autopsy.md` Section 8 — "Missing unit coverage: Pure, easily-testable logic with zero current coverage: `fileFingerprint.ts` (DJB2 hash + fingerprint format logic), `formatTime.ts` ..."

## 7. Planned Work Breakdown

- **F4.2-01 — `formatTime` test suite**
  - Description: Write `src/utils/formatTime.test.ts` covering `0` → `"0:00"`, `5` → `"0:05"`, `59` → `"0:59"`, `60` → `"1:00"`, `65` → `"1:05"`, and a multi-minute value (e.g., `3661` → `"61:01"`, confirming no hour-rollover logic exists, since `formatTime` is documented as MM:SS only, not HH:MM:SS).
  - Output: New/extended test file (building on Faz4.1's seed test).
- **F4.2-02 — `getVideoFingerprint` branch coverage**
  - Description: Write `src/utils/fileFingerprint.test.ts` (or a shared file with F4.2-03) covering local-file, YouTube, Google Drive, generic-URL, and null-input cases for `getVideoFingerprint`.
  - Output: New test file/section.
- **F4.2-03 — `getAudioFingerprint` branch coverage**
  - Description: Extend the same test file with equivalent coverage for `getAudioFingerprint`, confirming it independently (not assuming shared-code equivalence with `getVideoFingerprint`).
  - Output: Extended test file.
- **F4.2-04 — Determinism and differentiation checks**
  - Description: Assert that identical inputs produce identical fingerprints across repeated calls, and that two meaningfully different inputs (different filenames/sizes, or different URLs) produce different fingerprints.
  - Output: Additional test cases in the same file.

## 8. Acceptance Criteria

- `formatTime` has passing tests covering at minimum: zero, sub-minute, minute-boundary, and multi-minute cases with correct zero-padding.
- `getVideoFingerprint` and `getAudioFingerprint` each have passing tests covering all four documented source-type branches (`local_`, `yt_`, `gdrive_`, `url_`) plus the null-input case.
- A determinism test confirms repeated calls with identical input yield identical output.
- All new tests run via `npm test` and pass in the Faz1.3/Faz4.1 CI pipeline.
- No test requires `jsdom` or any DOM/browser-only API beyond what Vitest's default environment already provides for `File`/`URL`.

## 9. Validation and Test Approach

- **Local validation (primary):** `npm test` (VAL-UNIT), specifically the new `formatTime.test.ts` and `fileFingerprint.test.ts` suites.
- **CI validation:** the Faz1.3/Faz4.1 CI pipeline's `test` step, now exercising real coverage instead of just a smoke test.
- No live/security validation applies — both functions are pure, client-side-only logic with no network or security-boundary involvement.

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| src/utils/formatTime.test.ts | modified | Full branch/edge-case coverage for formatTime, extending Faz4.1's seed test. | VAL-UNIT |
| src/utils/fileFingerprint.test.ts | proposed | Branch coverage for getVideoFingerprint and getAudioFingerprint across all four source-type prefixes plus null-input and determinism checks. | VAL-UNIT |
```

## 10. Dependencies and Sequencing

- Hard dependency on **Faz4.1** (test runner must exist first).
- No dependency on Faz4.3 or Faz4.4; can proceed independently of them once Faz4.1 lands.
- Requires no credentials, live endpoints, or human approval.
- Fresh Claude Code session token/context risk: **Low**. Two small, pure-function-scoped test files. No subagent needed.

## 11. Risks and Mitigations

- **Risk:** Vitest's default test environment does not provide a `File`/`Blob`/`URL` global exactly matching browser semantics, causing a test to pass or fail for the wrong reason.
  - Impact: False confidence or false failures unrelated to the actual logic being tested.
  - Mitigation: If Vitest's default Node environment proves insufficient for `File`/`Blob` construction, this is exactly the kind of concrete blocker that should be recorded and resolved during Step 4 implementation (e.g., confirming the Node/Vitest version in use actually supports the needed globals) rather than assumed away in planning.
- **Risk:** The generic-URL fingerprint's `btoa(encodeURIComponent(...))` encoding could differ subtly in test-environment string handling (e.g., non-Latin1 characters) versus real browser behavior.
  - Impact: A test that passes in Node but the function behaves differently in an actual browser.
  - Mitigation: Include at least one non-Latin1-character test case (the in-code comment at `fileFingerprint.ts:64` specifically calls out this concern) to confirm the `encodeURIComponent` wrapping genuinely prevents the documented `btoa` crash, in whatever environment the test runs.

## 12. Desired End State

`formatTime`, `getVideoFingerprint`, and `getAudioFingerprint` all have passing, meaningful unit tests running in CI, covering their documented behaviors and known edge cases. The Step 4 ledger entry should record the number of test cases added and confirm all pass in the CI pipeline.

## 13. Next Sub-Phase Transition Criteria

- All planned test cases for `formatTime`, `getVideoFingerprint`, and `getAudioFingerprint` pass locally and in CI.
- Faz4.3 (SRT Parsing & EQ Preset Matching Tests) may begin, continuing the ordered backlog from `Autopsy.md` Section 8.
