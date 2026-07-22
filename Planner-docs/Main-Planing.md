# Main Planing

## 1. Executive Summary

SynCinema is a browser-based, single-page React 19 + TypeScript + Vite application that lets a user play one video while routing multiple independent audio tracks to different physical output devices in millisecond-precision sync. Each audio track carries its own offset, 3-band EQ, dynamic-range compressor, and gain boost, all built on the native Web Audio API. The product also supports YouTube playback, URL/Google Drive/Dropbox media loading, SRT subtitles, a detached playback window (via `BroadcastChannel`), four-language i18n, and a Supabase-backed community sync-offset sharing system.

The project exists to solve a specific, real problem — multi-viewer households or accessibility scenarios where different people need different audio (language, commentary, description) routed to their own headphones while watching the same video, in sync. It is currently a single-developer effort (Ruslan Aliyev), proprietary-licensed, live at `syncinema.vercel.app`, at version 2.0.1 with 90 commits of history.

Current maturity is uneven by design axis. On the **product/feature axis**, SynCinema is advanced: the core sync mechanism, audio DSP graph, cloud sync, and UI polish (dark/light themes, onboarding tour, mobile-specific gesture controls) are all implemented and, per commit history, iterated on repeatedly. On the **engineering-validation axis**, the project is early: there is no automated test suite, no CI pipeline, and the production build script does not run TypeScript's type checker, meaning `strict: true` in `tsconfig.json` is currently aspirational rather than enforced. On the **security-boundary axis**, several concrete, already-identified gaps exist in the Google Drive proxy, the Supabase admin panel, and the microphone-permission request flow (see Autopsy.md for the full list).

The main planning conclusion: **SynCinema does not need new features to reach its stated goal of a production-grade, web-based product with future commercialization potential.** It needs a validation and hardening layer built underneath the feature set that already exists, plus reconciliation between what the documentation claims and what the code actually does — a gap made more consequential by the user's stated intent to commercialize later for legal reasons (a proprietary-license project whose own whitepaper still claims "open-source" is a real inconsistency to resolve before any commercial step).

The most important next milestone is establishing a real build-time safety net (Phase 1): making `npm run build` actually fail on type errors, adding a minimal CI workflow, and removing the two pieces of dead code/dependency found during this audit. Everything else — security hardening, documentation truth reconciliation, test coverage — is safer and cheaper to do once that safety net exists.

## 2. Project Vision

**Product/system vision:** A zero-infrastructure, browser-only tool that gives any group of viewers independent, synchronized audio control over a shared video — without proprietary hardware, a streaming backend, or a native app. The explicit architectural decision confirmed during Step 1 intake is that SynCinema stays **web-based**; a native mobile app is deliberately out of scope because the core value proposition (per-track output-device routing via `AudioContext.setSinkId`) is not deliverable with parity on mobile OS audio stacks.

**Intended users/operators:** Individuals and small groups (families, classrooms, accessibility use cases, informal cinema events) who want multi-language or multi-purpose audio from one video source, plus — longer term, per the user's stated intent — a broader user base if the product is commercialized.

**Engineering value:** Demonstrates that meaningful multi-device audio synchronization is achievable entirely with standard W3C Web APIs (Web Audio API, Audio Output Devices API, BroadcastChannel), without server-side media processing.

**What the project should make possible when finished:** A user can load a video from any of several sources, add any number of independently controlled audio tracks, trust that sync drift is corrected automatically, style and time subtitles precisely, save/restore a full project, and optionally benefit from community-contributed sync offsets — all without the product silently failing, misrepresenting its own capabilities in its documentation, or exposing avoidable security surfaces.

**What must never be compromised:**
- The sync precision that is the product's entire reason to exist (audio/video drift correction).
- User trust in what the product claims it can do (no doc/feature contradictions).
- The security of the two networked surfaces the product owns: the Vercel proxy function and the Supabase RPC layer — especially now that commercialization is a stated future goal, which raises the cost of any current security shortcut.

## 3. Current State Analysis

