# Project Autopsy

## 1. Executive Summary

SynCinema is an existing, actively developed project — not a skeleton or a documentation-only shell. Ninety commits of history, a 12,200-line TypeScript/React source tree, and a live Vercel deployment all confirm real, working functionality: multi-track audio routing with per-track Web Audio DSP chains, synchronized playback drift correction, SRT subtitles, multi-source media loading, a detached playback window, four-language i18n, and a Supabase-backed community sync-offset system. This is a mature single-developer product, not an early prototype.

The strongest repository evidence for maturity is the audio synchronization core itself: `AudioTrackRow.tsx`'s drift-correction loop and `AudioGraphManager.tsx`'s true graph-rewiring compressor bypass are both non-trivial, deliberately engineered, and match what the README's "Design Decisions & Gotchas" section describes — code and documentation agree on the hardest technical part of the product. This is a strong positive signal: the riskiest logic is not neglected.

The most important technical gaps are, in order of consequence: (1) the production build never runs TypeScript's type checker, so `strict: true` is unenforced; (2) there is no automated test suite, no CI, and no lint configuration, despite the codebase referencing a lint rule (`eslint-disable-line`) that implies tooling which does not actually exist in the repo; (3) two concrete, already-partially-self-documented security gaps exist in the admin/RPC layer and the proxy's origin check; (4) the Supabase RPC layer — four functions that are the entire server-side logic for community sync and admin moderation — exists only in a dashboard, outside version control, with no migration files in the repository despite `supabase/README.md` explicitly asking for them; (5) public-facing documentation (README, whitepaper) contains claims that contradict the actual code and license.

None of these gaps are hidden or unknown to the project — several are self-documented in `supabase/README.md`'s "Open issue" section, and the good inline comments throughout the hooks (`useVideoPlayer.ts`, `api/proxy.ts`) show a developer who understands the tradeoffs being made. This changes the planning implication significantly: Step 2 is not discovering unknown problems, it is **sequencing known, already-partially-diagnosed problems** into an executable plan. The most important planning implication for Step 2 is therefore to prioritize the validation-foundation phase (Phase 1) first, since every other fix (security, tests, documentation) becomes safer to implement once a build/CI safety net exists to catch regressions.

## 2. Reviewed Sources

**Main plan:** `Planner-docs/Main-Planing.md` (created this session, same run).

**Commands run:** `pwd`; `git status --short --branch`; `git log --oneline -n 90` (full history); `find . -maxdepth 3` over the repo excluding `.git`/`node_modules`/`dist`; targeted `grep -rn` for `TODO|FIXME|HACK|XXX`, `: any|as any|<any>`, `console\.`, `eslint`, `wavesurfer`, `dangerouslySetInnerHTML|innerHTML`, `localStorage.getItem|setItem` key names; `wc -l` across all source files to rank by size; `ls`/`find` over `api/`, `assets/`, `docs/`, `supabase/`.

**Manifests/configs inspected:** `package.json`, `package-lock.json` (confirmed `wavesurfer.js` present as a dependency and in the lockfile), `tsconfig.json`, `vite.config.ts`, `vercel.json`, `metadata.json`, `.gitignore`, `postcss.config.js`, `tailwind.config.js` (not deeply reviewed, low risk).

**Docs inspected:** `README.md` (full), `docs/WHITEPAPER.md` (full), `supabase/README.md` (full), `assets/README.md` (full, confirms missing demo media referenced by README).

**Tests/CI evidence:** None found. No `.github/` directory, no test files, no test runner in `package.json` dependencies.

**Service/package folders:** `api/` (one Vercel function, `proxy.ts`, fully read), `supabase/` (documentation only, no SQL files present — confirmed `.gitignore` excludes all `*.sql`).

**Relevant Planner-docs files:** None existed prior to this session. `Planner-docs/Main-Planing.md` was read as the primary source of truth for this autopsy.

## 3. Project Areas and Ownership Boundaries

