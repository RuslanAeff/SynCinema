# Faz 1.4 — Dead Weight Removal

## 1. Context

`Main-Planing.md` Section 4 (Target End State, Technical target) names two specific items: "the two known dead-weight items (`wavesurfer.js` dependency, unused audio tab in `UrlLoaderModal.tsx`) are removed or intentionally justified." `Autopsy.md` Section 5 (Placeholder, Stub, and Skeleton Analysis) and Section 13 (**AUTOPSY-P3-01**) independently confirm both findings with exact evidence. `Autopsy.md` Section 12 explicitly recommends this as "a good first Phase 1 vibecoding slice — small, independent, easy to validate once CI exists," which is why this sub-plan is sequenced last within Phase 1: it depends on **Faz1.3**'s CI existing to catch any accidental regression from the removal.

## 2. Goal

Eliminate the two confirmed dead-weight items — the unused `wavesurfer.js` dependency and the unreachable audio-URL-loading tab inside `UrlLoaderModal.tsx` — so the dependency tree and the UI code both reflect only what is actually shipped and reachable.

## 3. Description

**Problem this solves:** Two distinct but related signals of "code that looks alive but isn't": a runtime dependency (`wavesurfer.js`) with zero import references anywhere in `src/` or `api/`, and a fully-implemented but never-rendered UI code path (`UrlLoaderModal.tsx:220-268`'s audio tab). Both inflate maintenance surface without providing user value today.

**Why it belongs at this point in the roadmap:** It is intentionally the last Phase 1 item because it is a removal/cleanup task, and removals are exactly the kind of change that benefits most from a working CI safety net (Faz1.3) catching any accidental breakage — this ordering directly follows `Autopsy.md`'s own recommendation.

**Risk reduction:** Closes AUTOPSY-P3-01; reduces `node_modules` install surface and removes a source of future confusion for a contributor who might otherwise assume the audio-URL tab is a working, shippable feature.

**Preparation for later phases:** None directly, but it keeps Phase 1's "reconcile what exists with what's real" theme consistent before Phase 3 does the same for documentation.

**Vibecoding slice strategy:**
- First useful slice: confirm zero `wavesurfer` import references one more time at implementation time (in case anything changed since the Autopsy), then remove the dependency — the cheapest, most isolated part of this sub-phase.
- Fastest validation signal: `npm run build` (with Faz1.1's typecheck gate active) after `npm uninstall wavesurfer.js`; a clean build with no missing-import errors is immediate proof nothing depended on it.
- What not to over-plan yet: this sub-plan intentionally does not decide, in advance, whether the `UrlLoaderModal.tsx` audio tab should be *finished* (wire up the missing tab-switcher UI) or *removed* (delete the dead code) — `Autopsy.md` Section 5 explicitly frames this as "Step 2 should either finish wiring the tab UI or remove the dead code; either is a small, low-risk slice." This sub-plan defaults to **removal** as the lower-risk, lower-scope option consistent with "dead weight removal" framing, but records finishing it as an explicitly-considered, deferred alternative a human can choose instead at Step 4 time.

## 4. Scope

- Removing `wavesurfer.js` from `package.json` dependencies and `package-lock.json`.
- Removing the unreachable audio-tab state, handlers, and JSX (`UrlLoaderModal.tsx:220-268`'s `activeTab`, `audioUrl`, `audioValidation`, `handleLoadAudio`, and any related unused props such as `onAudioUrlLoad`) from `UrlLoaderModal.tsx`, and tracing whether `onAudioUrlLoad` is passed in from `App.tsx`/`Sidebar.tsx` as a prop that also becomes dead once the tab is removed.
- Re-running `npm run build`/`npm run typecheck` to confirm no residual references remain anywhere in the tree (props threaded through parent components are a real risk here, per `Sidebar.tsx`'s 30+ props).

## 5. Out of Scope

- Finishing/wiring the audio-tab UI as a shipped feature — recorded as the deferred alternative per Section 3, not performed in this sub-plan's default path.
- Any other dependency audit beyond the two specifically confirmed items — this is not a general `npm prune`/dependency-hygiene pass.
- Any change to the video-URL-loading path in `UrlLoaderModal.tsx`, which is fully reachable and working and must be left untouched.

## 6. Current Repository Evidence

- `package.json:16` — `"wavesurfer.js": "^7.12.1"` listed as a direct dependency; confirmed present in `package-lock.json` per `Autopsy.md` Section 2.
- `Autopsy.md` Section 5 — "zero import references exist anywhere in `src/` or `api/`."
- `src/components/UrlLoaderModal.tsx:220-268` (read directly this session) — `activeTab`, `audioUrl`, `audioValidation`, `handleLoadAudio` are fully implemented but the component only ever renders the video-URL form (confirmed: no tab-switcher UI exists in the JSX read during this Step 2 session).
- `Autopsy.md` Section 13, AUTOPSY-P3-01 — confirms both findings and their low-risk, independent nature.
- `UrlLoaderModalProps` interface (`UrlLoaderModal.tsx:13-18`) includes `onAudioUrlLoad: (url: string, filename: string) => void` — this prop's caller chain in `App.tsx`/`Sidebar.tsx` must be traced before removal, since deleting only the internal usage without checking the prop's origin could leave an orphaned handler upstream.

## 7. Planned Work Breakdown

- **F1.4-01 — Re-confirm zero `wavesurfer.js` usage**
  - Description: Re-run a repository-wide search for `wavesurfer` imports immediately before removal, to catch any drift since the Autopsy was written.
  - Output: Confirmed zero-reference evidence (or, if a reference now exists, this sub-plan's removal step is blocked and must be re-scoped).
- **F1.4-02 — Remove `wavesurfer.js` dependency**
  - Description: `npm uninstall wavesurfer.js`, confirm `package.json`/`package-lock.json` no longer list it.
  - Output: Updated `package.json`, `package-lock.json`.
- **F1.4-03 — Trace `onAudioUrlLoad` prop chain**
  - Description: Follow `onAudioUrlLoad` from `UrlLoaderModal.tsx` up through its parent invocation (likely `App.tsx` or `Sidebar.tsx`) to determine whether the handler it's wired to has any other caller or side effect worth preserving.
  - Output: A short evidence note on the prop's full call chain, informing F1.4-04's exact diff boundary.
- **F1.4-04 — Remove the dead audio-tab code path**
  - Description: Delete `activeTab`, `audioUrl`, `audioValidation`, `handleLoadAudio`, and the now-unused `audioValidation`-related `validateUrl(..., 'audio')` call sites from `UrlLoaderModal.tsx`; remove `onAudioUrlLoad` from `UrlLoaderModalProps` and its upstream wiring if F1.4-03 confirms it has no other use.
  - Output: Updated `UrlLoaderModal.tsx` and, if applicable, its parent component(s).
- **F1.4-05 — Regression build/typecheck/lint pass**
  - Description: Run `npm run typecheck`, `npm run lint` (once Faz1.2 exists), and `npm run build` after both removals; manually re-verify the video-URL-loading path (Google Drive, Dropbox, YouTube, direct file) still renders and functions in a local dev run, since this is a UI change to a component on the media-ingestion golden path.
  - Output: Clean typecheck/lint/build; a manual golden-path confirmation note.

## 8. Acceptance Criteria

- `wavesurfer.js` no longer appears in `package.json`, `package-lock.json`, or `node_modules` after a fresh `npm install`.
- `UrlLoaderModal.tsx` no longer contains `activeTab`, `audioUrl`, `audioValidation`, or `handleLoadAudio` state/handlers, and no tab-switcher UI exists for a feature that was never reachable.
- The video-URL-loading form in `UrlLoaderModal.tsx` (Google Drive, Dropbox, YouTube, direct file detection) is unchanged in behavior — manually verified, not just typechecked.
- `npm run typecheck`, `npm run lint`, and `npm run build` all pass after the removal.
- If `onAudioUrlLoad`'s upstream caller in `App.tsx`/`Sidebar.tsx` has any independent purpose beyond feeding this dead tab, that is documented and the prop is preserved with a note rather than silently deleted.

## 9. Validation and Test Approach

- **Local validation:** `npm run typecheck` (VAL-TYPECHECK), `npm run lint` (VAL-LINT), `npm run build` (VAL-BUILD) — all three should already exist from Faz1.1–Faz1.3 by the time this sub-phase executes.
- **Manual golden-path check:** load a video via URL (at minimum one working, already-functional source such as a direct HTTPS file or YouTube link) in a local `npm run dev` session after the change, confirming the remaining video-tab UI still works exactly as before.
- **CI validation:** the Faz1.3 workflow runs automatically on the PR containing this change, providing the first real-world proof that the new CI gate catches (or, ideally, does not need to catch anything, because the removal was clean) a regression.
- This sub-phase does not touch any security-relevant surface.

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| package.json | modified | Remove `wavesurfer.js` dependency. | VAL-BUILD |
| package-lock.json | modified | Reflect `wavesurfer.js` removal. | VAL-BUILD |
| src/components/UrlLoaderModal.tsx | modified | Remove unreachable audio-tab state/handlers/JSX. | VAL-TYPECHECK, VAL-LINT, VAL-BUILD |
| src/App.tsx | existing | Read-only context to trace `onAudioUrlLoad` prop origin; modified only if F1.4-03 confirms the prop is safe to remove upstream. | VAL-TYPECHECK |
```

## 10. Dependencies and Sequencing

- Depends on **Faz1.3** (CI workflow) being merged first, so this removal is validated by an automated gate, per `Autopsy.md`'s explicit sequencing recommendation.
- Benefits from, but does not strictly require, **Faz1.2** (ESLint) — if ESLint is not yet merged, `npm run lint` in Section 9 is simply skipped for this sub-phase's validation and re-applied once Faz1.2 lands.
- No credentials, live endpoints, or human approval required beyond normal diff review; this is a pure removal with no new capability introduced.
- Fresh Claude Code session token/context risk: **Low**. Two small, independent, well-evidenced removals. No subagent needed.

## 11. Risks and Mitigations

- **Risk:** `onAudioUrlLoad`'s upstream wiring in `App.tsx`/`Sidebar.tsx` turns out to be used for something beyond this dead tab (e.g., a shared handler also used elsewhere).
  - Impact: A careless removal could break an unrelated feature.
  - Mitigation: F1.4-03 explicitly requires tracing the prop chain before F1.4-04 deletes anything upstream of `UrlLoaderModal.tsx` itself.
- **Risk:** Removing the audio-tab code accidentally also removes or breaks the still-reachable video-tab logic, since both share the same file and some validation helpers (`validateUrl` is shared between `'video'` and `'audio'` types).
  - Impact: A user-facing regression on the working video-loading golden path.
  - Mitigation: F1.4-05 requires an explicit manual verification of the video path after the change, not just a passing typecheck (typecheck cannot catch a JSX rendering regression).
- **Risk:** A future contributor wanted the audio-tab feature finished, not removed.
  - Impact: Perceived loss of a "shovel-ready" feature.
  - Mitigation: Section 3 explicitly records "finish instead of remove" as a considered, deferred alternative, so the decision is traceable and reversible (the deleted code remains in git history) rather than silently lost.

## 12. Desired End State

`wavesurfer.js` is absent from the dependency tree; `UrlLoaderModal.tsx` contains only the working, reachable video-URL-loading path with no dead audio-tab code; all three Phase 1 validation gates (typecheck, lint, build) pass; and the video-loading golden path has been manually re-confirmed working. The Step 4 ledger entry should record which of the two options (remove vs. finish) was chosen for the audio tab and why, plus the manual golden-path verification result.

## 13. Next Sub-Phase Transition Criteria

- Both dead-weight items (AUTOPSY-P3-01) are closed: `wavesurfer.js` removed, audio-tab dead code removed (or, if a human overrides the default and chooses to finish it instead, that decision is recorded and the feature is fully wired and tested — either path satisfies this criterion).
- All Phase 1 validation gates (typecheck, lint, build, CI) pass on the resulting state.
- The video-URL-loading golden path is manually confirmed unaffected.
- Phase 1 is now complete; Phase 2 (Security Hardening) sub-plans may begin, per `Main-Planing.md` Section 9's explicit sequencing ("Phase 1 first because CI/typecheck is what makes every subsequent phase safe to implement without manual-only verification").
