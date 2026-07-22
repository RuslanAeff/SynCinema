# Faz 1.1 — Type-Check Enforcement in Build

## 1. Context

This sub-phase implements the single most important item identified across Step 1 and Step 1.5: `Main-Planing.md` Section 4 (Target End State) states `npm run build` must fail on real TypeScript errors, and `Autopsy.md` finding **AUTOPSY-P0-01** ranks this as the highest-consequence gap in the repository. It is also the "first useful vibecoding slice" the Main Plan itself calls out in Section 6, Phase 1: "Run `tsc --noEmit` locally once, right now, to see the actual current error count — this single command is the fastest possible reality check and should happen before Step 2 sub-plans are written for this phase." That command has not yet been run in this planning session (`Main-Planing.md` Section 10, "Things not verified"); this sub-plan is written to be executed as the first action of Phase 1's implementation, not after the fact.

This sub-phase is the direct parent of every other Phase 1 item and, transitively, of every later phase: `Main-Planing.md` Section 1 states that "everything else — security hardening, documentation truth reconciliation, test coverage — is safer and cheaper to do once that safety net exists." No prior sub-phase exists (this is the first sub-plan of the first phase).

## 2. Goal

Make `npm run build` fail whenever the TypeScript compiler reports an error, so that `strict: true` in `tsconfig.json` (currently configured but unenforced, per `package.json:11`'s `"build": "vite build"`) has real, build-blocking effect.

## 3. Description

**Problem solved:** `tsconfig.json` sets `strict: true` and `noEmit: true`, but Vite's build (esbuild-based transpilation) does not type-check — it strips types and emits regardless of type errors. `tsc` is never invoked anywhere in `package.json`'s scripts. This means the type system's entire safety value is currently theoretical.

**Why it belongs first:** Every subsequent Phase 1–6 change (security fixes, doc fixes, new tests, RPC migrations) is itself a code or config change that could introduce a type error. Without this sub-phase landing first, none of those later changes have a build-time backstop.

**Risk reduction:** Closes AUTOPSY-P0-01 directly — the single highest-priority finding in the Autopsy.

**Preparation for later phases:** Phase 1.3 (CI workflow) depends on a working local typecheck command existing first; wiring CI before the local command is proven correct would risk shipping a CI step that either always passes (misconfigured) or always fails (blocking on pre-existing errors nobody has triaged).

**Vibecoding slice strategy:**
- First useful slice: run `npx tsc --noEmit` once, unmodified, and read the actual output — zero code changes, pure information-gathering, must happen before any fix is written.
- Fastest validation signal: the same `npx tsc --noEmit` command, re-run after each fix, with a shrinking error count as the running signal.
- What not to over-plan yet: do not pre-guess the exact number or nature of type errors that will surface. If the baseline run in Section 7 returns zero errors, this sub-phase reduces to a one-line `package.json` change plus verification; if it returns many errors, triage becomes its own bounded loop and should not be treated as scope creep — it is the literal content of AUTOPSY-P0-01.

## 4. Scope

- Establishing the actual current `tsc --noEmit` baseline (command output, error count, affected files) as the first concrete action.
- Modifying `package.json`'s `"build"` script so it runs `tsc --noEmit` (or equivalent) before/alongside `vite build`, failing the whole command on a non-zero `tsc` exit code.
- Fixing whatever real type errors the baseline run surfaces, scoped strictly to making `tsc --noEmit` pass — not a general type-quality pass beyond what `strict: true` already requires.
- Adding a matching `typecheck` script (e.g. `"typecheck": "tsc --noEmit"`) so CI (Faz1.3) and local developers have one canonical command name.
- Documentation and secure-by-design expectations: none beyond keeping `tsconfig.json`'s existing `strict: true` untouched (this sub-phase enforces the existing config; it does not change it).

## 5. Out of Scope

- Introducing ESLint (Faz1.2).
- Introducing a CI workflow (Faz1.3) — this sub-phase only makes the local command correct; CI wiring is the next sub-phase.
- Removing `wavesurfer.js` or the dead `UrlLoaderModal` audio tab (Faz1.4) — even though both are Phase 1 items, they are independent, low-risk slices and should not be bundled into the type-check change.
- Any refactor of application logic beyond what is strictly required to satisfy `tsc --noEmit`.
- Changing `tsconfig.json`'s `strict` settings themselves (loosening or tightening).

## 6. Current Repository Evidence

- `package.json:11` — `"build": "vite build"`; no `tsc` invocation anywhere in `scripts`.
- `tsconfig.json` — `"strict": true`, `"noEmit": true`, target `ES2022`, `moduleResolution: "bundler"`.
- `Autopsy.md`, Section 6 — "Build/type-check gap ... This is the single highest-leverage debt item: it silently disables the type system's entire value."
- `Autopsy.md`, Section 13, AUTOPSY-P0-01 — confirms this must be the first Phase 1 work item.
- No `.github/workflows/` exists locally (confirmed via `find`), so there is currently no CI to fail even if a type error were introduced.
- `Main-Planing.md` Section 10 explicitly lists "actual current `tsc` error count" as not yet verified in this session — this sub-plan's first task closes that gap.

## 7. Planned Work Breakdown

- **F1.1-01 — Establish `tsc --noEmit` baseline**
  - Description: Run `npx tsc --noEmit` against the unmodified repository and record the exact exit code, error count, and list of affected files/lines.
  - Output: A short evidence note (can live in the Step 4 implementation summary / ledger entry) listing the baseline error count — zero is a valid and good outcome.
- **F1.1-02 — Add canonical `typecheck` script**
  - Description: Add `"typecheck": "tsc --noEmit"` to `package.json`'s `scripts` so the command has one stable name reusable by CI (Faz1.3) and developers.
  - Output: Updated `package.json`.
- **F1.1-03 — Triage and fix baseline errors, if any**
  - Description: For each error surfaced in F1.1-01, apply the minimal correct fix (type annotation, narrowing, or a genuine bug fix if the type error reflects a real logic bug) without expanding scope into unrelated refactors.
  - Output: Zero-error `tsc --noEmit` run; a short note per fix if the fix corrected a real (not just cosmetic) type mismatch, since that is itself evidence worth keeping in the ledger.
- **F1.1-04 — Wire typecheck into the build script**
  - Description: Change `package.json`'s `"build"` script so a failing `typecheck` blocks `vite build` from completing successfully (e.g. `"build": "tsc --noEmit && vite build"`), while keeping `vite build`'s own behavior otherwise unchanged.
  - Output: Updated `package.json`; `npm run build` now fails non-zero on a reintroduced type error.
- **F1.1-05 — Prove the gate works with a negative test**
  - Description: Temporarily introduce one deliberate, trivial type error (e.g., assign a `string` to a `number`-typed local variable in a throwaway location), run `npm run build`, confirm it fails, then revert the deliberate error.
  - Output: Confirmed evidence (command output) that the gate is real, not just present; the deliberate error must not be committed.

## 8. Acceptance Criteria

- `npx tsc --noEmit` exits 0 against the repository after this sub-phase's fixes are applied.
- `npm run build` exits non-zero when a deliberately reintroduced type error is present, and exits 0 with no deliberate error present (verified per F1.1-05, then reverted).
- `package.json` contains both a `typecheck` script and a `build` script that depends on it.
- `tsconfig.json`'s existing `strict: true` and `noEmit: true` settings are unchanged.
- If the baseline (F1.1-01) surfaces zero errors, that is stated explicitly in the implementation evidence rather than silently assumed.
- No files outside the minimal set needed to fix real type errors and update `package.json` are modified.

## 9. Validation and Test Approach

- **Local validation (primary):** `npx tsc --noEmit` (VAL-TYPECHECK) and `npm run build` (VAL-BUILD).
- **Negative-path validation:** the temporary deliberate-error check described in F1.1-05, never committed.
- **CI validation:** deferred to Faz1.3, which will run `VAL-TYPECHECK` and `VAL-BUILD` as part of the new GitHub Actions workflow — this sub-phase only guarantees the underlying commands are correct and fast enough to run in CI.
- This is local readiness work; no live/deployed-environment validation applies to this sub-phase.
- No security validation applies directly here, though a passing typecheck is a prerequisite for safely validating the Phase 2 security fixes later.

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| package.json | modified | Add `typecheck` script; make `build` depend on it. | VAL-TYPECHECK, VAL-BUILD |
| tsconfig.json | existing | Read-only context; `strict`/`noEmit` settings are the enforcement target, not changed. | VAL-TYPECHECK |
```

(Additional `modified` rows for whichever source files F1.1-03 touches are not enumerable until the baseline run in F1.1-01 identifies them; Step 4 must add them to the ledger as concrete evidence when known, per `Planner-docs/Planing-Ledger.md` Section 5 conventions.)

## 10. Dependencies and Sequencing

- No dependency on any other sub-phase; this is the entry point of the entire roadmap.
- Requires no credentials, live endpoints, or external infrastructure — fully local.
- Requires no human approval beyond the normal review of the resulting diff, since it only tightens an already-declared `strict: true` contract.
- Faz1.2 (ESLint) and Faz1.3 (CI workflow) both assume this sub-phase's `typecheck` script name exists; Faz1.3 must not be started until this sub-phase's acceptance criteria are met.
- Fresh Claude Code session token/context risk: **Low**. Single config file change plus a bounded, mechanically-verifiable fix loop. No subagent needed.

## 11. Risks and Mitigations

- **Risk:** The baseline `tsc --noEmit` run surfaces a large number of errors, making this sub-phase larger than expected.
  - Impact: Delays Phase 1 completion and, transitively, every later phase.
  - Mitigation: Triage errors by file/module before fixing; if the count is large, this sub-phase's F1.1-03 may itself need to be executed as several small, independently-committed slices (still within this one sub-plan's scope) rather than one giant patch — consistent with the vibecoding principle of small reversible slices.
- **Risk:** A "fix" for a type error masks a real runtime bug instead of exposing it (e.g., an unsafe type assertion used to silence the compiler).
  - Impact: Defeats the purpose of this entire sub-phase — the gate would exist but not be trustworthy.
  - Mitigation: Prefer narrowing/guarding over `as` assertions; where a type error reveals a genuine logic issue, fix the logic, and note it explicitly rather than silently suppressing.
- **Risk (AUTOPSY-P0-01 direct):** Without this sub-phase, every later phase's changes ship without a type-safety net.
  - Mitigation: This sub-phase is sequenced first for exactly this reason; no later Phase 1–6 sub-plan should be started before this one's acceptance criteria pass.

## 12. Desired End State

`npm run build` and a standalone `npm run typecheck` both exist, both invoke `tsc --noEmit`, and both fail on a real type error. The repository's actual baseline error count is known and recorded (in the Step 4 implementation summary / `Planing-Ledger.md`), not assumed. `tsconfig.json`'s `strict: true` contract, previously aspirational, is now enforced at build time. The Step 4 ledger entry for this sub-phase should record: the baseline error count found, a summary of what was fixed, and confirmation that the negative-path build-failure test was performed and reverted.

## 13. Next Sub-Phase Transition Criteria

- `npx tsc --noEmit` passes with exit code 0.
- `npm run build` has been proven to fail on a deliberate type error and to pass without one.
- The `typecheck` script name is finalized in `package.json` (Faz1.2's ESLint script and Faz1.3's CI workflow both reference it by this exact name).
- No live credentials or external infrastructure were touched — this sub-phase remains entirely local-readiness work.
- Work on Faz1.2 (ESLint Configuration) may begin once the above are true; Faz1.2 does not have to wait for Faz1.3 or Faz1.4.
