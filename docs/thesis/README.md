# SynCinema — Thesis Research (local entry point)

Entry point for master's-thesis research **about** this repository. SynCinema is
a secondary comparison project; the primary project and all shared methodology
live in the central SPARK thesis hub, not here.

This folder holds project-local evidence work only. It deliberately does **not**
contain a thesis text, a copy of the shared research log, or any global method
definition.

## Where things are

| What | Where |
|---|---|
| Thesis-side research activity on this repo | [`research/PROJECT_LOG.md`](research/PROJECT_LOG.md) |
| Sources examined, with provenance and limits | [`research/EVIDENCE_INDEX.md`](research/EVIDENCE_INDEX.md) |
| Reports prepared for the hub | [`research/handoffs/`](research/handoffs/) |
| **Development** record (pre-existing, authoritative) | [`../../Planner-docs/Planing-Ledger.md`](../../Planner-docs/Planing-Ledger.md) |
| Pre-work defect inventory | [`../../Planner-docs/Autopsy.md`](../../Planner-docs/Autopsy.md) |
| Per-phase sub-plans | [`../../Planner-docs/Faz-1-Plans/`](../../Planner-docs/) … `Faz-7-Plans/` |
| Server-side definitions and captured DB state | [`../../supabase/README.md`](../../supabase/README.md) |

`Planner-docs/` predates this folder and is the real development ledger. It is
linked, never copied. Do not start a second "original history" ledger.

## Central hub

The hub is the `docs/thesis/` directory of the SPARK repository: `THESIS.docx`,
`RESEARCH_LOG.md`, `README.md`, and `research/`. Shared decisions — the coding
scheme, the number of events, independent-rater arrangements, scope — belong
there and are not settled in this repository.

**Hub status as of 2026-09-20: NOT_ACCESSIBLE from this machine.** No hub file
has been read from here. Anything in this folder that touches methodology is
provisional and written to be checked against the hub, not to replace it.

## Ground rules for work in this folder

- Records here are written in English; conversation with the author is in Turkish.
- Application code is not modified by research tasks. A defect found during
  review is reported as a sourced finding, not fixed in passing.
- "Not found in this review" and "never existed" are different statements, and
  are written differently.
- A status word in an older note is not evidence. The detail behind it is.
- Tests not run are marked `NOT_RUN`; behaviour not observed is marked
  `NOT_OBSERVED`.
- No secrets, no absolute personal paths, no raw personal data. Paths are
  relative.

## Continuing

Read [`research/PROJECT_LOG.md`](research/PROJECT_LOG.md) bottom-up for the
current position and the open questions, then the newest file in
[`research/handoffs/`](research/handoffs/) for what has been packaged for the
hub and whether it has been imported yet.