| Area | Path(s) | Responsibility | Maturity Signal | Boundary Notes |
|---|---|---|---|---|
| Sync/playback core | `src/hooks/useVideoPlayer.ts`, `src/components/AudioTrackRow.tsx` | Video clock, SRT parsing, per-track drift correction | High — working, commented, matches docs | Clear owner; no ambiguity |
| Audio DSP | `src/components/AudioGraphManager.tsx` | Web Audio graph per track (EQ, compressor, gain, device routing) | High — deliberate design, graph-rewiring bypass | Clear owner; render-null component pattern is intentional and appropriate |
| Video rendering | `src/components/VideoPlayer.tsx`, `YouTubePlayer.tsx` | Native `<video>` vs. YouTube IFrame playback | High for local video; YouTube path correctly self-documents its limitations (no device routing) | Two parallel player implementations share `SubtitleOverlay.tsx`; reasonable split |
| Media ingestion | `src/components/UrlLoaderModal.tsx`, `src/hooks/useAudioTracks.ts` | Local file, URL, Google Drive, Dropbox, YouTube ingestion | Medium — video path fully wired; **audio-via-URL tab exists in code but is unreachable in the rendered UI** (see Section 5) | Ownership clear; one dead sub-feature |
| Server proxy | `api/proxy.ts` | Google Drive virus-scan-bypass streaming proxy | Medium-high — has real security controls (CSP, rate limit, origin check) but with a fixable bypass | Sole owner of the app's only outbound server-side network surface |
| Cloud sync backend | `src/lib/supabase.ts`, `src/hooks/useCloudSync.ts`, `src/components/AdminPanel.tsx`, four Supabase RPCs (dashboard-only) | Community sync-offset storage, voting, admin moderation | Client side is mature; **server side (RPC logic) is unversioned and unreviewable from this repo** | Governance gap: the actual authorization logic lives outside this repository entirely |
| i18n | `src/i18n/*`, `src/context/I18nContext.tsx` | Four-language translation, detection, persistence | High — fully typed `Translations` interface, consistent structure across `en/tr/az/ru` | Clear, well-bounded, no issues found |
| State orchestration | `src/App.tsx` (632 lines), `src/components/Sidebar.tsx` (30+ props) | Wires five hooks together, distributes state to ~10 child components | Adequate today; growing prop-drilling surface | Not currently a blocker; flagged for Phase 5 evidence-gathering, not immediate action |
| Persistence | `localStorage` (theme, accent, language, track prefs, analytics), `.sync` files, Supabase `sync_presets` table | Three different persistence mechanisms for three different data classes | Each is individually reasonable; `.sync` import path lacks validation | See Section 6 |

## 4. Feature Inventory

**Implemented or strongly evidenced:** Multi-track audio with independent offset/EQ/compressor/gain/device routing; drift correction with configurable threshold; local file, YouTube, Google Drive (proxy), Dropbox, generic-HTTPS media loading; SRT subtitle parsing and styled overlay rendering (shared between native and YouTube players); `.sync` project export/import; detached player window via token-gated `BroadcastChannel`; dark/light theme + accent color; four-language i18n with browser-language detection; local usage analytics; onboarding tour (desktop-only by design); help panel; admin moderation panel for community presets; bookmarklet-based "send current tab's video" flow with protocol validation; seasonal snowfall easter egg.

**Partial/skeleton:** None found at the component level — this is notable for a project of this size; there is no evidence of half-built features left mid-implementation. The one clear partial item is process-level, not feature-level: the audio-loading tab inside `UrlLoaderModal.tsx` is fully implemented but never rendered (see Section 5).

**Planned but not evidenced:** Nothing found in code comments or docs suggesting an explicitly planned-but-unstarted feature. `docs/WHITEPAPER.md` describes the product as it exists, not as a future promise.

**Missing or unclear:** Automated tests for any feature; a CI-verified build; versioned server-side (Supabase RPC) logic; a changelog tracking what actually shipped in which version (version strings exist — `v2.0.1` in `Sidebar.tsx`, `package.json` — but no changelog explains what changed between versions beyond commit messages).

## 5. Placeholder, Stub, and Skeleton Analysis

