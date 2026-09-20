# SynCinema — Evidence Index

Inventory of sources examined for the thesis comparison, and the candidate
development events they support. Prepared 2026-09-20 (times UTC; repository
commits carry local offset +02:00).

Repository: SynCinema (`main`), review commit `73d62dc`, working tree clean.

Evidence levels used here follow the hub's provisional scheme (E0 narrative,
E1 code/config change, E2 automated verification, E3 real runtime/device
observation, E4 scoped human acceptance or release). They are recorded per
claim, not aggregated into a score. The scheme itself is not settled.

---

## 1. Sources examined

| ID | Path (relative) | Kind | Event date | Examined | Supports | Does not support / limits |
|---|---|---|---|---|---|---|
| S-01 | `Planner-docs/Planing-Ledger.md` | Retrospective + contemporaneous run ledger | Entries dated 2026-07-22; file added to git 2026-07-22 (`f4cc9e4`) | 2026-09-20 | Run-by-run record of AI-assisted phases, per-sub-phase status, explicit blockers and follow-ups | Written by the AI-assisted process it describes. Status words like `verified` do **not** all mean runtime verification — see S-01a. Not independently audited. |
| S-01a | `Planner-docs/Planing-Ledger.md` line 38 (Faz2.4 row) | Self-reported verification detail | 2026-07-22 | 2026-09-20 | That Faz2.4 was closed by **code trace**, not a live browser test: "no browser automation available in this environment … substituted a full code-trace … instead of a live browser test"; "pending live browser confirmation by the user" | Directly contradicts reading the row's `verified` label as E3. Any claim of live browser behaviour for the microphone gate. |
| S-02 | `Planner-docs/Autopsy.md` | Pre-work defect inventory | Added 2026-07-22 | 2026-09-20 | Origin of the microphone finding (`AUTOPSY-P2-01`), with file/line pointers | Authorship of the analysis is not stated inside the file itself. |
| S-03 | `Planner-docs/Faz-2-Plans/Faz2.4-microphone-permission-gesture-gate.md` | Task sub-plan (pre-implementation) | Added 2026-07-22 | 2026-09-20 | The stated requirement, scope limits, and a named manual check (`VAL-MANUAL-PERMISSION-GATE`) | Whether that manual check was ever executed. |
| S-04 | `Planner-docs/Main-Planing.md`, `Sub-Planing-Index.md`, `Sub-Planing-Audit.md`, `Project-Ontology.md`, `Faz-1..7-Plans/` | Planning corpus | Added 2026-07-22 | 2026-09-20 (index level; **not read in full**) | Existence and shape of a structured AI planning workflow | Contents not exhaustively read. Treat as partially examined. |
| S-05 | Git history, 108 commits, 2025-12-25 → 2026-09-20 | Primary VCS record | spans | 2026-09-20 | Dates, diffs, commit messages, before/after states | All 108 commits have a single author identity, so authorship alone never separates AI-assisted from hand-written work. |
| S-06 | Git trailers: 16 commits carry `Co-Authored-By` | Primary VCS record | 2026-05-30 (4), 2026-07-22 (11), 2026-09-20 (3, this session) | 2026-09-20 | The only machine-readable AI attribution in the repo | Covers 16 of 108 commits. Absence of a trailer is **not** evidence of absence of AI involvement. |
| S-07 | `.github/workflows/ci.yml` | CI configuration | in tree at review | 2026-09-20 | That CI is configured to run `typecheck` → `lint` → `test` → `build` on push to `main` and on PRs | Whether any run ever passed. No run history was accessible this session (see V-02). |
| S-08 | `vite.config.ts` lines 2–3 | Config | current | 2026-09-20 | The import split (`loadEnv` from `vite`, `defineConfig` from `vitest/config`) that S-01 says was reached after a failed first attempt | The failed first attempt itself. No artifact of it survives in git. |
| S-09 | `src/utils/fileFingerprint.test.ts` lines 5–14 vs `src/utils/fileFingerprint.ts` lines 52, 88 | Source + test | test added 2026-07-22 (`d0e642e`) | 2026-09-20 | That a `window` stub was placed in the **test**, and the source still calls `window.location.origin` — the workaround was not applied to the source | That the underlying browser-path behaviour was ever checked in a browser. |
| S-10 | `src/hooks/useAudioTracks.ts` lines 43–52 | Source | changed 2026-07-22 (`75d06fc`) | 2026-09-20 | That the mount-time `refreshDevices()` call was removed and replaced by an explanatory comment | Runtime behaviour of the permission prompt. |
| S-11 | `supabase/README.md`, `supabase/migrations/0000`–`0004` | Server-side definitions + captured state | 0000–0002 added 2026-07-22; 0003–0004 added 2026-09-20 | 2026-09-20 | Captured DB state and the reasoning for each change | 0003/0004 were authored from **SQL output pasted into a chat session**, not from a repo artifact or a live connection this session. The captured values are unverified from inside this repo. |
| S-12 | `docs/WHITEPAPER.md`, `docs/WHITEPAPER_TR.md` | Project narrative | added before review | 2026-09-20 (existence only; **not read**) | — | Not examined. Listed so the gap is explicit. |