**Observed repository structure:** A conventional Vite + React SPA. `src/` contains ~40 TypeScript/TSX files organized into `components/`, `components/sidebar/`, `hooks/`, `i18n/`, `context/`, `utils/`, `constants/`, `lib/`, and `types/`. A second Vite entry point (`detached.html` / `src/detached.tsx`) builds a standalone popped-out player window. `api/proxy.ts` is a single Vercel serverless function. `supabase/README.md` documents (but does not version) four Postgres RPC functions living only in the Supabase dashboard. Total source is approximately 12,200 lines across ~50 files; the largest files are `VideoPlayer.tsx` (983 lines), `AudioTrackRow.tsx` (688 lines), and `App.tsx` (632 lines).

**Implemented or partially implemented areas:** Core sync engine (`useVideoPlayer.ts`, `AudioTrackRow.tsx` drift correction), Web Audio DSP graph (`AudioGraphManager.tsx`), multi-source loading (local file, YouTube, Google Drive via proxy, Dropbox, generic HTTPS via `UrlLoaderModal.tsx`), SRT subtitle parsing/rendering (`useVideoPlayer.ts`, `SubtitleOverlay.tsx`), project save/load (`.sync` JSON files), i18n (4 languages, fully typed), detached player window with token-gated `BroadcastChannel` messaging, local analytics (`useAnalytics.ts`), and Supabase-backed community sync presets (`useCloudSync.ts`) with an admin moderation panel (`AdminPanel.tsx`). All of these are evidenced by working, non-trivial implementation code, not stubs.

**Documentation state:** Extensive (README.md at 550 lines, a bilingual technical whitepaper) but demonstrably stale in places: it references a deleted `VuMeter.tsx` component, states the wrong dev server port, and the whitepaper claims "React 18" (actual: React 19) and "open-source" (actual license, per `LICENSE` and `src/main.tsx`/`index.html` headers: **Proprietary — All Rights Reserved**, changed from GPL v3 per commit `5327d6b`). This is evidence of drift after a deliberate licensing change, not a one-off typo.

**Test/smoke/CI state:** None. No test files, no test runner configured, no `.github/workflows/`, no lint configuration despite one `eslint-disable-line` comment in `App.tsx` implying a lint setup that does not exist in the repo.

**Configuration state:** `tsconfig.json` sets `strict: true` and `noEmit: true`, but `package.json`'s `"build": "vite build"` never invokes `tsc`, so type errors do not block a production build. `vite.config.ts` defines a dev-only Google Drive CORS proxy separate from the production `api/proxy.ts` Vercel function — two different proxy implementations for the same purpose, one dev-only and one production-only, which is a legitimate architecture but easy to lose track of.

**Operational readiness:** Single Vercel project, single Supabase project, no staging environment evidenced, no observability beyond `console.log`/`console.error` (66 call sites) and a client-side `ErrorBoundary` that only renders a fallback UI locally — no error reporting service.

**Security posture:** CSP, security headers, an origin/referer check, and rate limiting all exist in `api/proxy.ts` and `vercel.json` — this is more security hygiene than a typical hobby project has. However, concrete gaps exist: the referer check uses `startsWith` (bypassable), the admin panel's brute-force lockout is client-side only (server-side RPCs are directly callable with the public anon key, and `supabase/README.md` already documents this as an open issue), and `useAudioTracks.ts` requests microphone permission on mount rather than on a user gesture.

**Production readiness:** The product is live and, per its own commit history, has been iterated on through many rounds of UI/UX and mobile fixes — it is used, not merely built. It is not production-grade in the sense the user defined for TARGET_END_STATE (validated build, tested critical paths, server-side-enforced security, reconciled documentation).

**Missing critical components:** Automated tests, CI, versioned Supabase migrations/RPC definitions, a CHANGELOG, and a security review appropriate to a future-commercial product.

## 4. Target End State

Derived from the confirmed Step 1 intake answers.

