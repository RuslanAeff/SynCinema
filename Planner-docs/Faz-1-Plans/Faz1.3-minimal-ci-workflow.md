# Faz 1.3 — Minimal CI Workflow

## 1. Context

`Main-Planing.md` Section 4 (Target End State, Operational target) states: "A CI pipeline (build + lint + typecheck, and eventually tests) runs before merge." `Autopsy.md` finding **AUTOPSY-P0-02** groups "no automated tests, CI, or lint configuration" as the second-highest-priority gap in the project, and explicitly states "Phase 1 sub-plans must specify a minimal CI workflow (typecheck + lint + build) as a concrete deliverable, not an aspiration." This sub-phase is the direct consumer of **Faz1.1**'s `typecheck` script and **Faz1.2**'s `lint` script — it does not introduce new checks, it wires the two that already exist (plus the pre-existing `build`) into a workflow that runs automatically.

This is also the first artifact-producing sub-phase in the whole roadmap: `Main-Planing.md` Section 5 notes "Artifact/evidence boundaries: None currently exist beyond git history itself ... Phase 1 and Phase 2 introduce the first artifacts (CI logs, migration files)." A green CI run is the first piece of evidence future sub-phases (and Step 4 implementation runs) can point to.

## 2. Goal

Every push and pull request against the repository automatically runs typecheck, lint, and build, and a failure in any of them is visible before merge — replacing the current all-manual verification model with a machine-checked one.

## 3. Description

**Problem solved:** `Autopsy.md` Section 8 confirms no `.github/workflows/` directory or any other CI config exists. Today, a regression in any of the three gates (type errors, lint violations, build failures) is only caught if the developer happens to run the relevant command locally before pushing.

**Why it belongs at this point:** It must come after Faz1.1 and Faz1.2 because it references their exact script names (`typecheck`, `lint`) rather than reinventing the commands; sequencing it first would mean guessing at commands that do not exist yet.

**Risk reduction:** Converts every future sub-phase's local-readiness validation into an automatically-enforced gate, closing AUTOPSY-P0-02 for the CI half of that finding (the "no tests" half is Phase 4's job, and this workflow should be structured so Phase 4 can add a `test` step later without restructuring the workflow file).

**Preparation for later phases:** Phase 2 (security fixes), Phase 3 (doc fixes with a live-load acceptance signal), and Phase 4 (test coverage) all benefit from this gate existing first — any regression they might introduce is now caught automatically rather than requiring the developer to remember to run three separate local commands.

**Vibecoding slice strategy:**
- First useful slice: the smallest possible workflow file — checkout, install, run the three existing scripts — with no matrix builds, no caching optimization, no deployment step.
- Fastest validation signal: push a commit (or open a throwaway PR) and observe the Actions run in the GitHub UI; a green check is the validation signal.
- What not to over-plan yet: do not add a test step (no test runner exists until Phase 4), do not add branch protection rules requiring the check to pass before merge (that is a GitHub repository setting, not a file in this repo, and requires a decision this sub-plan does not have standing to make silently — flag it as a recommended follow-up instead), and do not add deployment/release automation.

## 4. Scope