### Searched and not found

- `AGENTS.md`, `CLAUDE.md` at the SynCinema repo root: **absent** at `73d62dc`. (A `CLAUDE.md` exists in sibling project folders, so its absence here is specific to this repo.)
- Any per-session AI transcript stored inside this repository: **none found**. Private chat stores were deliberately not scanned.
- CI run history: not obtainable this session; `gh` CLI unavailable or unauthenticated.

### Hub access

Central SPARK thesis files (`docs/thesis/README.md`, `RESEARCH_LOG.md`,
`research/COORDINATION.md`, `research/PROJECT_HANDOFF_TEMPLATE.md`):
**NOT_ACCESSIBLE** from this session. A sibling folder named for a SPARK backup
exists but contains no `docs/thesis/` directory; it was not explored further. No
hub file was read, and no hub-level or cross-project methodology decision is made
here. The task prompt was used as temporary context only.

---

## 2. Candidate development events

Four candidates are proposed. This is not a quota; they are the events where the
repository itself carries enough to reason about. Each is a request →
implementation → correction → verification arc, not a single commit.

### SYN-C01 — Microphone permission taken off page load

| Field | Content |
|---|---|
| Scope | Removing the mount-time device-permission request; excludes the surrounding device-enumeration design, which the sub-plan explicitly kept. |
| First stated need | `Autopsy.md` `AUTOPSY-P2-01`; expanded in `Faz-2-Plans/Faz2.4-…md` (S-02, S-03). |
| Proven AI authorship | UNKNOWN for the code edit. The planning corpus is labelled as AI-produced in `f4cc9e4` ("ClaudeQB planning artifacts"), and `75d06fc` carries a `Co-Authored-By` trailer, but neither pins the individual line change. |
| Human decision | Sub-plan records an explicit scope limit (trigger point moves; internal logic untouched). Decision-maker not separable from the AI narrative in the source. |
| Before → after | `useAudioTracks.ts`: `refreshDevices();` removed from the mount `useEffect`, replaced by a comment; `devicechange` listener kept (S-10, commit `75d06fc`). |
| Attempts / corrections | Sub-plan step F2.4-03 records that no new wiring was needed — an already-wired "Grant Permission" button existed and had been made redundant by the mount-time call. |
| Automated test | NONE targets this behaviour. S-01 itself states unit tests cannot replace a real prompt check. |
| Runtime observation | **NOT_OBSERVED.** S-01a records a code trace substituted for the browser test, "pending live browser confirmation by the user". |
| Human acceptance | UNKNOWN whether the pending live confirmation was ever performed. |
| Missing evidence | Any E3 observation. Whether a first-time visitor now sees no prompt has never been recorded as observed. |
| Alternative explanations | The button may have been reachable before the change in some flows; the ledger says it was redundant, not absent. |
| Value for SPARK comparison | A clean case where the top-level status word (`verified`) and the actual evidence level (code trace, E1) diverge — useful for testing whether classification rules catch that. |
| Keep? | **Keep.** Strongest documented request→change→acknowledged-gap arc in the repo. |

### SYN-C02 — Test runner bootstrap, with a first attempt that failed

| Field | Content |
|---|---|
| Scope | Introducing Vitest and wiring `npm test` into CI. |
| First stated need | Roadmap Phase 4 / `Faz-4-Plans/Faz4.1-test-runner-bootstrap.md` (S-04). |
| Proven AI authorship | UNKNOWN per-line; `d0e642e` carries a `Co-Authored-By` trailer. |
| Human decision | S-01 records the Phase-4 commit was made "at the user's explicit request", and flags Vitest timing as needing human confirmation. |
| Before → after | `vite.config.ts` now imports `loadEnv` from `vite` and `defineConfig` from `vitest/config` separately (S-08). |
| Attempts / corrections | S-01 states the first attempt imported both from `vitest/config` and "failed with a real startup error, caught and fixed". |
| Automated test | Suite exists and passes today (V-01). |
| Runtime observation | N/A. |
| Human acceptance | UNKNOWN. |
| Missing evidence | **The failure leaves no artifact.** It was corrected before the commit, so only the narrative attests to it. Git cannot corroborate it. |
| Alternative explanations | The import split is also simply the correct documented usage; arriving at it does not by itself prove a failed attempt happened. |
| Value for SPARK comparison | A test of whether the coding scheme can handle a documented failure whose only evidence is E0 — and whether that should count at all. |
| Keep? | **Keep, with the evidence gap stated in the same breath.** |