- **`src/components/UrlLoaderModal.tsx:220-268`** — `activeTab`, `audioUrl`, `audioValidation`, and `handleLoadAudio` are fully implemented (state, validation, submit handler) but the component only ever renders the video-URL form; there is no tab switcher UI and no conditional render for the audio form. This is delivery-blocking for the "load audio from URL" feature specifically — the feature is unreachable, not merely half-built. Step 2 should either finish wiring the tab UI or remove the dead code; either is a small, low-risk slice.
- **`package.json:16`** — `wavesurfer.js` is a direct dependency, confirmed present in `package-lock.json`, but zero import references exist anywhere in `src/` or `api/`. Harmless at runtime (unused code is tree-shaken from the bundle in most cases, but it still inflates `node_modules`/install time and signals unclear dependency hygiene). Step 2 should plan its removal as part of Phase 1.
- **`supabase/` directory** — contains only a `README.md` describing four RPC functions that exist "only in the Supabase dashboard." This is a documentation-as-placeholder pattern: the doc describes what *should* exist in version control but does not. This is delivery-blocking for any future audit, rollback, or handoff of the backend logic. Planned remediation belongs in Phase 2/6.
- No `TODO`/`FIXME`/`HACK`/`NotImplemented`-style markers were found in source code (one grep hit was a URL pattern comment, not a real marker) — this is a genuinely clean signal, not a false negative; the codebase does not defer work with inline markers.

## 6. Technical Debt and Maintenance Risks

- **Build/type-check gap.** `tsconfig.json` sets `strict: true` and `noEmit: true`, but `package.json`'s `"build": "vite build"` never invokes `tsc`. This is the single highest-leverage debt item: it silently disables the type system's entire value.
- **No lint configuration despite an assumed one.** `src/App.tsx:222` contains `// eslint-disable-line react-hooks/exhaustive-deps`, which only has meaning if ESLint with the `react-hooks` plugin is configured and run — neither exists in this repository. This is a small but telling signal of tooling drift (the comment likely predates removal of a lint setup, or was copied from another project).
- **Oversized orchestrator files.** `VideoPlayer.tsx` (983 lines), `AudioTrackRow.tsx` (688 lines), and `App.tsx` (632 lines) are large by convention but not unreasonable for their scope; they are not flagged as an immediate risk, only as a Phase 5 evidence point if prop-drilling becomes painful.
- **Documentation drift after a licensing change.** Git history shows `5327d6b — Changed license from GPL v3 to Proprietary`. `docs/WHITEPAPER.md` was evidently not updated after this change — it still describes the project as "open-source" under "MIT License" framework references. This is a specific, dateable instance of stale-docs-after-a-decision, not general doc rot.
- **Stale feature reference in README.** README's project-structure section (`README.md:169`) lists `VuMeter.tsx`, which was deleted per the commit history summary provided at session start ("T3 ölü VuMeter.tsx silindi"). The dev-server port in README (`README.md`, "5173") does not match `vite.config.ts:9`'s configured port `3000`.
- **Duplicate proxy implementations.** `vite.config.ts` configures a dev-only Google Drive CORS proxy at `/api/gdrive`, separate from the production `api/proxy.ts` Vercel function used at `/api/proxy`. This is architecturally defensible (dev convenience vs. production hardening) but is undocumented as an intentional split anywhere in the repo, which risks a future maintainer "fixing" one and assuming it covers both.
- **Unvalidated `.sync` import.** `useAudioTracks.ts:211-223` spreads `prefs[t.name]` directly onto live track state (`{...t, ...prefs[t.name]}`) with no schema check. A malformed or adversarially crafted `.sync` file could overwrite fields the UI does not expect (e.g., `id`, `objectUrl`) since `Partial<AudioTrack>` is not enforced at runtime, only at compile time — and compile-time checking is itself not enforced in the build (see above).

## 7. Broken or Missing Integrations

