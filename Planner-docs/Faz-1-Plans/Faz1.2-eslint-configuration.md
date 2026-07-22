# Faz 1.2 — ESLint Configuration

## 1. Context

`Autopsy.md` Section 6 flags a specific, concrete tooling-drift signal: `src/App.tsx:222` contains `// eslint-disable-line react-hooks/exhaustive-deps`, a comment that only has meaning if ESLint with the `eslint-plugin-react-hooks` plugin is configured and actually run — neither exists anywhere in this repository (`Autopsy.md`, Section 8: "no lint configuration despite one `eslint-disable-line` comment"). `Main-Planing.md` Section 4 (Target End State) states "a lint configuration exists and is enforced" as an explicit technical target, and Section 6, Phase 1 description lists adding ESLint as one of the phase's concrete deliverables alongside the type-check gate.

This sub-phase depends on **Faz1.1** only in the sense that both belong to the same phase and both feed **Faz1.3** (the CI workflow needs both a `typecheck` and a `lint` script to exist); it does not require Faz1.1 to be complete first and can be worked in parallel or immediately after.

## 2. Goal

Give the codebase a real, enforced ESLint configuration — appropriate to a React 19 + TypeScript + Vite project — so that lint rules the code already assumes exist (like `react-hooks/exhaustive-deps`) are genuinely checked, and so Faz1.3's CI workflow has a `lint` script to run.

## 3. Description

**Problem solved:** The codebase contains at least one inline directive (`App.tsx:222`) that presupposes a lint setup with the React Hooks plugin, but no `.eslintrc*`/`eslint.config.*` file and no `eslint` dependency exist in `package.json`. This is exactly the kind of "documentation claims vs. reality" drift the whole Main Plan is built to close, just at the tooling level instead of the doc level.

**Why it belongs at this point:** It is a low-risk, self-contained addition — adding a dev dependency and a config file does not touch runtime behavior — and it directly unblocks Faz1.3, which needs a `lint` script to include in the CI workflow's own gate list.

**How it reduces risk:** Catches an entire class of bugs (stale closures from `exhaustive-deps` violations, unused variables, unreachable code) that `tsc` alone does not catch, complementing Faz1.1's type-safety net rather than duplicating it.