**Functional target:** The current feature set (multi-track audio routing, EQ/compressor/gain, subtitles, multi-source loading, project save/load, community sync, detached window) continues to work reliably; no regressions are introduced while hardening.

**Technical target:** `npm run build` fails on real TypeScript errors (type-check wired into the build or a required pre-build/CI step); a lint configuration exists and is enforced; the two known dead-weight items (`wavesurfer.js` dependency, unused audio tab in `UrlLoaderModal.tsx`) are removed or intentionally justified; critical pure logic (fingerprinting, SRT parsing, offset/drift math, EQ preset matching) has automated test coverage.

**Operational target:** A CI pipeline (build + lint + typecheck, and eventually tests) runs before merge; the four Supabase RPC functions (`verify_admin_password`, `admin_delete_preset`, `safe_insert_preset`, `safe_increment_vote`) exist as versioned SQL migrations in the repository, not only in the Supabase dashboard.

**Security target:** Admin brute-force protection is enforced server-side (inside the RPCs), with the client-side lockout retained only as UX; the proxy's origin/referer check is exact-match, not prefix-match; microphone permission is requested only after an explicit user action; `.sync` project-file import is shape-validated before being spread into live state.

**Testing/review/release target:** Every merged change has passed CI; a lightweight CHANGELOG tracks user-visible changes per version; there is at least a manual "golden path" checklist run before each release until automated E2E coverage exists.

**Observability/governance target:** README, whitepaper, `metadata.json`, and in-app version strings agree with each other and with the actual license and stack versions; a documented (even if minimal) decision record exists for major architecture choices, so a future contributor or a future Claude Code session does not have to reverse-engineer intent from commit messages alone.

Commercialization-specific requirements (licensing terms, ToS, privacy policy, payment/legal structure) are explicitly **not yet defined** by the user and are treated as a deferred, gated phase (see Phase 7) rather than a current target.

## 5. Architecture Direction and Key Decisions

**Core domain:** The synchronization engine — `useVideoPlayer.ts` (video clock, subtitle timing) and `AudioTrackRow.tsx` (per-track drift correction against `videoCurrentTime - offset`) — is the product's reason to exist and should remain the most protected, most tested part of the codebase as hardening proceeds.

**Audio DSP subsystem:** `AudioGraphManager.tsx` owns one `AudioContext` per track and performs true graph rewiring for compressor bypass (not parameter tricks) — this is already a sound design decision, confirmed in-code and in README's "Design Decisions & Gotchas" section, and should be preserved as-is rather than "simplified."

**External integrations, each with a distinct trust boundary:**
- YouTube IFrame API (`YouTubePlayer.tsx`) — sandboxed, output-device routing not possible by platform limitation (already correctly documented in-UI).
- Google Drive proxy (`api/proxy.ts`, Vercel serverless) — the product's only server-side networked surface; currently has real but fixable security gaps.
- Supabase (`lib/supabase.ts`, `useCloudSync.ts`, `AdminPanel.tsx`) — the product's only persistent backend; RPC definitions currently live outside version control, which is a governance gap, not just a code gap.
- Dropbox / generic HTTPS URLs — client-side URL transformation only, no server involvement; CSP `media-src` allowlist should be reconciled against what the UI actually advertises as supported.

**Persistence and state ownership:**
- `localStorage` owns UI/user preferences (theme, accent, language, per-file audio-track prefs, local analytics) — appropriate, low-risk, no backend needed.
- Supabase owns only the community `sync_presets` table — a narrow, well-scoped use of a backend, not over-engineered.
- `.sync` files are the user-owned export/import format — currently under-validated on import.
- No global state library is used; all state lives in composed React hooks (`useVideoPlayer`, `useAudioTracks`, `useTheme`, `useAnalytics`, `useCloudSync`), wired together in `App.tsx` (632 lines) and threaded through `Sidebar.tsx` (30+ props). This has scaled adequately so far; whether it continues to scale is a question for a later phase (Phase 5), not a reason to introduce a state library speculatively — the user's own constraint answer ("no strict tool preference, use what fits") argues for evidence-based timing, not a preemptive rewrite.