### SYN-C03 — A real bug found while writing tests, and deliberately not fixed

| Field | Content |
|---|---|
| Scope | `getVideoFingerprint`'s Google-Drive branch under a Node test environment. |
| First stated need | `Faz-4-Plans/Faz4.2-…` test-coverage task (S-04). |
| Proven AI authorship | UNKNOWN per-line; part of `d0e642e` (S-06). |
| Human decision | Scope boundary recorded in S-01: Faz4.2 was test-writing, not bug-fixing. |
| Before → after | Stub added to the **test file**; `fileFingerprint.ts` lines 52 and 88 still call `window.location.origin` (S-09). |
| Attempts / corrections | S-01 records the problem was reproduced in plain Node first, before any test was written; the source's own `try/catch` had been swallowing the error silently. |
| Automated test | Yes — the divergence between the two fingerprint functions was pinned with an explicit test rather than assumed (S-01, S-09). Passing today (V-01). |
| Runtime observation | **NOT_OBSERVED** in a browser. The claim that the source path "works correctly in the actual browser" is narrative only. |
| Human acceptance | UNKNOWN. |
| Missing evidence | Browser confirmation that the un-fixed source path behaves as claimed. |
| Alternative explanations | The stub could mask a genuine defect rather than an environment artefact; nothing in the repo settles this. |
| Value for SPARK comparison | Separates "defect found" from "defect fixed" — and shows a scope boundary being held rather than quietly crossed. |
| Keep? | **Keep.** |

### SYN-C04 — A wrong diagnosis, preserved, then corrected with a measured check

| Field | Content |
|---|---|
| Scope | Browser requests to the transcription API failing after deployment. |
| First stated need | A deployed-only failure reported by the user during the 2026-09-20 session. |
| Proven AI authorship | Commits `925f172` and `1d863f5` both carry `Co-Authored-By` trailers (S-06). |
| Human decision | The user declined one proposed change and chose the approach before it was applied (recorded in session, **not** in the repo). |
| Before → after | `925f172` added an upload fallback on the hypothesis that a CORS response header was unreadable. `1d863f5` then changed `vercel.json`'s `connect-src`, which was the actual cause. |
| Attempts / corrections | **The repository preserves the incorrect intermediate hypothesis as its own commit** rather than squashing it away. |
| Automated test | Unit tests cover the parsing/redaction helpers, not the policy. |
| Runtime observation | E3 — the production build was served under both the old and the new policy in a real browser; the old raised `connect-src blocked …` and the fetch threw, the new let the request reach the API. Method described in `1d863f5`'s message; the run itself is not stored as a repo artifact. |
| Human acceptance | UNKNOWN beyond the user electing to deploy. |
| Missing evidence | The session transcript is not in the repo. Commit messages are post-hoc narrative written with AI assistance, so they are E0 about their own process even where they describe an E3 check. |
| Alternative explanations | The fallback in `925f172` may have been independently useful; its commit message frames it as a fix for a cause that turned out to be wrong. |
| Value for SPARK comparison | Rare: a *recorded wrong turn*. Most histories hide these. Useful for "documented error" vs "missing instruction" criteria. |
| Keep? | **Keep.** |

### Considered and not proposed

- **Database permission findings (2026-09-20).** Real and consequential, but the
  underlying evidence arrived as SQL output pasted into a chat session. Only the
  resulting migrations and README text live in the repo; the captured state
  cannot be re-derived from this repository. Held back rather than presented as
  repo-sourced.
- **Feature work generally** (mobile overhaul, subtitle studio, player quality).
  Large and well-committed, but without a stated-need source separate from the
  commit message, the request→implementation arc cannot be reconstructed from the
  repo alone.

---

## 3. Verification performed in this review

| ID | Command | Date (UTC) | Commit | Environment | Result | Limit |
|---|---|---|---|---|---|---|
| V-01 | `npm test` | 2026-09-20 21:21 | `73d62dc`, tree clean | Windows 11 (win32, MINGW64_NT-10.0-22621), Node v24.12.0, npm 11.13.0 | 11 files, 146 tests, all passed (Vitest 4.1.10) | Proves the suite passes **today at this commit only**. Says nothing about any past state, and nothing about untested behaviour (notably SYN-C01). |
| V-02 | `gh run list` (attempted) | 2026-09-20 21:20 | `73d62dc` | as above | **NOT_RUN** — `gh` unavailable or unauthenticated | CI run history could not be checked. S-01's claim of a live green run on 2026-07-22 stays E0 from this session's standpoint. |
| V-03 | Application runtime behaviour | — | — | — | **NOT_OBSERVED** | No application was launched in this review. No E3 evidence was produced here. |

Commands were read-only except `npm test`, which writes nothing tracked. No
application code, dependency, lockfile or user data was modified.