- **Google Drive proxy — origin/referer bypass.** `api/proxy.ts:81` checks `referer.startsWith(allowed)`, which a crafted referer like `https://syncinema.vercel.app.attacker.example` would satisfy. This is a real, concrete bypass of an otherwise well-built control (CSP + rate limiting + file-ID regex validation are all present and correctly implemented alongside it).
- **Supabase RPC layer — unversioned, unreviewable.** `verify_admin_password`, `admin_delete_preset`, `safe_insert_preset`, `safe_increment_vote` are the entire server-side authorization/rate-limiting logic for the admin panel and community sync, and none of their definitions exist in this repository. This is not a "missing integration" in the sense of broken wiring — the client-side calls work — but it is a missing **artifact**: nobody can review, diff, roll back, or reconstruct this logic from the codebase alone.
- **Admin brute-force protection — client-only, already self-documented as broken.** `supabase/README.md:17-29` explicitly states the RPCs are reachable directly with the anon key, bypassing the client's 30-second lockout (`AdminPanel.tsx:7-8, 61-65`). This is the clearest, most concrete "broken integration" in the repository, and the project's own documentation already names the correct fix (move the lockout into the RPCs, eventually replace shared-password auth with Supabase Auth).
- **CSP vs. advertised media sources — likely mismatch, based on known URL conventions rather than a live probe.** `vercel.json`'s `media-src` directive allows only `'self' blob: data: https://drive.google.com https://drive.usercontent.google.com https://*.googlevideo.com`. `UrlLoaderModal.tsx:85-97,169` presents Dropbox links as supported and converts them to a direct-download form (`?dl=1`). Dropbox's own direct-download links are publicly known to resolve to `dl.dropboxusercontent.com` (or historically `dl.dropbox.com`) — neither domain, nor any Dropbox domain, appears in the CSP allowlist above. This is a static, publicly-documented-convention finding, not a live-probed one (no external network request was made during this read-only review), so it should still be confirmed with one live load attempt before Step 2 finalizes the Phase 3 fix — but confidence that this currently blocks Dropbox playback in production is high, not merely speculative. Generic HTTPS URLs the UI also advertises face the same class of risk unless they happen to be served from an already-allowlisted domain.
- **No CI integration of any kind.** Not a "broken" integration but a fully absent one — there is nothing to detect any of the above automatically today.

## 8. Test, CI, and Validation Gaps

**Observed tests:** None. No test files matching any common convention (`*.test.ts`, `*.spec.ts`, `__tests__/`) exist anywhere in the repository.

**Observed CI:** None. No `.github/workflows/`, no other CI config file (`.gitlab-ci.yml`, `circle.yml`, etc.) found.

**Missing unit coverage:** Pure, easily-testable logic with zero current coverage: `fileFingerprint.ts` (DJB2 hash + fingerprint format logic), `formatTime.ts`, SRT parsing inside `useVideoPlayer.ts`, EQ preset matching in `constants/eqPresets.ts` (six fixed integer presets, exact-equality matching via `getCurrentPresetId` — confirmed by direct read this session, no floating-point edge cases, an ideal first test target), offset/drift math in `AudioTrackRow.tsx`.

**Missing integration coverage:** The full Web Audio graph wiring/rewiring in `AudioGraphManager.tsx` (compressor bypass logic specifically, since it is described in README as a deliberately corrected past bug — regressing it silently is a real risk without a test).

**Missing e2e/smoke coverage:** No smoke test exists for the "golden path" (load video, add audio track, verify sync, load subtitles) in any form, automated or documented as a manual checklist.

**Local vs. live validation gap:** Everything in this project today is validated by the developer manually, in a live browser, by hand. There is no local-only validation tier (a fast unit-test loop) separate from live/manual verification — meaning every change currently costs a full manual re-test cycle.

**Suggested validation gates for Step 2 sub-plans:** Phase 1 sub-plans should specify `tsc --noEmit` and a CI workflow as their acceptance criteria's validation commands. Phase 4 sub-plans should specify `npm test` (once a runner is chosen) as validation, starting with the pure-function list above before attempting any `AudioContext`-dependent test (which will require mocking Web Audio API, a nontrivial but well-precedented pattern).

## 9. Security, Secret, and Governance Findings

**Secret handling posture:** No secret-like file-name matches were found via file-name-only scanning of the working tree; `.env`, `.env.local`, `.env.production`, and `*.sql` are all correctly excluded via `.gitignore`. `VITE_SUPABASE_URL`/`VITE_SUPABASE_ANON_KEY` are documented in README as expected `.env.local` entries and are treated as optional-and-safe-to-omit in `src/lib/supabase.ts` (the client becomes `null` if absent) — this is a genuinely good defensive pattern, worth preserving.

**Policy/approval boundaries:** None exist beyond what a single developer enforces personally; no branch protection or required-review evidence found locally (cannot verify remote GitHub settings from a local clone).

