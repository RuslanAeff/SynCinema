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

---

## 2026-09-21 — Session 2: two open questions answered

Both manual checks left open by Session 1 were carried out by the author and
reported back. No repository file other than this research folder was touched.

**Microphone gate (question 1) — answered, E3 obtained.**
The four-step protocol was run on a permission-cleared profile: no prompt on
load, warning and "İzin Ver" button present, prompt only after pressing it,
devices populate after granting. Chrome 153.0.8010.53 (64-bit), on Windows 11 and
macOS 26.6.2, performed 2026-09-20.

`SYN-C01` moves from `E3: NOT_OBSERVED` to E3 obtained. Two limits stay attached
and must travel with the claim: the observer is the thesis author, who is also the
developer under study, and no screenshot or recording was kept. The observation
also came roughly two months after the change it validates — the gap between a
sub-plan being marked `verified` and anyone actually looking is itself a finding.

**CI history (question 2) — answered, and it corroborates the ledger.**
Eight runs, all green, none failed. Earliest is run #1 at commit `5c0768f`,
2026-07-22 03:28 GMT+2, 35s.

`Planing-Ledger.md` had claimed exactly that: "confirmed live 2026-07-22 … commit
`5c0768f`, green check, 35s". Commit, date, duration and outcome all match. This
is the first claim in this review where the AI-assisted ledger is confirmed by a
record held outside the repository and outside the process that wrote it.

Two consistent-but-not-conclusive observations were recorded as inference: a run
detail page shows 56 passing tests where the ledger claims 56/56 at the phase5-6
commit; and 108 commits produced only 8 runs, with no run for the four commits the
ledger says were never pushed at the time.

**Unchanged by this session**

- The circularity problem is reduced, not removed. One claim was corroborated
  externally; the rest of the ledger remains self-reported.
- `SYN-C02`'s failed first attempt still has no artefact.
- `SYN-C03`'s browser-path claim is still unobserved.
- Hub remains NOT_ACCESSIBLE.

**Supabase hardening captured, applied and verified (same session)**

Carried out in the intended order, so the evidence survived the fix.

*Before* (S-15): 73 rows. All seven privileges on all five tables, for both `anon`
and `authenticated`, plus two anonymous-insert policies. The author exported this
to CSV. Until this capture, the finding existed only as chat narrative; it is now
recorded.

*Applied*: migrations `0003` and `0004`, via the SQL editor, the same manual route
used for `0001`/`0002`. Recorded in `supabase/README.md`.

*After* (S-16): 3 rows. `SELECT` on `sync_presets` for both roles, plus the
`Allow anonymous read` policy. Nothing else.

*Functional check* (V-06): all three `SECURITY DEFINER` write paths still work with
`anon` holding nothing. One preset at `offset_ms` 700 matching the 0.7s set in the
UI; `vote_log` at exactly 1 row after two vote attempts, with `votes` = 2, the
second refused by the dedup; and a `login_attempts` row written at the moment of
the admin attempt. The three numbers cross-check.

The admin attempt itself returned false. That was **not** accepted as a verdict:
the function returns false both for a wrong password and for an unreadable hash.
It was separated by checking that the hash row was intact (60 chars, `$2a$`) and
that the attempt had been logged — so the function ran. The password had simply
been lost, most likely because the stored bcrypt hash was mistaken for the
password itself.

The password was then rotated, and the admin path was exercised end to end: login
succeeded and the panel listed the preset created earlier, showing the same
`+700ms` and `2` votes the SQL query had returned. That record is now confirmed by
three independent routes — direct query, `vote_log` count, and the admin UI — all
agreeing. Agreement across routes is what makes this stronger than any single
observation, and it closes the last verification gap in this repository.

**Next concrete step**

Nothing is outstanding here. The remaining work is hub-side and predates this
session: classification criteria for the four terms the supervisor asked about,
the independent-rater arrangement, and scope. None are decided in this repository.

Two questions also belong to the hub rather than here: whether transcript-only
evidence is admissible at all — it affects `SYN-C02`, `SYN-C04` and `SYN-C05` —
and whether an AutoSRT pass is commissioned.
