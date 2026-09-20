# SynCinema — Thesis Research Log

Research activity on this repository for the master's thesis. Development work
itself is logged elsewhere — see `Planner-docs/Planing-Ledger.md`. This file
records only thesis-side investigation: what was examined, on what date, with
what result, and what remains open.

Entries are append-only. Newest last.

---

## 2026-09-20 — Session 1: initial evidence review

**Scope reviewed:** repository `SynCinema`, branch `main`, commit `73d62dc`,
working tree clean, 108 commits spanning 2025-12-25 → 2026-09-20. Full history
(not a shallow clone).

**Hub access:** NOT_ACCESSIBLE. No central SPARK `docs/thesis/` directory was
reachable from this machine; a sibling SPARK backup folder exists but contains no
such directory and was not explored further. No hub file was read. No
cross-project or methodological decision is made in this session; the task prompt
was treated as temporary context only.

**Work done**

1. Confirmed repository identity and recorded the review baseline.
2. Confirmed no `AGENTS.md` / `CLAUDE.md` exists at this repo's root.
3. Surveyed the planning corpus under `Planner-docs/` at index level. The
   existing ledger was left untouched and is linked, not copied.
4. Traced both starting hints to primary sources and checked them against code
   and git history rather than accepting the prior notes at face value.
5. Mapped AI attribution across the history.
6. Ran the existing test suite once as a dated verification point.
7. Created this local structure: `docs/thesis/README.md`, this log,
   `research/EVIDENCE_INDEX.md`, and a handoff report.

**What the evidence showed**

- *Microphone permission hint:* confirmed. `AUTOPSY-P2-01` → sub-plan `Faz2.4` →
  a one-line removal in `useAudioTracks.ts` (commit `75d06fc`). **But** the
  ledger row labelled `verified` records in its own detail cell that a code trace
  was substituted for the browser test, and that the finding was closed "pending
  live browser confirmation by the user". Status label and evidence level diverge
  here. This is the single most useful observation of the session.
- *Test/CI hint:* confirmed as a documented first-attempt failure during the
  Vitest bootstrap. The corrected import split is visible in `vite.config.ts`
  today, but **the failure itself left no artifact** — it was fixed before the
  commit, so only the narrative attests to it.
- *A second, unhinted finding:* while writing fingerprint tests, a real bug was
  found, reproduced in plain Node first, and then deliberately worked around in
  the test rather than the source, because the sub-phase's scope was test-writing
  and not bug-fixing. The source still carries the browser-only path.
- *Attribution:* all 108 commits share one author identity. 16 carry a
  `Co-Authored-By` trailer (2026-05-30, 2026-07-22, 2026-09-20). Git authorship
  therefore cannot separate AI-assisted from hand-written work; the planning
  documents are the primary attribution source, and they are self-reported.

**Uncertainties carried forward**

- Whether the live browser confirmation for the microphone gate was ever done.
  Nothing in the repository answers this.
- Whether any CI run has actually passed. The workflow file exists; run history
  was not obtainable this session (`gh` unavailable). Configuration is not
  execution.
- Whether the un-fixed `window.location.origin` path behaves as the notes claim
  in a real browser.
- How much of the `Planner-docs/` corpus beyond the ledger and the two traced
  sub-plans is relevant. It was surveyed at index level only and must not be
  described as fully examined.
- Whether the 2026-09-20 session's own work should count as evidence, given its
  transcript is not a repository artifact.

**Not done**

- No application code, dependency, lockfile or configuration was modified.
- No application was launched; no runtime observation was produced (E3 absent
  from this session entirely).
- `docs/WHITEPAPER.md` / `_TR.md` were not read.
- The AutoSRT project, which exists as a sibling folder on this machine, was not
  reviewed. Its presence is noted only so a future session can decide whether to
  commission a separate pass. Candidate IDs `AUT-Cxx` remain unused.

**Next concrete step**

Two manual answers are needed from the author before candidate SYN-C01 can be
levelled honestly, and neither can be obtained from the repository:

1. Was the cleared-permissions browser check ever performed — load the app with
   site permissions cleared, confirm no microphone prompt appears before the
   "Grant Permission" button is pressed, and that devices populate after? If so,
   roughly when, and on what browser/OS?
2. Open the repository's Actions tab on the hosting platform. Has any CI run
   completed successfully, and what is the date and commit of the earliest green
   run?

Until answered, SYN-C01 stays at E1 with E3 recorded as NOT_OBSERVED, and the
CI claim stays E0.