**Least privilege:** The Supabase anon key is, by design, exposed to the browser (standard for Supabase's model) and is the same key used for both community-sync reads/writes and — indirectly, through the same client — the admin RPCs. The admin RPCs rely entirely on a shared-password check inside the RPC itself, not on a separate privilege tier; this is the root cause of the brute-force gap described in Section 7, and `supabase/README.md` itself recommends the correct longer-term fix (migrate to Supabase Auth with a real admin account).

**Audit/artifact integrity:** No CI artifacts, no test reports, no versioned migration files exist to audit against. This autopsy itself is effectively the first structured governance record for this project.

**Risky command execution or external mutation surfaces:** `api/proxy.ts` is the only place the application makes outbound server-side network requests based on user-controlled input (a Google Drive file ID); it validates the ID against a length-bounded regex before use, which is a correct and sufficient control for that specific injection surface. No shell-execution or path-traversal surface was found anywhere in the reviewed code.

**Compliance/governance unknowns:** No privacy policy, terms of service, or data-handling documentation exists for the community `sync_presets` table (which stores a browser fingerprint hash for vote deduplication — `useCloudSync.ts:99-101`). This is currently low-risk for a niche personal-use tool but becomes a real gap the moment commercialization (Phase 7, deferred) is pursued.

## 10. Operational Readiness and Observability

**Deployment/runtime evidence:** Live on Vercel (`syncinema.vercel.app`, confirmed via README badges and `vercel.json`); build output (`dist/`) exists locally but is gitignored, so it reflects a local build artifact, not deployment evidence per se.

**Observability:** 66 `console.log`/`console.error`/`console.warn` call sites across the codebase are the entire logging story; there is no structured logging, no error-reporting service (Sentry or equivalent), and no metrics/tracing anywhere. `src/components/ErrorBoundary.tsx` catches render errors and shows a translated fallback UI plus a reload button — a reasonable minimum for a client-only app, but it only logs to `console.error`, meaning a production error is invisible to the developer unless a user reports it manually.

**Backup/restore or rollback signals:** None for the Supabase `sync_presets` table (community data) or for the RPC definitions themselves (see Section 7 — the RPCs cannot even be reconstructed from this repository, let alone rolled back).

**Cost/latency/quality signals:** Not applicable at current scale; the Vercel proxy function includes an in-memory rate limiter (`api/proxy.ts:28-55`) that is a reasonable lightweight control for a low-traffic personal tool, with a documented limitation (per-instance memory, resets on cold start) that is acceptable for the current scale but should be revisited if traffic grows meaningfully (Phase 6/7 territory).

**Live readiness blockers:** None that would prevent the app from functioning today for its current user base; the blockers identified in this report are about safety margin and governance for the *next* stage of the project (hardening, testing, eventual commercialization), not about the app being currently broken for its existing users.

## 11. Alignment Analysis with the Main Plan

**Main plan assumptions that are supported by repository evidence:** The Main Plan's characterization of SynCinema as "product-mature, validation-immature" is strongly supported — every feature claim in Section 3/4 of `Main-Planing.md` has corresponding working code, and every gap claim (no tests, no CI, no type-check-in-build) is independently confirmed here. The architecture direction in Main-Planing.md Section 5 (protect the sync core, treat the proxy and Supabase RPCs as the only real security boundary) matches what this autopsy independently found to be the two genuinely risk-bearing integration points.

**Assumptions that are weak or contradicted:** None of the Main Plan's core claims are contradicted by this autopsy. One item is *strengthened* beyond what Main-Planing.md stated: the admin brute-force gap is not merely a theoretical risk the plan inferred — it is explicitly self-documented as an open, unresolved issue by the project's own `supabase/README.md`, meaning it has been known for some time without being fixed. Step 2 should treat this with higher urgency than a newly-discovered issue would warrant.

**Roadmap phases that need stronger evidence before implementation:** Phase 3's CSP-vs-Dropbox mismatch claim is inferred from static comparison only and needs a live browser test before Step 2 writes a fix — it is possible the mismatch does not actually block loading (e.g., if Dropbox's CDN domain happens to satisfy a wildcard not fully traced during this review). Phase 5's prop-drilling concern is real but not yet painful — Step 2 should not over-plan it.

