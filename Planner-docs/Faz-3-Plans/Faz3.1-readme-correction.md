# Faz 3.1 — README Correction

## 1. Context

`Main-Planing.md` Section 6, Phase 3 description: "Correct the stale `VuMeter.tsx` reference and dev-port claim in README." `Autopsy.md` Section 6 confirms both: README's project-structure section (`README.md:169`) lists `VuMeter.tsx`, which was deleted per the commit history summary provided at session start ("T3 ölü VuMeter.tsx silindi"); and README's stated dev-server port ("5173" at `README.md:476`) does not match `vite.config.ts:9`'s actually-configured port `3000`. This is the first Phase 3 sub-phase because it is the most self-contained doc fix — a single file, two independently-verifiable line-level corrections — and Phase 3 as a whole has no dependency on Phase 1 or Phase 2 completing first (`Main-Planing.md` Section 8, item 6: "Reconcile README/whitepaper claims — does not depend on Phase 1/2 completing first").

## 2. Goal

`README.md` accurately reflects the current repository structure (no reference to deleted files) and the actual dev-server configuration (correct port).

## 3. Description

**Problem solved:** Two concrete, independently-verifiable drift points between README and reality: a component that no longer exists is still listed as if it does, and the documented "how to start developing" instruction gives a port that will not work.

**Why it belongs at this point:** `Main-Planing.md` Section 1 frames documentation drift as a broader "gap made more consequential by the user's stated intent to commercialize later" — but within Phase 3 specifically, README corrections are sequenced first because they are the most mechanically verifiable (a file either exists or doesn't; a configured port either matches or doesn't), unlike the whitepaper's license/version claims (Faz3.2) or the CSP/Dropbox question (Faz3.3), which need cross-referencing external convention or a live test.

**Risk reduction:** A wrong dev-port instruction actively wastes a new contributor's (or future Claude Code session's) time; a stale component reference misleads anyone trying to understand the current architecture from the README alone.

**Vibecoding slice strategy:**
- First useful slice: grep README for every file/path reference and cross-check each against the actual `src/` tree in one pass, rather than fixing the two known items and assuming nothing else has drifted.
- Fastest validation signal: for the port fix, actually run `npm run dev` and confirm the printed local URL matches what the corrected README now states.
- What not to over-plan yet: do not attempt a full README rewrite or restructuring — this is a targeted correction pass, not a content redesign.

## 4. Scope

- Removing the `VuMeter.tsx` line from README's project-structure listing (`README.md:169`).
- Correcting the dev-server port reference from `5173` to `3000` (`README.md:476` and any other occurrence of `5173` found during the full-file cross-check).
- A full pass over README's file/path references against the actual `src/` tree, to catch any additional drift beyond the two already-known items (the Main Plan and Autopsy found these two via targeted review, not necessarily an exhaustive one).

## 5. Out of Scope

- Whitepaper corrections (Faz3.2).
- The CSP/Dropbox media-source question (Faz3.3).
- Any content additions to README beyond correcting existing inaccuracies (e.g., do not add new feature documentation as part of this cleanup pass).

## 6. Current Repository Evidence

- `README.md:169` — lists `VuMeter.tsx` in the project-structure tree; `Autopsy.md` Section 6 confirms this file was deleted per commit history at session start ("T3 ölü VuMeter.tsx silindi").
- `README.md:476` — `# Start dev server (http://localhost:5173)`.
- `vite.config.ts:9` — `port: 3000` (read directly this session, confirms the Main Plan's and Autopsy's claim).
- `Autopsy.md` Section 6 — "The dev-server port in README (`README.md`, "5173") does not match `vite.config.ts:9`'s configured port `3000`."

## 7. Planned Work Breakdown

- **F3.1-01 — Full README file-reference cross-check**
  - Description: Extract every file/directory path mentioned in README's project-structure section and diff it against the actual current `src/`/`api/` tree.
  - Output: A confirmed list of drifted references (expected: at minimum the known `VuMeter.tsx` entry; possibly others).
- **F3.1-02 — Remove the stale `VuMeter.tsx` reference**
  - Description: Delete the `VuMeter.tsx` line from README's project-structure listing (and correct any surrounding tree-formatting characters so the ASCII tree remains valid).
  - Output: Updated `README.md`.
- **F3.1-03 — Correct the dev-server port**
  - Description: Change `5173` to `3000` in the dev-server instructions, and search the rest of README for any other `5173` occurrence that should also be `3000`.
  - Output: Updated `README.md`.
- **F3.1-04 — Verify the corrected port against a real `npm run dev` run**
  - Description: Run `npm run dev` and confirm the terminal's printed local URL matches the corrected README instruction exactly.
  - Output: Confirmed evidence the fix is accurate, not just internally consistent.

## 8. Acceptance Criteria

- README's project-structure section contains no reference to `VuMeter.tsx` or any other file confirmed deleted during F3.1-01's cross-check.
- README's dev-server instructions state port `3000`, verified against an actual `npm run dev` run's output.
- No other file/path reference in README is found to contradict the current repository structure after F3.1-01's full pass (or, if found, it is corrected in this same sub-phase rather than deferred silently).
- No unrelated README content is changed.

## 9. Validation and Test Approach

- **Manual/document validation (primary):** the file-reference cross-check (F3.1-01) and the live `npm run dev` port confirmation (F3.1-04) (VAL-DOCS-README).
- **Local validation:** none required beyond `npm run dev` running successfully — this sub-phase does not touch source code, so `typecheck`/`lint`/`build` are unaffected and not required to re-verify.
- This is documentation-only validation; no security or live-deployment validation applies.

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| README.md | modified | Remove stale VuMeter.tsx reference; correct dev-server port from 5173 to 3000; fix any other drifted file reference found. | VAL-DOCS-README |
```

## 10. Dependencies and Sequencing

- No dependency on any Phase 1 or Phase 2 sub-phase, or on Faz3.2/Faz3.3 within this phase.
- Requires no credentials, live endpoints, or human approval — pure documentation correction verified against local repository state.
- Fresh Claude Code session token/context risk: **Low**. Single documentation file, mechanically verifiable. No subagent needed.

## 11. Risks and Mitigations

- **Risk:** The full cross-check (F3.1-01) surfaces more drift than the two known items, expanding scope unpredictably.
  - Impact: A larger-than-expected documentation pass.
  - Mitigation: Any additional drift found is still within this sub-phase's stated scope ("Correcting the actual repository structure vs. README's claims") and should be fixed in the same pass rather than deferred, since the fix cost per additional item is low (each is a targeted line correction, not a redesign).
- **Risk:** Removing the `VuMeter.tsx` line breaks the ASCII tree's visual formatting (indentation/branch characters) if not handled carefully.
  - Impact: A cosmetically broken project-structure diagram.
  - Mitigation: F3.1-02 explicitly includes correcting surrounding tree-formatting characters, not just deleting the text.

## 12. Desired End State

README's project-structure section and dev-server instructions both accurately reflect the current repository, verified against real repository state and a real `npm run dev` run rather than assumed correct. The Step 4 ledger entry should record the full list of corrections made, including any beyond the two originally known items.

## 13. Next Sub-Phase Transition Criteria

- README's file references and dev-port instruction are confirmed accurate against live verification.
- Faz3.2 (Whitepaper Correction) and Faz3.3 (CSP/Dropbox Reconciliation) may proceed independently; neither depends on this sub-phase.
