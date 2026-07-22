# Faz 4.3 — SRT Parsing and EQ Preset Matching Tests

## 1. Context

`Autopsy.md` Section 8's ordered pure-function backlog places SRT parsing and EQ preset matching third and fourth, after fingerprinting and time formatting (Faz4.2), and before drift math (Faz4.4) — "roughly increasing order of complexity/coupling to browser APIs." `Project-Ontology.md` Section 8 independently confirms `eqPresets.ts`'s `getCurrentPresetId` as "a pure, side-effect-free function with no floating-point tolerance concerns (all preset values are whole numbers), making it one of the lowest-risk, highest-value first targets for Phase 4 unit testing." SRT parsing, unlike the EQ preset matcher, is **not currently an exported, independently-testable function** — `parseSRT` is defined as a local closure inside `useVideoPlayer.ts:124-144`, not exported from the module — which materially changes this sub-phase's first work item compared to what a naive reading of "add SRT parsing tests" might assume.

## 2. Goal

The SRT subtitle-parsing logic and the EQ preset exact-match logic both have automated regression coverage, with SRT parsing first extracted into an independently testable, exported pure function without changing its behavior.

## 3. Description

**Problem solved:** SRT parsing (`useVideoPlayer.ts:124-144`) converts raw `.srt` file text into timed subtitle cues via regex-based timestamp parsing (`HH:MM:SS,mmm --> HH:MM:SS,mmm`) — a classic source of off-by-one and malformed-input bugs that would visibly break subtitle timing if regressed, yet currently has zero coverage and, more specifically, is not even structured to be unit-testable in isolation. EQ preset matching (`eqPresets.ts:31-34`'s `getCurrentPresetId`) determines which of six named presets (if any) the current EQ values match, driving UI state (e.g., highlighting the active preset button) — untested today despite being trivially testable.

**Why it belongs at this point:** Continues the Autopsy's explicit ordering; SRT parsing is more complex than the EQ matcher (regex parsing, multi-line block splitting, time-unit arithmetic) but still fully synchronous and DOM-independent once extracted, fitting the "before DOM/AudioContext-dependent tests" constraint from `Main-Planing.md` Section 6.

**Risk reduction:** Subtitle timing is a directly user-visible correctness property (`Main-Planing.md` Section 2: sync precision is described as the product's core reason to exist, and subtitles are timed against that same video clock); EQ preset matching, while lower-stakes, drives visible UI state that should not silently mismatch.

**How it prepares later phases:** The extraction-without-behavior-change pattern this sub-phase establishes for `parseSRT` is the same discipline Faz4.4 will need when it isolates drift-correction math from `AudioTrackRow.tsx`'s component body.

**Vibecoding slice strategy:**
- First useful slice: extract `parseSRT` from `useVideoPlayer.ts` into `src/utils/srtParser.ts` (or similar) as a named export with an identical signature and behavior, verified by first confirming `loadSubtitles`'s existing call site still works exactly as before (manual subtitle-load smoke test) before any new test is written against the extracted function.
- Fastest validation signal: after extraction, a passing `npm test` suite against the now-independently-importable `parseSRT`.
- What not to over-plan yet: do not redesign the SRT parser's tolerance for malformed input as part of this sub-phase (e.g., adding new fallback behaviors for cues with fewer than 3 lines) — test the *existing* behavior, including its existing limitations (e.g., `parseSRT` currently silently skips any block with fewer than 3 lines or a non-matching timestamp pattern, per `useVideoPlayer.ts:129,131`); if that reveals a real bug, note it as a finding for later triage rather than silently "fixing" behavior while writing a test for it.

## 4. Scope

- Extracting `parseSRT` from `useVideoPlayer.ts` into an exported, independently importable pure function, with `useVideoPlayer.ts`'s `loadSubtitles` updated to import and call the extracted version — behavior-preserving only, no logic changes.
- Unit tests for the extracted SRT parser covering: a well-formed multi-cue `.srt` block, a single-cue block, a block with multi-line cue text, a malformed timestamp (confirming the existing silent-skip behavior), a block with fewer than 3 lines (confirming the existing silent-skip behavior), and an empty-string input.
- Unit tests for `getCurrentPresetId` covering: each of the six documented presets' exact values, a non-matching arbitrary `{low, mid, high}` combination (expecting `null`), and confirming `getPresetById` correctly retrieves each preset by its `id`.

## 5. Out of Scope

- Any test requiring `SubtitleOverlay.tsx`'s rendering logic — this sub-phase tests only the parsing function, not subtitle *rendering*, which is a DOM-dependent concern outside Phase 4's current pure-function scope.
- Redesigning SRT parsing to handle VTT or other subtitle formats — not evidenced as needed by any current target.
- Any change to the six preset values themselves in `eqPresets.ts` — tests assert against the existing values, they do not change them.

## 6. Current Repository Evidence

- `src/hooks/useVideoPlayer.ts:124-144` (`parseSRT`, read directly this session, full function body) — confirms: block-splitting via `text.trim().split(/\n\s*\n/)`, per-block line-count check (`lines.length >= 3`), regex timestamp match `(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})`, and silent-skip behavior for any block failing either check — this is a local closure, not exported.
- `src/hooks/useVideoPlayer.ts:146-153` (`loadSubtitles`) — the sole current call site of `parseSRT`, invoked from a `FileReader.onload` callback; this is the integration point that must continue working identically after extraction.
- `src/constants/eqPresets.ts` (read directly this session, full file, 34 lines) — confirms the six presets (`flat`, `cinema`, `dialogue`, `music`, `night`, `bass`) and `getCurrentPresetId`'s exact-equality matching logic, all whole-number values (no floating-point tolerance concerns, per `Project-Ontology.md` Section 8).
- `Autopsy.md` Section 8 — "SRT parsing inside `useVideoPlayer.ts`" and "EQ preset matching in `constants/eqPresets.ts` ... confirmed by direct read this session, no floating-point edge cases, an ideal first test target" (this exact phrasing appears in the Autopsy itself, since it was also read directly during that session).

## 7. Planned Work Breakdown

- **F4.3-01 — Extract `parseSRT` into an exported pure function**
  - Description: Move the function body from `useVideoPlayer.ts:124-144` into a new file (e.g., `src/utils/srtParser.ts`), export it, and update `loadSubtitles` to import and call it — no behavior change.
  - Output: New `src/utils/srtParser.ts`; updated `useVideoPlayer.ts` import.
- **F4.3-02 — Manual regression check of the extraction**
  - Description: Load a real `.srt` file through the app's existing subtitle-loading UI before and after the extraction, confirming identical cue timing and text rendering — since this is a refactor of sync-critical-adjacent code (subtitles are timed against the same video clock the ontology protects), this should be manually verified, not just typechecked.
  - Output: Confirmed no behavioral regression.
- **F4.3-03 — SRT parser test suite**
  - Description: Write `src/utils/srtParser.test.ts` covering the cases listed in Section 4 (well-formed multi-cue, single-cue, multi-line text, malformed timestamp, too-few-lines, empty input).
  - Output: New test file.
- **F4.3-04 — EQ preset matcher test suite**
  - Description: Write `src/constants/eqPresets.test.ts` covering all six presets' exact-match cases, one non-matching case, and `getPresetById` lookups.
  - Output: New test file.

## 8. Acceptance Criteria

- `parseSRT` is exported from a dedicated module and `useVideoPlayer.ts`'s `loadSubtitles` uses the extracted version with no behavior change, confirmed by a manual before/after subtitle-load test.
- The extracted SRT parser has passing tests for well-formed input, malformed timestamps, too-short blocks, multi-line cue text, and empty input, with the existing silent-skip behavior for invalid blocks explicitly asserted (not silently changed).
- `getCurrentPresetId` has passing tests for all six presets and at least one non-matching case; `getPresetById` has a passing lookup test.
- All new tests run via `npm test` and pass in CI.
- If the malformed-input tests reveal the silent-skip behavior is a real usability gap (e.g., a slightly malformed real-world `.srt` file silently loses cues with no user-facing warning), this is noted as a candidate future finding, not silently fixed as a side effect of writing the test.

## 9. Validation and Test Approach

- **Local validation (primary):** `npm test` (VAL-UNIT) for both new test files.
- **Manual regression validation:** the before/after subtitle-load check in F4.3-02 (VAL-MANUAL-SUBTITLE-REGRESSION), required specifically because this sub-phase includes a refactor (extraction) of existing behavior, not just new test authorship.
- **CI validation:** the Faz1.3/Faz4.1 pipeline's `test` step.
- No live/security validation applies.

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| src/utils/srtParser.ts | proposed | Extracted, exported version of parseSRT, behavior-identical to the original closure in useVideoPlayer.ts. | VAL-UNIT, VAL-MANUAL-SUBTITLE-REGRESSION |
| src/hooks/useVideoPlayer.ts | modified | Replace local parseSRT closure with an import from srtParser.ts; loadSubtitles behavior unchanged. | VAL-TYPECHECK, VAL-MANUAL-SUBTITLE-REGRESSION |
| src/utils/srtParser.test.ts | proposed | Unit tests for the extracted SRT parser covering well-formed, malformed, and edge-case inputs. | VAL-UNIT |
| src/constants/eqPresets.test.ts | proposed | Unit tests for getCurrentPresetId and getPresetById. | VAL-UNIT |
```

## 10. Dependencies and Sequencing

- Hard dependency on **Faz4.1** (test runner must exist first).
- No dependency on Faz4.2 or Faz4.4; the SRT-extraction work is independent of both, though it follows Faz4.2 in the Autopsy's recommended ordering.
- Requires no credentials or live endpoints; requires no human approval beyond normal diff review, though the extraction (F4.3-01) touches sync-adjacent code and should get the same manual-verification care `Main-Planing.md` Section 5 calls for around the sync core.
- Fresh Claude Code session token/context risk: **Low–Medium** — the extraction step requires care to avoid a subtle behavior change; testing itself is low-complexity. No subagent needed.

## 11. Risks and Mitigations

- **Risk:** Extracting `parseSRT` introduces a subtle behavior change (e.g., a difference in closure-captured state, though `parseSRT` as read has no external closure dependencies beyond its own parameter, making this unlikely but not zero-risk without verification).
  - Impact: Silent subtitle-timing regression.
  - Mitigation: F4.3-02 requires an explicit manual before/after test with a real `.srt` file, not just a passing typecheck, precisely because a typecheck cannot catch a subtle runtime timing regression.
- **Risk:** The malformed-input test cases encode the *current* silent-skip behavior as "correct" when it may actually be an unintentional gap (e.g., a user's slightly-off `.srt` file silently loses subtitles with no error message).
  - Impact: Locking in a UX gap as if it were a tested, intentional contract.
  - Mitigation: Section 8 explicitly requires flagging this as a candidate finding rather than treating the test as proof the behavior is correct — testing current behavior for regression-safety and endorsing that behavior as ideal are different things, and this sub-plan only claims the former.

## 12. Desired End State

SRT parsing exists as an independently-tested, exported pure function with no behavior change from its original closure form, and EQ preset matching has full branch coverage. The Step 4 ledger entry should record the manual subtitle-regression check result and note whether the malformed-input tests revealed any UX gap worth a future finding.

## 13. Next Sub-Phase Transition Criteria

- The SRT parser extraction is confirmed behavior-identical via manual test, and its unit tests pass.
- The EQ preset matcher's unit tests pass.
- Faz4.4 (Drift/Offset Math and Compressor Bypass Regression Tests) may begin, completing the Autopsy's ordered backlog.