**Risks Step 2 must not ignore:** The Supabase RPC governance gap (Section 7) is easy to under-prioritize because the client-side symptoms are invisible day-to-day — nothing in the running app looks broken. Step 2 must still sequence it into Phase 2, because its cost (total inability to review or restore server-side logic) is disproportionate to how invisible it currently is.

## 12. Autopsy Feedback for Step 2

**Phase 1 (Stabilization & Validation Foundation):**
- Incorporate the exact `tsconfig.json`/`package.json` mismatch found in Section 6 as the first work item — this is a one-line-of-evidence, high-leverage fix.
- Incorporate the `wavesurfer.js` removal and `UrlLoaderModal.tsx` dead-tab remediation (Section 5) as small, independent, low-risk slices suitable for a first vibecoding pass once CI exists to catch any regression.
- The stray `eslint-disable-line` (Section 6) should inform the exact ESLint config choice — at minimum, `react-hooks/exhaustive-deps` must be a configured rule so that comment remains meaningful.

**Phase 2 (Security Hardening):**
- The `startsWith` referer bypass (Section 7) should become a concrete sub-plan item with an exact-match fix and a test case using the crafted-referer example from this report.
- The admin brute-force gap (Section 7, Section 9) should be sequenced with explicit awareness that it is a *known, previously documented, unresolved* issue — Step 2 should reference `supabase/README.md`'s own recommended fix (server-side lockout, eventual Supabase Auth migration) rather than re-deriving a solution from scratch.
- Supabase RPC export-to-migration work (Section 7, Section 9) belongs here or in Phase 6; Step 2 should decide based on how disruptive introducing a `supabase/migrations/` directory and adjusting `.gitignore`'s blanket `*.sql` exclusion would be — this autopsy recommends narrowing the `.gitignore` rule rather than removing it outright, to keep excluding any genuinely local/scratch SQL while allowing versioned migrations.

**Phase 3 (Documentation Reconciliation):**
- Every specific drift item in Section 6 (VuMeter reference, dev port, React version, open-source claim) should become an explicit, individually-verifiable acceptance criterion rather than a vague "update docs" task.
- The CSP-vs-Dropbox question (Section 7, Section 11) should be resolved with a live test *before* Step 2 finalizes this sub-plan's acceptance criteria, since the fix differs depending on the answer (loosen CSP vs. narrow UI claims).

**Phase 4 (Test Coverage):**
- Use the exact pure-function list in Section 8 as the initial test-target backlog, in the given order (fingerprint → time formatting → SRT parsing → EQ presets → drift math), since this is roughly increasing order of complexity/coupling to browser APIs.

**Phase 6 (Operational Readiness):**
- The rate limiter's documented in-memory limitation (Section 10) should be explicitly accepted-as-a-tradeoff or revisited here, not silently forgotten.

**General:** No subagent was used to produce this autopsy; the repository's moderate size made a single-session read-only review sufficient. A `security_reviewer`-style subagent would specifically add value for Phase 2's Supabase RPC redesign, since that work happens partly outside this repository (in the Supabase dashboard/SQL) and benefits from a second, focused pass.

## 13. Priority Fix and Planning Signals

- **AUTOPSY-P0-01 — Production build does not enforce TypeScript's type checker**
  - Impact: `strict: true` is configured but silently unenforced; type errors can reach production undetected.
  - Evidence: `package.json:11` (`"build": "vite build"`) vs. `tsconfig.json` (`strict: true`, `noEmit: true`).
  - Step 2 impact: Must be the first work item in Phase 1; blocks safe execution of every later phase's changes without manual-only verification.

- **AUTOPSY-P0-02 — No automated tests, CI, or lint configuration exist**
  - Impact: Every change today is verified by hand only; regression risk compounds as the codebase grows.
  - Evidence: No `.github/workflows/`, no test files, no ESLint config despite `src/App.tsx:222`'s `eslint-disable-line` implying one should exist.
  - Step 2 impact: Phase 1 sub-plans must specify a minimal CI workflow (typecheck + lint + build) as a concrete deliverable, not an aspiration.