**Security and policy boundaries:** Two networked surfaces (`api/proxy.ts`, Supabase RPCs) are the entire external attack surface; hardening effort should concentrate there before anything else, ahead of new features.

**Artifact/evidence boundaries:** None currently exist beyond git history itself — no CI artifacts, no test reports, no versioned RPC definitions. Phase 1 and Phase 2 introduce the first artifacts (CI logs, migration files).

**Human approval boundaries:** Single-developer project; no formal review gate exists today. Given the commercialization intent, introducing at least a self-review checklist (CI green + manual golden-path check) before each release is a reasonable minimum, without over-formalizing a solo workflow.

## 6. Phase-Based Master Roadmap

| Phase | Goal | Maturity | Token/Context Risk |
|---|---|---|---|
| 1. Stabilization & Validation Foundation | Make the build pipeline actually catch errors before anything else changes | M1 → M3 | Low |
| 2. Security Hardening of Existing Surfaces | Close already-identified, concrete gaps in the proxy and admin/RPC layer | M2 → M4 | Low–Medium |
| 3. Documentation & Public-Facing Truth Reconciliation | Make README/whitepaper/license/version claims match reality | M2 → M4 | Low |
| 4. Test Coverage Expansion for Core Sync Logic | Add automated tests for the riskiest logic, now that CI can run them | M3 → M5 | Medium |
| 5. State/Architecture Scalability Review | Evidence-based decision on whether current hook-composition state model still fits as complexity grows | M4 → M5 | Medium |
| 6. Production-Grade Operational Readiness | Add error reporting, minimal observability, and a documented backup/retention story | M5 → M7 | Medium |
| 7. Commercialization Readiness Gate (deferred) | License/ToS/privacy/data-handling review — only when the user signals intent | M6 → M7 | Unknown — deferred |

**Phase 1 — Stabilization & Validation Foundation**
Goal: A regression in type-correctness or basic lint hygiene can no longer reach production silently.
Description: Wire `tsc --noEmit` into the build (or a required pre-merge check), add an ESLint configuration (the codebase already assumes one exists per the stray `eslint-disable-line`), add a minimal GitHub Actions workflow running typecheck + lint + build, and remove/justify the two confirmed dead-weight items (`wavesurfer.js` dependency, unused audio tab in `UrlLoaderModal.tsx`).
Desired end state: `npm run build` fails on a real type error; CI runs on every push/PR.
Main acceptance signal: A deliberately introduced type error fails CI; `wavesurfer.js` is either removed from `package.json` or has a documented reason to stay.
First useful vibecoding slice: Run `tsc --noEmit` locally once, right now, to see the actual current error count — this single command is the fastest possible reality check and should happen before Step 2 sub-plans are written for this phase.

**Phase 2 — Security Hardening of Existing Surfaces**
Goal: Close the concrete security gaps already identified in this audit before any other risky change.
Description: Fix the `startsWith` referer-check bypass in `api/proxy.ts`; move admin brute-force lockout logic server-side into `verify_admin_password`/`admin_delete_preset`; gate the microphone-permission request behind an explicit user action instead of mount-time; add shape validation to `.sync` project import before spreading its contents into live state.
Desired end state: Each of the four gaps above has a fix or an explicitly accepted, documented risk.
Main acceptance signal: A crafted `Referer` header matching the bypass pattern is rejected; a scripted RPC brute-force attempt against `verify_admin_password` is rate-limited server-side, not only client-side.

**Phase 3 — Documentation & Public-Facing Truth Reconciliation**
Goal: Every public-facing claim about the product (README, whitepaper, license, in-app version) is true.
Description: Correct the stale `VuMeter.tsx` reference and dev-port claim in README; correct "React 18" and "open-source" in the whitepaper to match the current proprietary license and React 19; reconcile the CSP `media-src` allowlist in `vercel.json` against what `UrlLoaderModal.tsx` actually advertises as supported (Dropbox, generic HTTPS) — this needs a live check, not just a doc fix, since the mismatch may currently break a user-facing golden path.
Desired end state: No doc/code/license contradiction remains; CSP either supports the advertised sources or the UI stops advertising unsupported ones.
Main acceptance signal: A manual test of loading a Dropbox-hosted video in the deployed app succeeds or the UI copy is corrected to match actual behavior.