**Vibecoding slice strategy:**
- First useful slice: install ESLint with the flat-config format (matching current ESLint tooling conventions and Vite 6/React 19-era templates), add a minimal `react-hooks` + `@typescript-eslint`-aware config, and run it once to see the current violation count — mirroring Faz1.1's "run it once first" approach.
- Fastest validation signal: `npx eslint .` exit code.
- What not to over-plan yet: do not attempt to enforce a large, opinionated style rule set (e.g., strict import ordering, max-line-length) in this first pass — start with correctness-oriented rules (`react-hooks/exhaustive-deps`, `no-unused-vars`, `@typescript-eslint/no-explicit-any` as a warning, not error, given `Autopsy.md`'s neutral tone on existing `any` usage) and let stricter style rules be a later, evidence-driven addition if the developer wants them.

## 4. Scope

- Adding `eslint`, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh` (Vite's standard React lint stack) as dev dependencies.
- Creating a flat-config `eslint.config.js` (or `.mjs`) scoped to `src/`, `api/`, and root config files, excluding `dist/`, `node_modules/`.
- Configuring `react-hooks/exhaustive-deps` as an active rule so the existing `App.tsx:222` disable comment becomes meaningful again.
- Adding a `"lint": "eslint ."` script to `package.json`.
- Running the new lint config once against the full codebase and fixing (or explicitly, narrowly suppressing with a justified inline comment) whatever it surfaces.
- CI readiness: producing a command (`npm run lint`) that Faz1.3 can add to the GitHub Actions workflow as-is.

## 5. Out of Scope

- Auto-formatting / Prettier integration — not requested by the user's constraints and not blocking any Main Plan target; can be a future, separately-evidenced addition.
- Enforcing lint via a pre-commit git hook — the user's constraints (per `Main-Planing.md` Section 4) call for CI enforcement, not local git hooks; adding hooks would be scope creep beyond what was asked.
- Rewriting or removing the existing `App.tsx:222` disable comment unless the rule actually flags that specific line as a real violation once configured — the comment's presence is evidence lint was intended, not proof the underlying dependency-array issue is currently real or fake.
- Any change to `tsconfig.json` or `Faz1.1`'s typecheck wiring.

## 6. Current Repository Evidence

- `src/App.tsx:222` — `// eslint-disable-line react-hooks/exhaustive-deps`, the sole piece of evidence that ESLint tooling was once assumed/used.
- No `.eslintrc*` or `eslint.config.*` file exists anywhere in the repository root (confirmed via repository inspection `find` output).
- `package.json` — no `eslint` package in `dependencies` or `devDependencies`.
- `Autopsy.md` Section 6 — "No lint configuration despite an assumed one ... a small but telling signal of tooling drift."
- `Autopsy.md` Section 8 — "no lint configuration despite one `eslint-disable-line` comment in `App.tsx` implying a lint setup that does not exist in the repo."
- `Autopsy.md` Section 12, Phase 1 feedback — "The stray `eslint-disable-line` ... should inform the exact ESLint config choice — at minimum, `react-hooks/exhaustive-deps` must be a configured rule so that comment remains meaningful."

## 7. Planned Work Breakdown

- **F1.2-01 — Install ESLint stack**
  - Description: Add `eslint`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh` as dev dependencies matching the project's React 19 / Vite 6 / TS 5.8 versions.
  - Output: Updated `package.json` and `package-lock.json`.
- **F1.2-02 — Create flat-config `eslint.config.js`**
  - Description: Configure recommended TypeScript rules, `react-hooks/recommended`, and `react-refresh/only-export-components` (Vite's standard React fast-refresh guard), scoped to `src/**/*.{ts,tsx}` and `api/**/*.ts`.
  - Output: New `eslint.config.js` at repository root.
- **F1.2-03 — Add `lint` script**
  - Description: Add `"lint": "eslint ."` to `package.json` scripts.
  - Output: Updated `package.json`.
- **F1.2-04 — Baseline lint run and triage**
  - Description: Run `npm run lint`, record the violation count and categories, fix genuine issues (especially any real `exhaustive-deps` violation this surfaces, since that is the specific item Autopsy flagged), and use narrow, justified inline suppressions only where a rule is a legitimate false positive for this codebase's patterns (e.g., the render-null `AudioGraphManager.tsx` component pattern, which is intentional per `Main-Planing.md` Section 5).
  - Output: Zero-error `npm run lint` run (warnings are acceptable if explicitly triaged and accepted, per the vibecoding principle of not over-fixing on the first pass).

## 8. Acceptance Criteria

- `npm run lint` exits 0 against the repository.
- `eslint.config.js` includes `react-hooks/exhaustive-deps` as an active (non-disabled) rule.
- `App.tsx:222`'s existing disable comment is confirmed to correspond to a real rule the linter now checks (the comment is not orphaned).
- No new runtime behavior changes are introduced by this sub-phase — any fix beyond adding the config itself is limited to what the linter's correctness rules (not style rules) require.
- `package.json` contains a `lint` script usable verbatim by Faz1.3's CI workflow.

## 9. Validation and Test Approach

- **Local validation (primary):** `npm run lint` (VAL-LINT).
- **Regression check:** `npm run typecheck` (from Faz1.1, if already landed) should still pass after any lint-driven code change, since a lint fix could theoretically touch typed code.
- **CI validation:** deferred to Faz1.3, which adds `VAL-LINT` to the GitHub Actions workflow.
- This is local-readiness-only work; no live environment or security validation applies directly.

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| package.json | modified | Add ESLint dev dependencies and `lint` script. | VAL-LINT |
| eslint.config.js | proposed | New flat-config ESLint configuration for `src/` and `api/`. | VAL-LINT |
```

## 10. Dependencies and Sequencing

- No hard dependency on Faz1.1 completing first; both can proceed independently, but both must land before Faz1.3 (CI workflow) since CI needs both `typecheck` and `lint` scripts.
- Requires no credentials, live endpoints, or external infrastructure.
- Requires no special human approval beyond normal diff review.
- Fresh Claude Code session token/context risk: **Low**. One new config file, one dependency addition, a bounded triage loop. No subagent needed.

## 11. Risks and Mitigations

- **Risk:** The baseline lint run surfaces many stylistic violations unrelated to the correctness goal, tempting scope creep into a large reformatting pass.
  - Impact: Delays Phase 1 completion for low-value churn.
  - Mitigation: Configure only correctness-oriented rules in this first pass (per Section 4); explicitly defer style/formatting rules as a documented, separate future decision rather than silently expanding scope.
- **Risk:** `react-hooks/exhaustive-deps` flags a real violation in `App.tsx:222` (or elsewhere) that, once fixed correctly, changes actual re-render/effect timing.
  - Impact: A "lint fix" could introduce a behavioral regression in the sync-critical UI if applied carelessly.
  - Mitigation: Treat any real `exhaustive-deps` violation touching sync-critical code (`useVideoPlayer.ts`, `AudioTrackRow.tsx`, per the ontology's core-domain protection principle) as requiring manual verification of the golden path, not just a mechanical fix-and-move-on.

## 12. Desired End State

An `eslint.config.js` exists, `npm run lint` passes cleanly, `react-hooks/exhaustive-deps` is a real, active rule, and the previously-orphaned disable comment at `App.tsx:222` is meaningful again. The Step 4 ledger entry should record the baseline violation count, what was fixed vs. suppressed, and whether any fix touched sync-critical code requiring extra manual verification.

## 13. Next Sub-Phase Transition Criteria

- `npm run lint` passes with no unaddressed errors.
- The `lint` script name is finalized (`lint`) for Faz1.3's CI workflow to reference verbatim.
- Any lint-driven fix touching `useVideoPlayer.ts` or `AudioTrackRow.tsx` has been manually spot-checked for behavioral regression, not just mechanically applied.
- Work on Faz1.3 (Minimal CI Workflow) may begin once both this sub-phase and Faz1.1 are complete.
