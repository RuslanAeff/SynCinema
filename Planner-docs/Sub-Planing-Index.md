# Sub-Planing Index

## 1. Purpose

This index maps `Planner-docs/Main-Planing.md`'s 7-phase roadmap to the detailed sub-plan files created in this Step 2 run, so that Step 3 (audit) and Step 4 (implementation) sessions know exactly which file to read for which piece of work, in what order, and with what supporting evidence.

## 2. Source Main Plan

Reference: `Planner-docs/Main-Planing.md`

- **Detected phase count:** 7 (Phase 1 through Phase 7, as listed in Main-Planing.md Section 6's roadmap table).
- **Detected phase names:** 1. Stabilization & Validation Foundation; 2. Security Hardening of Existing Surfaces; 3. Documentation & Public-Facing Truth Reconciliation; 4. Test Coverage Expansion for Core Sync Logic; 5. State/Architecture Scalability Review; 6. Production-Grade Operational Readiness; 7. Commercialization Readiness Gate (deferred).
- **Ambiguity or inconsistency found:** None. The phase roadmap is internally consistent, phase order is clear, and Phase 7's deferred status is explicit rather than ambiguous — Main-Planing.md itself instructs that Phase 7 should not be expanded until the user signals commercialization intent, which this Step 2 run has honored (see Faz7.1).

**Supporting Sources:**
- `Planner-docs/Autopsy.md` exists and was read fully. Most important Step 2 feedback categories: (1) prioritized findings AUTOPSY-P0-01/P0-02 (build type-check gap, no CI/tests/lint) driving Phase 1's sequencing; (2) AUTOPSY-P1-01 through P1-04 (admin brute-force, RPC versioning, proxy referer bypass, CSP/Dropbox mismatch) driving Phase 2 and Phase 3 items; (3) AUTOPSY-P2-01/P2-02/P2-03 (mic permission timing, `.sync` import validation, doc/license drift) driving the remaining Phase 2/3 items; (4) AUTOPSY-P3-01 (dead weight) driving Faz1.4; (5) the ordered pure-function test backlog (fingerprint → time → SRT → EQ → drift) driving Phase 4's exact sub-plan sequencing.
- `Planner-docs/Project-Ontology.md` exists and was read fully. Key ontology categories used throughout Step 2: domain vocabulary (offset, drift, fingerprint, sync preset, EQ chain, gain boost), module/boundary map (sync core, audio DSP, server proxy, cloud sync backend), invariants (AudioContext lifecycle, compressor bypass as graph-rewire not parameter-trick, 10Hz time-commit throttling, track-prefs-keyed-by-filename), and the open ontology questions (CSP/Dropbox compatibility, `.sync` import validation design choice) that several sub-plans directly resolve or explicitly defer.
- `Planner-docs/Project-Comprehension.md` does not exist. **Comprehension artifact used: no.**
- `Planner-docs/Planing-Ledger.md` did not exist before this Step 2 run; it has been initialized as part of this run (Ledger v2 structure) and was read back after creation to confirm consistency with this index.

## 3. Phase and Sub-Plan Map

| Phase | Title | Folder | Sub-Plans | Order | First Useful Slice | Token/Context Risk | Subagent Roles |
|---|---|---|---|---|---|---|---|
| 1 | Stabilization & Validation Foundation | `Faz-1-Plans/` | `Faz-1-Plans/Faz1.1-typecheck-in-build.md`, `Faz-1-Plans/Faz1.2-eslint-configuration.md`, `Faz-1-Plans/Faz1.3-minimal-ci-workflow.md`, `Faz-1-Plans/Faz1.4-dead-weight-removal.md` | 1.1 → 1.2 → 1.3 → 1.4 (1.2 can run parallel to 1.1; 1.3 needs both; 1.4 needs 1.3) | Run `tsc --noEmit` once, unmodified, to see the real baseline. | Low across all four | None needed |
| 2 | Security Hardening of Existing Surfaces | `Faz-2-Plans/` | `Faz-2-Plans/Faz2.1-proxy-referer-exact-match.md`, `Faz-2-Plans/Faz2.2-server-side-admin-lockout.md`, `Faz-2-Plans/Faz2.3-supabase-rpc-versioning.md`, `Faz-2-Plans/Faz2.4-microphone-permission-gesture-gate.md`, `Faz-2-Plans/Faz2.5-sync-import-shape-validation.md` | All five are independent of each other; 2.1/2.4/2.5 are fully local; 2.2/2.3 touch the live Supabase project and should be coordinated together | Reproduce the proxy referer bypass (Faz2.1) — fastest, most isolated fix. | Low (2.1, 2.4, 2.5); Medium (2.2, 2.3 — live backend, human approval gate) | `security_reviewer`-style pass recommended for Faz2.2/Faz2.3's SQL design |
| 3 | Documentation & Public-Facing Truth Reconciliation | `Faz-3-Plans/` | `Faz-3-Plans/Faz3.1-readme-correction.md`, `Faz-3-Plans/Faz3.2-whitepaper-correction.md`, `Faz-3-Plans/Faz3.3-csp-dropbox-reconciliation.md` | 3.1 and 3.2 independent/parallel; 3.3 last (needs a live Vercel-hosted test) | Cross-check README's file/path references against the real `src/` tree. | Low (3.1, 3.2); Low–Medium (3.3 — needs live deployment + real Dropbox test URL) | None needed |
| 4 | Test Coverage Expansion for Core Sync Logic | `Faz-4-Plans/` | `Faz-4-Plans/Faz4.1-test-runner-bootstrap.md`, `Faz-4-Plans/Faz4.2-fingerprint-time-tests.md`, `Faz-4-Plans/Faz4.3-srt-parsing-eq-preset-tests.md`, `Faz-4-Plans/Faz4.4-drift-compressor-regression-tests.md` | 4.1 first (hard prerequisite for 4.2–4.4); 4.2/4.3/4.4 can then proceed in any order, matching Autopsy's fingerprint→time→SRT→EQ→drift ordering | Install Vitest, write one smoke test against `formatTime`. | Low (4.1, 4.2); Low–Medium (4.3 — SRT extraction); Medium (4.4 — drift extraction + AudioContext mocking) | None strictly needed; internal checkpoint suggested for Faz4.4's mock design |
| 5 | State/Architecture Scalability Review | `Faz-5-Plans/` | `Faz-5-Plans/Faz5.1-state-architecture-evidence-review.md` | Single sub-plan | Exact `Sidebar.tsx` prop-count audit. | Low | None needed |
| 6 | Production-Grade Operational Readiness | `Faz-6-Plans/` | `Faz-6-Plans/Faz6.1-error-reporting-decision.md`, `Faz-6-Plans/Faz6.2-proxy-observability.md`, `Faz-6-Plans/Faz6.3-backup-retention-policy.md` | 6.1 first (decision may inform 6.2's forwarding target); 6.2 and 6.3 independent of each other | Present error-reporting vendor options to the user for an explicit decision. | Low across all three | None needed |
| 7 | Commercialization Readiness Gate (deferred) | `Faz-7-Plans/` | `Faz-7-Plans/Faz7.1-commercialization-gate-deferred.md` | Single placeholder sub-plan; must not be expanded without a new explicit user signal | N/A — no work authorized | Unknown — deferred, per Main-Planing.md's own roadmap table | None — no work planned |

## 4. Priority Detailing Order

Based on `Main-Planing.md` Section 8 (Prioritized Next Steps) and Section 9 (Step 2 Preparation Notes), and adapted to SynCinema's specific domain:

1. **Phase 1 first** — security hardening, tests, and documentation fixes all become safer to implement once a real build/CI safety net exists to catch regressions. Faz1.1 (typecheck) is the single highest-leverage item in the entire roadmap.
2. **Phase 2 second** — closes already-identified, already-partially-self-documented security gaps (admin brute-force, proxy referer bypass) before any further risky change; per the Main Plan, this is a prerequisite-tier phase alongside Phase 1, not merely "next in numeric order."
3. **Real local validation** — Faz1.1/Faz1.3's typecheck and CI gates are the concrete instantiation of this priority for SynCinema.
4. **Core state/control-plane protection** — the sync engine (`useVideoPlayer.ts`, `AudioTrackRow.tsx`) and audio DSP (`AudioGraphManager.tsx`) are SynCinema's core domain; Faz4.4's drift/compressor-bypass tests are this roadmap's direct instantiation of protecting that core, sequenced once Phase 1's validation net exists.
5. **Live gateway/API activation** — SynCinema's only two networked surfaces (the proxy, Supabase RPCs) are Phase 2's focus; no new live surface is being activated in this roadmap, only hardened.
6. **Worker/runtime execution** — not applicable to SynCinema's architecture (no background worker/runtime beyond the browser's own event loop); omitted from this project's priority list.
7. **Review/CI/artifact gates** — Faz1.3 (CI) and Faz2.3 (versioned RPC migrations) are this roadmap's artifact-gate instantiations.
8. **Observability and production readiness** — Phase 6, sequenced after Phases 1–4 since it is lower-urgency per the Main Plan's own framing.
9. **Documentation reconciliation (Phase 3)** can run in parallel with Phases 1/2/4, since it has no technical dependency on any of them, per `Main-Planing.md` Section 8, item 6.

## 5. Out-of-Scope or Deferred Topics

- **Phase 7 (Commercialization Readiness Gate)** — entirely deferred; Faz7.1 is a placeholder only. Must not be expanded until the user explicitly signals commercialization intent is becoming concrete.
- **Phase 5 expansion beyond evidence-gathering** — Faz5.1 produces a decision, not an implementation; any actual scoped-Context refactor is intentionally not pre-planned and depends on Faz5.1's own findings.
- **State-management library introduction** (Redux, Zustand, etc.) — not evidenced as needed anywhere in this roadmap; explicitly out of scope per `Main-Planing.md` Section 5's "not a reason to introduce a state library speculatively."
- **Supabase Auth migration** (replacing the shared admin password) — named in `supabase/README.md` as a longer-term direction beyond Faz2.2's server-side-lockout fix; not scoped into this Step 2 run.
- **Distributed rate limiting** (Redis/Upstash-backed) for `api/proxy.ts` — explicitly an open, traffic-dependent question per `Project-Ontology.md` Section 8, deferred until real traffic evidence justifies it (touched on in Faz6.2 as an accepted tradeoff, not solved).
- **VTT or other subtitle format support** — not evidenced as needed; SRT is the only format currently implemented or planned for testing (Faz4.3).
- **Automated E2E/browser-driven test coverage** — `Main-Planing.md` Section 4 names a manual "golden path" checklist as the interim target until automated E2E exists; full E2E automation is not scoped into Phase 4's current sub-plans.

## 6. Coverage Check

- [x] Every main phase from `Main-Planing.md` has a corresponding `Planner-docs/Faz-<number>-Plans/` folder (Faz-1-Plans through Faz-7-Plans, all 7 created).
- [x] Every main phase has at least one sub-plan (`Faz1.1`–`Faz1.4`; `Faz2.1`–`Faz2.5`; `Faz3.1`–`Faz3.3`; `Faz4.1`–`Faz4.4`; `Faz5.1`; `Faz6.1`–`Faz6.3`; `Faz7.1` — 21 sub-plan files total).
- [x] Sub-plan filenames follow the `Faz<phase>.<subphase>-<short-ascii-kebab-slug>.md` naming convention throughout.
- [x] Generated docs follow the language contract (English content, English required headings).
- [x] No source code files were modified — only files under `Planner-docs/` were created or updated during this Step 2 run.
- [x] No secrets were written — all 21 sub-plans, this index, and the ledger were reviewed during authoring; no credential, token, or private-key values appear anywhere (the only Supabase-related content is RPC/table *names*, function *logic descriptions*, and public configuration values such as CSP domains, all of which are non-secret per `supabase/README.md`'s own explicit statement that "the function bodies do not" belong in `.gitignore`).

## 7. Repository Review Notes

**Commands run this session:** `pwd`, `git status --short --branch`, `git branch --show-current`, `git log --oneline -n 10`, `find Planner-docs -maxdepth 4 -type f | sort`, `mkdir -p` for all seven `Faz-N-Plans` folders, direct `cat`/`Read` of `package.json`, `tsconfig.json`, `vite.config.ts`, `vercel.json`, `api/proxy.ts` (full), `src/hooks/useAudioTracks.ts` (full), `src/components/AdminPanel.tsx` (full), `supabase/README.md` (full), `src/components/UrlLoaderModal.tsx` (lines 1-280), `src/utils/fileFingerprint.ts` (full), `src/utils/formatTime.ts` (full), `src/constants/eqPresets.ts` (full), `src/components/AudioGraphManager.tsx` (targeted grep + read of compressor-bypass section), `src/components/AudioTrackRow.tsx` (targeted grep of drift-correction logic), `src/hooks/useVideoPlayer.ts` (targeted read of `parseSRT`/`loadSubtitles`), and `grep -n` searches across `README.md`/`docs/WHITEPAPER.md` for stale-claim line numbers.

**Important files inspected:** All files listed above, plus full reads of `Planner-docs/Main-Planing.md`, `Planner-docs/Autopsy.md`, and `Planner-docs/Project-Ontology.md` (all three read in full before any sub-plan was drafted), and the ClaudeQB reference files `references/Second-Planner.md`, `references/workflow-quality.md`, `references/planning-ledger.md`, `references/vibecoding-principles.md`.

**Assumptions made:**
- Faz1.3 (CI workflow) is assumed to be a prerequisite for Faz4.1 (test runner) per the roadmap's own dependency logic, even though `Main-Planing.md` frames Phase 4's Vitest-introduction timing as an open question needing human confirmation — Faz4.1 is written to fit either timing without requiring rewriting.
- The Faz2.2/Faz2.3 migration file numbering coordination is described as a Step 4 implementation detail to resolve at that time, not pre-decided here, since the exact live RPC content is not readable from this repository until Faz2.3's export step runs.
- Faz3.3's live Dropbox test may require the user's direct involvement to source a real test URL; this is recorded as a possible blocker, not silently assumed resolvable.

**Things not verified in this Step 2 session:** The actual `tsc --noEmit` baseline error count (deferred to Faz1.1's first work item, per `Main-Planing.md`'s own instruction that this should happen at implementation time, not planning time); live Supabase plan-tier backup settings (Faz6.3); live CSP/Dropbox behavior (Faz3.3); whether GitHub branch protection or remote-only CI configuration exists beyond this local clone's visibility.