**Phase 4 — Test Coverage Expansion for Core Sync Logic**
Goal: The riskiest logic in the app (drift correction, fingerprinting, SRT parsing, EQ presets, cloud-sync offset grouping) has automated regression coverage.
Description: Introduce a test runner (Vitest fits the existing Vite toolchain with minimal config); start with pure-function unit tests (`fileFingerprint.ts`, `formatTime.ts`, SRT parsing in `useVideoPlayer.ts`, `eqPresets.ts` matching logic) before attempting any DOM/`AudioContext`-dependent component tests.
Desired end state: Pure logic has unit tests running in CI from Phase 1.
Main acceptance signal: `npm test` (or equivalent) runs in CI and fails on a deliberately broken fingerprint hash.

**Phase 5 — State/Architecture Scalability Review**
Goal: Decide, with evidence rather than speculation, whether the current hooks-only state composition still fits as the app grows.
Description: Audit prop-drilling depth (`Sidebar.tsx` already receives 30+ props); decide keep-as-is vs. scoped context per subsystem (audio/video/UI) based on concrete pain points observed, not a preemptive rewrite. This phase should only be expanded when a concrete new feature makes prop-drilling actively painful — not before.
Desired end state: A written decision (keep or introduce scoped context) with rationale, not a completed refactor unless evidence justifies it.

**Phase 6 — Production-Grade Operational Readiness**
Goal: Add the operational scaffolding a "production-grade" product needs before wider exposure.
Description: Choose (or explicitly defer, as a documented decision) a lightweight error-reporting service beyond `console.error`; add basic request logging/metrics on the Vercel proxy function (rate-limit hits, failure modes); document a backup/retention policy for the Supabase `sync_presets` table.
Desired end state: Errors in production are visible somewhere other than a user's own browser console.

**Phase 7 — Commercialization Readiness Gate (deferred)**
Goal: Not started now, per the user's explicit answer during intake ("şu anlık kendim o konu hakkında düşünmüyorum"). Kept as a placeholder so future work has a clear on-ramp.
Description: License/ToS/privacy-policy reconciliation; decide on the Supabase RLS/anon-key exposure model appropriate for a paid or wider-distribution product; review whether the community `sync_presets` fingerprinting scheme has any privacy implications at commercial scale.
Desired end state: Explicitly deferred — do not begin detailed sub-planning for this phase until the user signals intent.

## 7. Critical Risks and Gaps

