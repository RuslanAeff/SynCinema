# Faz 3.2 — Whitepaper License and Version Correction

## 1. Context

`Main-Planing.md` Section 6, Phase 3 description: "correct 'React 18' and 'open-source' in the whitepaper to match the current proprietary license and React 19." `Autopsy.md` Section 6 traces this to a specific dateable event: git history shows commit `5327d6b — Changed license from GPL v3 to Proprietary`, but `docs/WHITEPAPER.md` was evidently never updated afterward — it still describes the project as "open-source" under an "MIT License" framework reference, and still states "React 18" where the actual dependency (per `package.json`) is React 19. `Main-Planing.md` Section 1 frames this specific mismatch as more than cosmetic: "a whitepaper claiming 'open-source' while the actual license is proprietary is a real inconsistency to resolve before any commercial step" — directly tied to the user's stated future commercialization intent.

## 2. Goal

`docs/WHITEPAPER.md` (and its Turkish counterpart `docs/WHITEPAPER_TR.md`) state the project's actual current license (Proprietary — All Rights Reserved) and actual current stack version (React 19), with no residual "open-source"/MIT framing.

## 3. Description

**Problem solved:** A public-facing technical document makes two factually incorrect claims: the license (a legal-optics issue, not merely a technical one, given the stated commercialization intent) and the React major version (a technical accuracy issue). Both are confirmed, dateable drift — the license claim specifically predates a real licensing decision that was never propagated to this document.

**Why it belongs at this point:** Sequenced second in Phase 3, after the mechanically-simpler README fix (Faz3.1), because it requires cross-referencing three sources of truth (the whitepaper text, `LICENSE`, `package.json`) rather than one file against the live filesystem.

**Risk reduction:** `Main-Planing.md` Section 2 states "User trust in what the product claims it can do" must never be compromised, and explicitly calls the license/open-source contradiction a legal-optics risk given the stated future commercialization goal — this is the single most consequential documentation-drift item in the whole plan, not merely a cosmetic one.

**Vibecoding slice strategy:**
- First useful slice: find every occurrence of "open-source," "MIT," and "React 18" in both whitepaper files (English and Turkish) in one search pass, since the fix must be applied consistently to both language versions to avoid creating a new, worse inconsistency (one language correct, one still wrong).
- Fastest validation signal: cross-reference the corrected text against `LICENSE` and `package.json`'s `"react": "^19.2.3"` directly, line by line.
- What not to over-plan yet: do not attempt a full whitepaper rewrite or restructuring beyond the specific factual corrections — this is a targeted accuracy pass, consistent with Faz3.1's scope discipline.

## 4. Scope

- Correcting `docs/WHITEPAPER.md:14`'s "open-source" framing to accurately state the current Proprietary — All Rights Reserved license.
- Correcting `docs/WHITEPAPER.md:55`'s "React 18 | MIT License" table row to "React 19" with the correct license framing (removing the implied MIT association for the framework choice, or clarifying it refers to React's own upstream license if that distinction is what was originally intended — see Section 11 risk on ambiguity).
- Correcting `docs/WHITEPAPER.md:143`'s "SynCinema builds upon established open-source projects and web standards" line if it implies SynCinema itself is open-source rather than merely built using open-source dependencies (a legitimate and different claim) — clarifying the distinction rather than deleting the sentence outright if the underlying claim about dependencies is accurate.
- Applying the equivalent corrections to `docs/WHITEPAPER_TR.md`, keeping both language versions consistent.
- A full-file cross-check of both whitepaper documents against `LICENSE` and `package.json` for any other stale claim beyond the three specifically cited.

## 5. Out of Scope

- README corrections (Faz3.1, already handled independently).
- The CSP/Dropbox question (Faz3.3).
- Any change to `LICENSE` itself or to the actual licensing terms — this sub-phase corrects documentation to match the existing license decision; it does not revisit that decision.
- Translating any *new* content into Turkish beyond mirroring the same factual corrections already made in English — no scope expansion of the Turkish document's content beyond parity with the English fix.

## 6. Current Repository Evidence

- `docs/WHITEPAPER.md:14` — "SynCinema is an open-source, browser-based application..." (confirmed via direct grep this session).
- `docs/WHITEPAPER.md:55` — "| UI Framework | React 18 | MIT License |" (confirmed via direct grep this session).
- `docs/WHITEPAPER.md:143` — "SynCinema builds upon established open-source projects and web standards:" (confirmed via direct grep this session).
- `package.json` — `"react": "^19.2.3"`, `"react-dom": "^19.2.3"` (confirmed via direct read this session) — actual React major version is 19, not 18.
- `package.json` — `"license": "SEE LICENSE IN LICENSE"` — points to the repository's `LICENSE` file as authoritative.
- Git history — commit `5327d6b`, "Changed license from GPL v3 to Proprietary" (per `Main-Planing.md` Section 3, corroborated by `src/main.tsx`/`index.html` headers per the same section stating Proprietary — All Rights Reserved).
- `Autopsy.md` Section 6 — "`docs/WHITEPAPER.md` was evidently not updated after this change — it still describes the project as 'open-source' under 'MIT License' framework references. This is evidence of drift after a deliberate licensing change, not a one-off typo."

## 7. Planned Work Breakdown

