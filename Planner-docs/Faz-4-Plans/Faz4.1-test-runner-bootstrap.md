# Faz 4.1 — Test Runner Bootstrap

## 1. Context

`Main-Planing.md` Section 6, Phase 4 description: "Introduce a test runner (Vitest fits the existing Vite toolchain with minimal config)." `Autopsy.md` Section 8 confirms zero test files exist anywhere in the repository under any common convention. This is the entry sub-phase of Phase 4, analogous to how Faz1.1 (typecheck) and Faz1.3 (CI) opened Phase 1 — no test can run in CI until a runner exists and is wired into the pipeline Faz1.3 already established.

`Main-Planing.md` Section 9 (Step 2 Preparation Notes) flags one open question this sub-phase must resolve, not assume: "Whether to introduce Vitest (Phase 4) now or defer until Phase 1/2 land ... need human confirmation." This sub-plan proceeds on the assumption that Phase 1 (specifically Faz1.3's CI workflow) is already in place, since a test runner without CI wiring provides much less value — if the user chooses to defer Phase 4 until after Phase 1/2 fully land, that is compatible with this sub-plan's sequencing without requiring any change to its content.

## 2. Goal

A working test runner (Vitest) is installed, configured, and wired into the CI workflow (Faz1.3), such that `npm test` runs zero tests successfully today and is ready to run real tests as soon as Faz4.2 onward add them.

## 3. Description

**Problem solved:** There is currently no mechanism to run any automated test in this repository at all, let alone in CI. This sub-phase establishes only the mechanism, not the coverage — coverage is Faz4.2 through Faz4.4's job.

**Why it belongs at this point:** It must come before any of Faz4.2–Faz4.4, since none of them have anywhere to run without it, and it should come after Phase 1's CI workflow exists so the new `test` step has an existing pipeline to slot into rather than requiring a second CI-authoring pass.

**Risk reduction:** Converts "zero test files, no runner" (part of AUTOPSY-P0-02) from a total absence into a working-but-empty foundation, the safest possible first step for a codebase that has never had tests.

**How it prepares later phases:** Faz4.2, Faz4.3, and Faz4.4 all assume `npm test` (or equivalent) exists and is already running in CI; this sub-phase is their shared prerequisite.

**Vibecoding slice strategy:**
- First useful slice: install Vitest with the minimal config Vite projects typically need (Vitest shares Vite's config resolution, so setup is usually a few lines), write exactly one trivial passing test (e.g., `1 + 1 === 2` or a smoke test importing one existing pure function) to prove the pipeline works end-to-end, then wire it into CI.
- Fastest validation signal: `npm test` running and passing locally, then the same command passing in the Faz1.3 CI workflow after this sub-phase adds a `test` step.
- What not to over-plan yet: do not attempt any DOM/`AudioContext`-dependent test setup (e.g., `jsdom` environment configuration, Web Audio API mocking) in this bootstrap sub-phase — `Main-Planing.md` Section 6 explicitly sequences "pure-function unit tests ... before attempting any DOM/`AudioContext`-dependent component tests," and `Autopsy.md` Section 8 repeats the same ordering. This sub-phase should configure only what pure-function tests need.

## 4. Scope

- Adding `vitest` as a dev dependency, matching the existing Vite 6 / TypeScript 5.8 toolchain versions.
- Minimal Vitest configuration (likely via `vite.config.ts`'s `test` field, or a separate `vitest.config.ts` if keeping build and test config cleanly separated is preferable given `vite.config.ts`'s existing dual-entry-point complexity).
- Adding a `"test": "vitest run"` script to `package.json` (non-watch mode, appropriate for CI; a separate `"test:watch": "vitest"` for local development is a reasonable addition).
- One trivial smoke test proving the pipeline works (e.g., importing `formatTime` from `src/utils/formatTime.ts` and asserting one known input/output pair) — this doubles as the very first real test case, feeding directly into Faz4.2's scope.
- Adding a `test` step to the Faz1.3 CI workflow (`.github/workflows/ci.yml`), sequenced after `typecheck`/`lint`/`build` or interleaved as makes sense for fail-fast ordering.

## 5. Out of Scope

- Any actual coverage of `fileFingerprint.ts`, SRT parsing, `eqPresets.ts`, or drift math beyond the one trivial smoke test — that is Faz4.2/Faz4.3/Faz4.4's scope.
- `jsdom`/browser-environment configuration or any Web Audio API mocking — deferred until a component-level test genuinely needs it (not evidenced as needed by this phase's roadmap, per `Autopsy.md` Section 8's ordering guidance).
- Code coverage reporting/thresholds — a reasonable future addition, not required by any current Main Plan target; note as a deferred idea rather than building it now.

## 6. Current Repository Evidence

- No test files matching `*.test.ts`, `*.spec.ts`, or a `__tests__/` directory exist anywhere (confirmed via `Autopsy.md` Section 2 and this session's own repository inspection).
- `package.json` — no `vitest`, `jest`, or any other test-runner dependency present.
- `vite.config.ts` (read directly this session) — a working Vite 6 config with a dual-entry-point build (`main`, `detached`) and a dev-time proxy; Vitest's config resolution can typically reuse this file's `resolve.alias` (`@/*` → project root) directly, avoiding config duplication.
- Faz1.3 (this Step 2 session's own sub-plan) establishes `.github/workflows/ci.yml` running `typecheck`/`lint`/`build` — this sub-phase's CI wiring extends that same file.
- `src/utils/fileFingerprint.ts` and `src/utils/formatTime.ts` (both read directly this session) — confirmed pure, side-effect-free functions with no DOM dependency, making either a safe choice for this sub-phase's one trivial smoke test.

## 7. Planned Work Breakdown

- **F4.1-01 — Install Vitest**
  - Description: Add `vitest` as a dev dependency at a version compatible with Vite 6 and the project's TypeScript 5.8 setup.
  - Output: Updated `package.json`, `package-lock.json`.
- **F4.1-02 — Configure Vitest**
  - Description: Add minimal `test` configuration (reusing `vite.config.ts`'s existing `resolve.alias` for `@/*` imports so test files can import the same way application code does).
  - Output: New or extended config (`vite.config.ts`'s `test` field, or a new `vitest.config.ts`).
- **F4.1-03 — Add `test`/`test:watch` scripts**
  - Description: Add `"test": "vitest run"` and, optionally, `"test:watch": "vitest"` to `package.json` scripts.
  - Output: Updated `package.json`.
- **F4.1-04 — Write one trivial smoke test**
  - Description: A single test file (e.g., `src/utils/formatTime.test.ts`) asserting one known `formatTime` input/output pair, proving imports, TypeScript, and the test runner all work together correctly.
  - Output: New test file; this also becomes the first real assertion under Faz4.2's broader `formatTime` coverage, so it should not be thrown away once Faz4.2 begins — it should be extended in place.
- **F4.1-05 — Wire `test` into CI**
  - Description: Add a `npm test` (or `npm run test`) step to `.github/workflows/ci.yml`, positioned logically relative to the existing `typecheck`/`lint`/`build` steps (test after typecheck/lint, since a type error or lint violation is cheaper to surface first; before or after build depending on whether tests need the built output — pure-function tests do not, so `test` can run independently of `build`).
  - Output: Updated `.github/workflows/ci.yml`.
- **F4.1-06 — Verify the full pipeline**
  - Description: Confirm `npm test` passes locally and the updated CI workflow passes on a real push/PR, mirroring Faz1.3's own verification pattern.
  - Output: Confirmed passing CI run referencing the new `test` step.

## 8. Acceptance Criteria

- `npm test` runs Vitest in non-watch mode and passes with at least one real (not placeholder) assertion.
- The Faz1.3 CI workflow includes a `test` step that runs and passes on a real push/PR.
- Vitest's config correctly resolves the `@/*` path alias, matching `vite.config.ts`'s existing resolution, so future test files can import application code the same way the app itself does.
- No `jsdom` or Web Audio API mocking is introduced in this sub-phase (explicitly deferred per Section 5).
- `npm run typecheck`, `npm run lint`, `npm run build` all remain passing (this sub-phase should not regress Phase 1's gates).

## 9. Validation and Test Approach

- **Local validation:** `npm test` (VAL-UNIT), `npm run typecheck` (VAL-TYPECHECK), `npm run build` (VAL-BUILD).
- **CI validation:** the Faz1.3 workflow's new `test` step, run for real on a push/PR (VAL-CI).
- This is purely local/CI-readiness work; no live-environment or security validation applies.

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| package.json | modified | Add vitest dev dependency and test/test:watch scripts. | VAL-UNIT |
| vite.config.ts | modified | Add minimal Vitest `test` configuration reusing existing path alias resolution (or a new vitest.config.ts, if separation proves cleaner). | VAL-UNIT |
| src/utils/formatTime.test.ts | proposed | First trivial smoke test proving the pipeline works end-to-end; extended into full coverage by Faz4.2. | VAL-UNIT |
| .github/workflows/ci.yml | modified | Add a test step running `npm test`. | VAL-CI |
```

## 10. Dependencies and Sequencing

- Depends on **Faz1.3** (CI workflow) existing, so this sub-phase extends an existing pipeline rather than authoring a new one.
- Is the hard prerequisite for **Faz4.2**, **Faz4.3**, and **Faz4.4** — none of them can be implemented before this sub-phase's `test` script and CI step exist.
- Requires no credentials, live endpoints, or human approval beyond normal diff review.
- Fresh Claude Code session token/context risk: **Low**. Configuration plus one trivial test file. No subagent needed.

## 11. Risks and Mitigations

- **Risk:** Vitest's config resolution conflicts with `vite.config.ts`'s dual-entry-point build setup (`main`/`detached` in `build.rollupOptions.input`), since that field is build-specific and irrelevant to (but co-located with) test config.
  - Impact: A misconfigured or fragile shared config file.
  - Mitigation: If reusing `vite.config.ts` directly proves awkward, use a separate `vitest.config.ts` that only imports/reuses the `resolve.alias` portion, keeping build and test config cleanly separated — this sub-phase should choose whichever approach the actual implementation attempt shows is cleaner, rather than committing to one prematurely in planning.
- **Risk:** The one smoke test is treated as "coverage achieved" and Faz4.2 is skipped or de-prioritized.
  - Impact: Phase 4's actual goal (real coverage of risky logic) stalls after just the bootstrap.
  - Mitigation: Section 7's F4.1-04 explicitly frames the smoke test as the seed of Faz4.2's `formatTime` coverage, not a standalone deliverable; the ledger entry for this sub-phase should explicitly state that full pure-function coverage is still pending.

## 12. Desired End State

`npm test` is a real, working, CI-integrated command running at least one genuine assertion, with the test-runner infrastructure ready for Faz4.2 to add real coverage without any further setup work. The Step 4 ledger entry should record the Vitest version installed and confirm the CI `test` step passed on a real run.

## 13. Next Sub-Phase Transition Criteria

- `npm test` passes locally and in CI.
- The `@/*` path alias resolves correctly in test files.
- Phase 1 validation gates remain green.
- Faz4.2 (Pure Logic Unit Tests: Fingerprint & Time Formatting) may begin immediately.