- **AUTOPSY-P1-01 — Admin RPC brute-force protection is client-side only, already self-documented as broken**
  - Impact: The anon key allows unlimited direct calls to `verify_admin_password`/`admin_delete_preset`, bypassing the UI's 30-second lockout entirely.
  - Evidence: `AdminPanel.tsx:7-8,61-65`; explicitly confirmed as an open, unresolved issue in `supabase/README.md:17-29`.
  - Step 2 impact: Phase 2's highest-priority item; should reference the project's own already-written remediation guidance rather than re-deriving a fix.

- **AUTOPSY-P1-02 — Supabase RPC definitions are not version-controlled**
  - Impact: The entire server-side authorization/rate-limiting logic for admin and community-sync features cannot be reviewed, diffed, or restored from this repository.
  - Evidence: `supabase/README.md` (full file); `.gitignore`'s blanket `*.sql` exclusion; no `supabase/migrations/` directory exists.
  - Step 2 impact: Phase 2/6 must plan exporting and versioning these four RPCs, and should propose narrowing (not removing) the `.gitignore` SQL exclusion.

- **AUTOPSY-P1-03 — Google Drive proxy referer check is bypassable via prefix match**
  - Impact: `startsWith` allows a crafted referer domain to pass an origin check meant to restrict requests to the production/dev origins.
  - Evidence: `api/proxy.ts:81`.
  - Step 2 impact: Phase 2 sub-plan should specify an exact-match (or proper URL-parsing) fix with a negative test case.

- **AUTOPSY-P1-04 — CSP `media-src` allowlist very likely blocks a source the UI advertises as supported (Dropbox)**
  - Impact: A user-facing "golden path" the UI explicitly promotes (loading a Dropbox video) is very likely silently failing in production today — this is a functional break of an advertised feature, not only a documentation issue.
  - Evidence: `vercel.json` CSP `media-src` directive allows only `'self' blob: data: https://drive.google.com https://drive.usercontent.google.com https://*.googlevideo.com`; `UrlLoaderModal.tsx:85-97,169` converts Dropbox share links to `?dl=1` direct-download form, which Dropbox is publicly known to serve from `dl.dropboxusercontent.com` — a domain absent from the allowlist. Confidence is based on known Dropbox URL conventions, not a live probe (no external network request was made during this read-only review).
  - Step 2 impact: Elevated from a documentation item to a Phase 2/3 functional-fix item; one live confirmation load is the cheapest possible next validation step, then either widen the CSP allowlist or correct the UI's claimed support.

- **AUTOPSY-P2-01 — Microphone permission requested on mount, not on user gesture**
  - Impact: First-impression UX risk; a permission prompt appears before any user action, which is unconventional and can erode trust.
  - Evidence: `useAudioTracks.ts:21-46` (`refreshDevices` called from a mount-time `useEffect`).
  - Step 2 impact: Phase 2 sub-plan should gate this behind an explicit user action (e.g., opening the device-selection UI).

- **AUTOPSY-P2-02 — `.sync` project import is not schema-validated before being applied to live state**
  - Impact: A malformed or crafted project file could overwrite fields the UI does not expect.
  - Evidence: `useAudioTracks.ts:211-223`.
  - Step 2 impact: Phase 2 sub-plan should add a minimal shape check before spreading imported data.

- **AUTOPSY-P2-03 — Documentation contains claims that contradict the actual code and license**
  - Impact: Erodes user/contributor trust; a specific legal-optics risk given the stated future commercialization intent (open-source claim vs. proprietary license).
  - Evidence: `docs/WHITEPAPER.md` ("React 18", "open-source", MIT-framed references) vs. `package.json` (React 19) and `LICENSE`/`src/main.tsx` (Proprietary); `README.md:169` references deleted `VuMeter.tsx`; README's stated dev port (5173) vs. `vite.config.ts:9` (3000).
  - Step 2 impact: Phase 3 should treat each contradiction as an individually verifiable acceptance criterion.

- **AUTOPSY-P3-01 — Unused dependency and unreachable dead code**
  - Impact: Minor maintenance and install-time cost; signals unclear dependency hygiene.
  - Evidence: `wavesurfer.js` in `package.json`/`package-lock.json` with zero import references in `src/`; `UrlLoaderModal.tsx:220-268`'s unreachable audio-tab code.
  - Step 2 impact: Good first Phase 1 vibecoding slice — small, independent, easy to validate once CI exists.