- One new GitHub Actions workflow file (e.g. `.github/workflows/ci.yml`) triggered on `push` and `pull_request` against the default branch.
- Steps: checkout, set up Node (matching the `@types/node` version implied by `package.json`'s devDependencies, currently `^22.14.0`), `npm ci`, `npm run typecheck`, `npm run lint`, `npm run build`.
- Recommending (as a follow-up note, not an in-repo change) that the user enable "require status checks to pass" branch protection on GitHub for this workflow, since that setting lives outside this repository's files.

## 5. Out of Scope

- Adding a test step — no test runner exists yet; this is Phase 4's responsibility to add once Faz4.1 lands.
- Deployment or Vercel-integration automation — the project already deploys via Vercel's own GitHub integration; this CI workflow is a pre-merge gate, not a deployment pipeline, and duplicating Vercel's deploy step would be redundant.
- Branch protection rule configuration itself (a GitHub repository setting, not a file) — only recommended as a follow-up, not performed, since it is a human/repo-admin action outside this sub-phase's file-boundary scope.
- Any secret/credential usage — this workflow needs none, since `typecheck`/`lint`/`build` are all fully local operations requiring no `VITE_SUPABASE_*` values (per the ontology invariant that the app must build/run with those env vars absent).

## 6. Current Repository Evidence

- No `.github/` directory exists anywhere in the repository (confirmed via repository inspection `find` and `Autopsy.md` Section 2, "Tests/CI evidence: None found. No `.github/` directory").
- `package.json` devDependencies include `@types/node": "^22.14.0"`, giving a reasonable Node version signal for the workflow's `setup-node` step.
- `Main-Planing.md` Section 10 notes "whether any CI/branch-protection exists on the GitHub remote could not be verified from this local clone; only the local absence of `.github/workflows/` was confirmed" — this sub-phase's Step 4 execution should re-check the remote once credentials/access allow, but should not block on it, since a local-only workflow file is still correct and useful regardless.

## 7. Planned Work Breakdown

- **F1.3-01 — Author `.github/workflows/ci.yml`**
  - Description: Create the workflow with `push`/`pull_request` triggers, Node setup, `npm ci`, and sequential `typecheck` → `lint` → `build` steps (fail-fast, so the earliest, cheapest check fails first).
  - Output: New workflow file.
- **F1.3-02 — Verify the workflow triggers and passes**
  - Description: Push the branch (or open a PR) containing this workflow and confirm in the GitHub Actions UI that all three steps run and pass against the current (by-then Faz1.1/Faz1.2-clean) repository state.
  - Output: A passing Actions run, referenced by URL/run-ID in the Step 4 ledger entry as evidence.
- **F1.3-03 — Verify the workflow actually fails on a regression**
  - Description: As a one-time proof (mirroring Faz1.1's F1.1-05 negative test), temporarily reintroduce a trivial type error or lint violation on a throwaway branch/PR, confirm CI goes red, then close/delete that throwaway branch without merging.
  - Output: Confirmed evidence the gate is real, not just present.
- **F1.3-04 — Document the branch-protection follow-up**
  - Description: Note (in the Step 4 ledger, Section 8 "Open Decisions and Follow-Ups") that enabling "require status checks to pass before merging" on the repository's branch protection settings is a recommended human action outside this sub-phase's scope.
  - Output: A recorded, explicit follow-up rather than a silently-assumed one.

## 8. Acceptance Criteria

- `.github/workflows/ci.yml` exists and triggers on both `push` and `pull_request`.
- A real Actions run (referenced by ID/URL) shows `typecheck`, `lint`, and `build` all passing against the current repository state.
- A deliberately-broken throwaway branch/PR shows the same workflow failing, proving the gate is not a no-op (F1.3-03), and that throwaway branch is not merged or left dangling.
- No secrets or credentials are referenced in the workflow file.
- The branch-protection recommendation is explicitly recorded as a follow-up, not silently assumed to already be configured.

## 9. Validation and Test Approach

- **CI validation (primary):** the GitHub Actions run itself is both the implementation and its own validation (VAL-CI).
- **Local pre-check:** `npm run typecheck && npm run lint && npm run build` run locally once before pushing, as a fast sanity check before relying on the remote CI run.
- This sub-phase produces the project's first CI artifact (a workflow run log), satisfying part of `Main-Planing.md` Section 5's "Artifact/evidence boundaries" gap.
- No security or live-environment validation applies beyond confirming no secrets are embedded in the workflow file.

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| .github/workflows/ci.yml | proposed | New GitHub Actions workflow running typecheck, lint, and build on push/PR. | VAL-CI |
```

## 10. Dependencies and Sequencing

- Hard dependency on **Faz1.1** (`typecheck` script) and **Faz1.2** (`lint` script) both being merged first.
- Requires push access to the repository's remote (GitHub) to observe an actual Actions run — this is the first sub-phase in the roadmap that needs any live/remote interaction, though it requires no secrets or write access beyond normal git push.
- Requires no human approval to create the workflow file itself; enabling branch-protection enforcement (F1.3-04) does require a human with repository admin access and is explicitly deferred as a recommendation, not performed here.
- Fresh Claude Code session token/context risk: **Low**. One new file, verified via a real but simple CI run. No subagent needed.

## 11. Risks and Mitigations

- **Risk:** CI passes locally-equivalent commands but fails in the GitHub Actions environment due to a Node version or dependency-lock mismatch.
  - Impact: False-negative CI failures that erode trust in the gate.
  - Mitigation: Use `npm ci` (not `npm install`) against the committed `package-lock.json` so the CI environment matches what a fresh clone would install exactly.
- **Risk:** The workflow is created but branch protection is never enabled, so CI runs but does not actually block a bad merge.
  - Impact: The gate becomes advisory-only, silently undermining the Main Plan's Phase 1 goal.
  - Mitigation: F1.3-04 explicitly surfaces this as a recorded follow-up rather than letting it go unmentioned; Step 3's audit should treat an unaddressed version of this follow-up as a signal worth flagging, not a blocker, since it is a GitHub setting outside this repository's file boundary.

## 12. Desired End State

A working `.github/workflows/ci.yml` runs typecheck, lint, and build on every push and pull request, with at least one real passing run and one real (throwaway, unmerged) failing run as evidence. The recommendation to enable required-status-check branch protection is explicitly recorded, not silently skipped. The Step 4 ledger entry should link the passing Actions run and confirm the negative-path test was performed and cleaned up.

## 13. Next Sub-Phase Transition Criteria

- The CI workflow exists, has at least one real passing run, and has been proven to fail on a deliberate regression.
- Faz1.1 and Faz1.2 acceptance criteria are both still true (CI itself is evidence of this).
- The branch-protection follow-up is recorded in the ledger's open decisions.
- Faz1.4 (Dead Weight Removal) may now proceed with CI available as a regression backstop for that removal work — this was the explicit reasoning in `Autopsy.md` Section 13 (AUTOPSY-P3-01: "Good first Phase 1 vibecoding slice ... easy to validate once CI exists").