- **No build-time type safety.** `strict: true` is configured but never enforced at build time. Impact: a type error can reach production silently. Mitigation: Phase 1.
- **No automated tests or CI at all.** Impact: every change is a manual-verification-only change; regression risk compounds as the codebase grows past 12k lines. Mitigation: Phases 1 and 4.
- **Admin RPCs are brute-forceable via direct calls.** The anon key allows calling `verify_admin_password` and `admin_delete_preset` directly, bypassing the client-side 3-attempt lockout. This is already documented as an open issue in `supabase/README.md` — it has been known and unresolved for some time. Mitigation: Phase 2.
- **Supabase RPC definitions are not version-controlled.** Four functions exist only in the Supabase dashboard; nobody can diff, review, or safely reconstruct them if lost. This is a governance/bus-factor risk, not just a security one. Mitigation: Phase 2/6.
- **CSP vs. advertised feature mismatch (high confidence from known URL conventions, not yet live-confirmed).** `vercel.json`'s `media-src` allowlist does not include Dropbox's known direct-download serving domain (`dl.dropboxusercontent.com`), while `UrlLoaderModal.tsx` tells users Dropbox links are supported. This is very likely a broken golden path shipped to real users today, not merely a theoretical gap. Mitigation: Phase 3, with one live load as the cheapest confirming step.
- **Documentation/license drift is a legal-optics risk given stated commercialization intent.** A whitepaper claiming "open-source" while the actual license is proprietary is a real inconsistency to have on record before any commercial step, not merely cosmetic. Mitigation: Phase 3.
- **Solo-maintainer bus factor.** No decision record beyond commit messages and scattered inline comments (the inline comments are notably good where they exist, e.g., in `useVideoPlayer.ts` and `api/proxy.ts` — this is a strength to preserve, not a weakness to fix). Mitigation: this Planner-docs set itself, plus the planning ledger going forward.
- **Fresh-session token/context risk.** The user is on a Claude Pro subscription accessed via a Cursor extension (not Max/API-tier usage), which argues for keeping Step 2/4 sessions scoped to one phase at a time rather than loading the whole `Planner-docs/` tree at once. Mitigation: phase-by-phase sub-plan files (Step 2 default behavior) and the Step 4 token-discipline rules already built into ClaudeQB.
- **Autonomy/review cadence for Step 4 was not explicitly confirmed by the user.** Treated as an assumption — default to checkpoint-based review (confirm before each phase's implementation slice) until the user states otherwise at the Step 4 handoff.

## 8. Prioritized Next Steps

1. **(Validation)** Run `npx tsc --noEmit` and `npm run build` locally right now to get the actual current type-error count — this has not been executed in this session and is the cheapest possible reality check before Step 2 planning for Phase 1.
2. **(Planning)** Step 2 should decompose Phase 1 and Phase 2 first — they are prerequisites for everything else and carry the highest risk-reduction per unit of effort.
3. **(Security hardening, planning-only for now)** Draft the exact fix for the `api/proxy.ts` referer-check and the admin-lockout redesign as a concrete Step 2 sub-plan item; do not implement yet.
4. **(Ontology/ledger)** This session should produce `Planner-docs/Project-Ontology.md` alongside the Autopsy to lock in domain vocabulary (offset, fingerprint, sync preset, drift threshold) before Step 2 begins; Step 2 should initialize `Planner-docs/Planing-Ledger.md`.
5. **(Future Step 4 slice, low-risk quick win)** Removing `wavesurfer.js` and the dead `UrlLoaderModal` audio-tab code is a good first implementation slice once Phase 1's CI exists to catch any regression.
6. **(Documentation, can run in parallel, low risk)** Reconcile README/whitepaper claims — does not depend on Phase 1/2 completing first.
7. **(Human decision needed)** Confirm with the user whether Phase 5 (state-architecture review) should be scheduled now or only once a concrete new feature makes prop-drilling a real problem — avoid speculative refactor.
8. **(Live verification, needed before Phase 3 is finalized)** Manually test loading a Dropbox URL and a generic HTTPS URL in the deployed app to confirm or refute the suspected CSP mismatch.

## 9. Step 2 Preparation Notes

**Which phases should be decomposed first:** Phase 1 (Stabilization & Validation Foundation) and Phase 2 (Security Hardening), in that order — Phase 1 first because CI/typecheck is what makes every subsequent phase safe to implement without manual-only verification.

**Which phases should not be expanded yet:** Phase 7 (Commercialization Readiness Gate) must not receive detailed sub-planning until the user explicitly signals commercialization intent is becoming concrete — expanding it now would be speculative planning against the user's own stated position. Phase 5 (state-architecture review) should only be expanded once a concrete pain point exists.

**What evidence Step 2 should collect:** The actual output of `tsc --noEmit` (error count and locations); a live test of Dropbox/generic-URL loading against the deployed CSP; confirmation of whether `.github/` or any CI already exists on the remote (this local clone shows none, but remote-only configuration cannot be ruled out from a local read-only pass).

**What decisions need human confirmation before detailed implementation:** Whether to introduce Vitest (Phase 4) now or defer until Phase 1/2 land; the exact error-reporting vendor/approach for Phase 6 (or an explicit decision to defer it); whether Phase 5's state-architecture question is worth investigating now.

**Ontology terms Step 2 must keep consistent:** See `Planner-docs/Project-Ontology.md` (created alongside this plan) — in particular: track *offset* (seconds, signed), *fingerprint* (per-file/URL identity string), *sync preset* (community-shared offset row), *drift threshold* (0.3s default resync trigger), *EQ chain* (low/mid/high biquad filters), *gain boost* (1.0–3.0× post-EQ multiplier).

**Prior implementation history to preserve:** None yet — this is the first ClaudeQB run on this repository. Step 2 should initialize `Planner-docs/Planing-Ledger.md` (Ledger v2 structure) rather than assuming one exists.

**Whether subagents are recommended for Step 2:** Not strictly necessary given the repository's moderate size (~50 files, ~12k lines) — a single Step 2 session can read the relevant files directly. A `security_reviewer`-style subagent pass specifically on `api/proxy.ts` and the Supabase RPC design (Phase 2) would add value if available, since that is the highest-consequence, most specialized area.

**Expected fresh-session token/context risk and validation checkpoints:** Medium overall, low per individual phase. Given the user's Claude Pro (non-Max/API) tier, Step 2 should produce phase-scoped sub-plan files (its default behavior) rather than one giant document, and Step 4 should implement one phase at a time with a checkpoint after each, per the assumption noted in Section 7 about unconfirmed autonomy/review cadence.

## 10. Repository Review Notes

**Important files inspected:** `package.json`, `tsconfig.json`, `vite.config.ts`, `vercel.json`, `metadata.json`, `.gitignore`, `README.md`, `docs/WHITEPAPER.md`, `supabase/README.md`, `api/proxy.ts`, `src/App.tsx`, `src/main.tsx`, `src/types.ts`, `src/hooks/*.ts` (all five hooks), `src/lib/supabase.ts`, `src/utils/fileFingerprint.ts`, `src/components/AudioGraphManager.tsx`, `AudioTrackRow.tsx`, `VideoPlayer.tsx` (partial), `YouTubePlayer.tsx`, `Sidebar.tsx`, `ErrorBoundary.tsx`, `SubtitleOverlay.tsx`, `UrlLoaderModal.tsx`, `Toast.tsx`, `AdminPanel.tsx`, `src/i18n/index.ts`, `index.html`, `detached.html`.

**Important commands run:** `git log --oneline` (full 90-commit history), `git status --short --branch`, `find` over the full source tree, targeted `grep`/`rg` for `wavesurfer`, `console.`, `TODO/FIXME`, `any` type usage, `dangerouslySetInnerHTML`/`innerHTML`, localStorage key usage, ESLint references, and license/React-version claims in the whitepaper.

**Important existing docs found:** `README.md` (550 lines), `docs/WHITEPAPER.md` + `docs/WHITEPAPER_TR.md` (368 lines each), `supabase/README.md` (documents but does not version the RPC layer and already flags the admin brute-force issue as unresolved), `assets/README.md` (placeholder for missing demo media).

**Whether Planing-Ledger.md, Project-Ontology.md, or Project-Comprehension.md existed:** None existed before this session. This is the first ClaudeQB planning run on this repository.

**Important assumptions made (flagged, to be confirmed):**
- Autonomy/review cadence for Step 4 was not explicitly stated by the user; defaulted to checkpoint-based review per phase.
- The CSP-vs-advertised-sources mismatch (Section 7) is inferred from static comparison of `vercel.json` and `UrlLoaderModal.tsx`; it has not been verified with a live browser test.
- Whether any CI/branch-protection exists on the GitHub remote could not be verified from this local clone; only the local absence of `.github/workflows/` was confirmed.
- Supabase RLS policies on `sync_presets` were not inspected (not present in this repository; would require dashboard/live access).

**Things not verified:** Live runtime behavior of the deployed app (this was a static, read-only repository review only, no dev server was started); actual current `tsc` error count (recommended as the first concrete action in Section 8); whether `dist/` (present locally, gitignored) reflects a build that already predates some current source changes.