- **F3.2-01 — Full-document license/version claim audit**
  - Description: Search both `docs/WHITEPAPER.md` and `docs/WHITEPAPER_TR.md` for every occurrence of "open-source," "open source," "MIT," "React 18," and any other license/version-adjacent claim, cross-referenced against `LICENSE` and `package.json`.
  - Output: A confirmed, complete list of drifted claims in both files (expected: at minimum the three English-file line numbers already cited, plus their Turkish equivalents).
- **F3.2-02 — Correct the license framing**
  - Description: Replace "open-source" claims with accurate language reflecting the current Proprietary — All Rights Reserved license, in both language versions.
  - Output: Updated `docs/WHITEPAPER.md`, `docs/WHITEPAPER_TR.md`.
- **F3.2-03 — Correct the React version**
  - Description: Update "React 18" to "React 19" in the technology table (and any other version-specific mention found in F3.2-01), in both language versions.
  - Output: Updated `docs/WHITEPAPER.md`, `docs/WHITEPAPER_TR.md`.
- **F3.2-04 — Reconcile the "builds upon open-source projects" sentence**
  - Description: Clarify that SynCinema is *built using* open-source dependencies/standards (an accurate claim about its dependency stack) without implying SynCinema *itself* is open-source (an inaccurate claim about its own license) — apply consistently to both language versions.
  - Output: Updated `docs/WHITEPAPER.md`, `docs/WHITEPAPER_TR.md`.
- **F3.2-05 — Cross-check the corrected text against `LICENSE` and `package.json` one final time**
  - Description: Re-read the corrected whitepaper sections side-by-side with `LICENSE`'s actual terms and `package.json`'s actual dependency versions to confirm no remaining mismatch.
  - Output: Confirmed final consistency.

## 8. Acceptance Criteria

- Neither `docs/WHITEPAPER.md` nor `docs/WHITEPAPER_TR.md` contains any claim that SynCinema itself is open-source or MIT-licensed.
- Both documents state React 19 (not React 18) wherever the framework version is mentioned.
- The "builds upon open-source projects" claim (or its corrected equivalent) accurately distinguishes SynCinema's own license from its dependencies' licenses.
- English and Turkish versions are consistent with each other after the fix (no language where the correction was applied and the other where it was missed).
- No other content in either whitepaper is altered beyond the specific factual corrections and their necessary surrounding context.

## 9. Validation and Test Approach

- **Manual/document validation (primary):** the full-document audit (F3.2-01) and final cross-check (F3.2-05) (VAL-DOCS-WHITEPAPER).
- **Cross-reference validation:** direct comparison against `LICENSE`'s actual text and `package.json`'s actual dependency versions, not against assumption or memory.
- This is documentation-only validation; no source code, build, or live-environment validation applies.

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| docs/WHITEPAPER.md | modified | Correct open-source/MIT license claims and React 18→19 version references. | VAL-DOCS-WHITEPAPER |
| docs/WHITEPAPER_TR.md | modified | Apply the same corrections as WHITEPAPER.md for consistency. | VAL-DOCS-WHITEPAPER |
| LICENSE | existing | Read-only source of truth for the correct license framing. | VAL-DOCS-WHITEPAPER |
```

## 10. Dependencies and Sequencing

- No hard dependency on Faz3.1, though both are part of the same phase and can be done in either order or in parallel.
- No dependency on Faz3.3.
- Requires no credentials, live endpoints, or human approval for the correction itself — this is documentation matching already-decided, already-committed facts (the license decision was already made in commit `5327d6b`; this sub-phase only propagates it to the whitepaper).
- Fresh Claude Code session token/context risk: **Low**. Two related documentation files, mechanically cross-checkable against two authoritative sources (`LICENSE`, `package.json`). No subagent needed.

## 11. Risks and Mitigations

- **Risk:** The "React 18 | MIT License" table row's "MIT License" column might have been intended to describe React's *own* upstream license (which is indeed MIT), not SynCinema's license for using React — conflating this with SynCinema's own license status during the fix could over-correct or introduce a new inaccuracy.
  - Impact: A fix that removes an actually-correct statement about React's own license while trying to fix an unrelated claim about SynCinema's license.
  - Mitigation: F3.2-01's audit should read the full surrounding table context before editing, and F3.2-03's fix should preserve an accurate "React's own license is MIT" framing if that is genuinely what the table intended, while still fixing the version number and separately fixing the actual SynCinema-is-open-source claim at line 14/143.
- **Risk:** The Turkish translation drifts further from the corrected English text over time if only English is updated carefully.
  - Impact: Reintroducing the exact "one language fixed, one not" inconsistency this sub-phase is trying to prevent.
  - Mitigation: F3.2-01 through F3.2-04 each explicitly include the Turkish file, not as an afterthought.

## 12. Desired End State

Both whitepaper documents accurately state SynCinema's actual current license (Proprietary — All Rights Reserved) and actual current React version (19), with no residual open-source/MIT framing describing SynCinema itself, verified against `LICENSE` and `package.json` directly rather than assumed. The Step 4 ledger entry should record the full list of corrected claims in both language versions and confirm the final cross-check against `LICENSE`/`package.json` passed.

## 13. Next Sub-Phase Transition Criteria

- Both whitepaper documents pass the final cross-check against `LICENSE` and `package.json`.
- English and Turkish versions are confirmed consistent with each other.
- Faz3.3 (CSP/Dropbox Reconciliation) may proceed independently; this sub-phase does not block it, and Phase 3 as a whole may be considered complete once Faz3.1, Faz3.2, and Faz3.3 all pass their respective acceptance criteria.
