# Faz 3.3 — CSP vs. Advertised Media Sources Reconciliation

## 1. Context

`Main-Planing.md` Section 6, Phase 3 description: "reconcile the CSP `media-src` allowlist in `vercel.json` against what `UrlLoaderModal.tsx` actually advertises as supported (Dropbox, generic HTTPS) — this needs a live check, not just a doc fix, since the mismatch may currently break a user-facing golden path." `Autopsy.md` **AUTOPSY-P1-04** independently derives and elevates this from a documentation item to "a Phase 2/3 functional-fix item": `vercel.json`'s CSP `media-src` directive allows only `'self' blob: data: https://drive.google.com https://drive.usercontent.google.com https://*.googlevideo.com`, while `UrlLoaderModal.tsx:85-97` converts Dropbox share links to a `?dl=1` direct-download form that Dropbox is publicly known to serve from `dl.dropboxusercontent.com` — a domain absent from the allowlist. Both the Main Plan and the Autopsy explicitly flag this as **inferred from static/publicly-documented convention, not yet live-confirmed** (`Main-Planing.md` Section 7, Section 10; `Autopsy.md` Section 7, Section 11). This sub-phase is sequenced last in Phase 3 because it is the only one requiring a live browser test before its fix can even be decided (loosen CSP vs. narrow UI claims — the two fixes are mutually exclusive and the correct one depends entirely on the live result).

## 2. Goal

Determine, via a real live test, whether loading a Dropbox-hosted video (and a generic HTTPS-hosted video) actually works in the deployed app today, then apply exactly one of two mutually exclusive fixes: widen the CSP `media-src` allowlist to include the domains actually needed, or narrow `UrlLoaderModal.tsx`'s advertised support so the UI stops promising a source that does not work.

## 3. Description

**Problem solved:** A user-facing feature (loading a video from a Dropbox link) is advertised as supported by the UI's own validation/messaging (`'Dropbox link detected ✓'` at `UrlLoaderModal.tsx:94`) but may be silently blocked by the CSP `media-src` policy at the browser level — a failure mode that would not show up as an error in `UrlLoaderModal.tsx` itself (URL validation there is purely client-side string logic; the actual failure, if it exists, happens later when the `<video>` element tries to load the resulting URL and the browser's CSP blocks it).

**Why it belongs at this point:** It is explicitly gated on a live test per both the Main Plan and the Autopsy — unlike Faz3.1/Faz3.2, which are fully verifiable from static repository/file comparison, this sub-phase's very acceptance criteria cannot be written with certainty until the live result is known, so it is sequenced after the two purely-static doc fixes.

**Risk reduction:** `Autopsy.md` Section 11 calls this "very likely a broken golden path shipped to real users today, not merely a theoretical gap" — closing it protects `Main-Planing.md` Section 2's stated non-negotiable: "User trust in what the product claims it can do (no doc/feature contradictions)."

**Vibecoding slice strategy:**
- First useful slice: the live test itself — attempt to load one real Dropbox-hosted video URL and one generic HTTPS-hosted video URL in the actual deployed app (or a local dev/preview build with the same CSP headers applied), and observe whether playback succeeds or the browser console shows a CSP violation.
- Fastest validation signal: browser console CSP violation message (if any) naming the exact blocked domain — this is definitive, not inferential.
- What not to over-plan yet: do not pre-decide which of the two fixes (widen CSP vs. narrow UI claims) to implement before the live test result is known — the two are genuinely alternative outcomes, not sequential steps, and choosing prematurely would contradict the explicit "needs a live check" instruction from both source documents.

## 4. Scope

- Performing the live test: load a real Dropbox share link and a real generic-HTTPS video URL through `UrlLoaderModal.tsx` in an environment where `vercel.json`'s CSP headers are actually applied (production or a Vercel preview deployment — a local `vite dev` server does not apply `vercel.json`'s headers, so this specifically requires a Vercel-hosted context).
- Based on the live result: **either** widening `vercel.json`'s `media-src` directive to include `https://dl.dropboxusercontent.com` (and any other domain the live test reveals is actually used) **or** narrowing `UrlLoaderModal.tsx`'s Dropbox-handling logic/messaging so it no longer claims support for a source that does not actually work, with a clear in-UI explanation.
- Extending the same live-verification logic to the "generic HTTPS URL" case (`UrlLoaderModal.tsx:168-174`'s catch-all `https:`/`http:` acceptance), since `Autopsy.md` Section 7 notes "Generic HTTPS URLs the UI also advertises face the same class of risk unless they happen to be served from an already-allowlisted domain" — this is a broader risk than Dropbox alone and should be tested with at least one non-Dropbox, non-allowlisted HTTPS media URL.

## 5. Out of Scope

- Any change to the Google Drive proxy path (`api/proxy.ts`, `drive.google.com`/`drive.usercontent.google.com`/`googlevideo.com` domains) — already allowlisted and already working per existing evidence; not in question here.
- Any change to YouTube handling — YouTube uses the IFrame API, not the `media-src` directive, and is unaffected by this question.
- Any broader CSP redesign beyond the specific `media-src` directive and the specific domains needed to match actually-advertised, actually-working sources.
- Faz3.1 and Faz3.2's independent documentation fixes.

## 6. Current Repository Evidence

- `vercel.json` (read directly this session) — CSP `media-src` directive: `'self' blob: data: https://drive.google.com https://drive.usercontent.google.com https://*.googlevideo.com`. No Dropbox domain present.
- `UrlLoaderModal.tsx:84-97` (read directly this session) — Dropbox detection and `?dl=1` URL conversion logic, with a "Dropbox link detected ✓" success message shown to the user before any actual load is attempted.
- `UrlLoaderModal.tsx:168-174` (read directly this session) — the generic-HTTPS catch-all: any `https:`/`http:` URL not matching a more specific pattern is accepted with "URL format valid (will attempt to load)."
- `Autopsy.md` Section 7, AUTOPSY-P1-04 — "Dropbox's own direct-download links are publicly known to resolve to `dl.dropboxusercontent.com` ... a domain absent from the allowlist ... Confidence is based on known Dropbox URL conventions, not a live probe (no external network request was made during this read-only review)."
- `Main-Planing.md` Section 10 — "Things not verified: ... whether `dist/` (present locally, gitignored) reflects a build that already predates some current source changes" and explicitly lists the CSP mismatch as inferred, not live-confirmed, in Section 7.
- `Project-Ontology.md` Section 8 — "Is the CSP `media-src` allowlist actually compatible with Dropbox/generic-HTTPS sources the UI advertises? — status: open. Requires a live browser test."

## 7. Planned Work Breakdown

- **F3.3-01 — Obtain a real Dropbox-hosted test video URL**
  - Description: Locate or create a real, shareable Dropbox video link suitable for a live test (this may require the user's own Dropbox account or a publicly-known test file; if none is readily available, this step should be flagged as needing the user's help rather than fabricated).
  - Output: A real, working Dropbox share URL to test with.
- **F3.3-02 — Run the live test against a Vercel-hosted context**
  - Description: Open the deployed app (or a Vercel preview deployment carrying the same `vercel.json` headers) and attempt to load the Dropbox URL and a generic HTTPS media URL through `UrlLoaderModal.tsx`; observe browser DevTools console for any CSP violation message.
  - Output: A definitive pass/fail result for each URL type, with the exact CSP violation message captured if playback fails.
- **F3.3-03 — Apply the determined fix**
  - Description: If CSP blocks the load, widen `media-src` in `vercel.json` to include the exact domain(s) the live test showed were needed (not a speculative broader allowlist). If CSP does not block the load (i.e., the static inference was wrong, perhaps due to a wildcard or redirect behavior not fully traced), no CSP change is needed, and this step becomes a no-op — explicitly recorded as such, not silently skipped.
  - Output: Updated `vercel.json` (if needed) or explicit confirmation no change was needed.
- **F3.3-04 — Reconcile UI claims if the fix is UI-side instead**
  - Description: If, for any reason, widening the CSP is not the chosen fix (e.g., the domain is not stable/predictable enough to allowlist safely), narrow `UrlLoaderModal.tsx`'s Dropbox support messaging to accurately reflect what actually works, with a clear explanation to the user.
  - Output: Updated `UrlLoaderModal.tsx` messaging, only if this path is chosen instead of F3.3-03.
- **F3.3-05 — Re-verify after the fix**
  - Description: Repeat the live test from F3.3-02 after the fix is applied and redeployed, confirming the previously-failing (or previously-passing) case now behaves as intended.
  - Output: Confirmed post-fix live evidence.

## 8. Acceptance Criteria

- A real live test result (pass/fail, with captured CSP violation message if applicable) exists for both the Dropbox URL case and the generic-HTTPS URL case — this sub-phase does not close without this live evidence, per both source documents' explicit instruction.
- Exactly one of the two fix paths (widen CSP or narrow UI claims) is applied, based on the live result, not decided in advance.
- After the fix, a repeated live test confirms the golden path now works as the UI claims (either because CSP was correctly widened, or because the UI no longer claims support it can't deliver).
- If the live test cannot be performed within this planning/implementation session (e.g., no test Dropbox file is available), this is explicitly recorded as a blocker requiring the user's involvement, not silently assumed away.
- `vercel.json` (if modified) contains only the specific domain(s) the live test showed were actually necessary — not a speculative broad addition.

## 9. Validation and Test Approach

- **Live validation (primary and mandatory):** the browser-based load test against a Vercel-hosted deployment carrying real CSP headers (VAL-LIVE-CSP-MEDIA) — this cannot be satisfied by any local-only check, since `vite dev` does not apply `vercel.json`'s headers.
- **Regression check:** confirm the already-working Google Drive and YouTube loading paths remain unaffected by any CSP change (VAL-MANUAL-MEDIA-REGRESSION).
- **Documentation validation:** if the UI-narrowing path is chosen instead, confirm the updated messaging in `UrlLoaderModal.tsx` accurately describes actual behavior (VAL-DOCS-UI-CLAIMS).
- This sub-phase is explicitly a live-readiness item, not a local-readiness one — its acceptance criteria are gated on real browser/deployment behavior, consistent with the Second-Planner's instruction to "separate local readiness from live readiness."

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| vercel.json | modified | Widen media-src CSP directive to include the exact domain(s) confirmed necessary by the live test (only if the live test shows a real block). | VAL-LIVE-CSP-MEDIA |
| src/components/UrlLoaderModal.tsx | modified | Narrow Dropbox/generic-HTTPS support messaging to match actual working behavior (only if this fix path is chosen instead of widening CSP). | VAL-LIVE-CSP-MEDIA, VAL-DOCS-UI-CLAIMS |
```

## 10. Dependencies and Sequencing

- No dependency on Faz3.1 or Faz3.2; can be worked independently, though it is sequenced last within Phase 3 due to its live-test requirement making it the least mechanically-predictable of the three.
- **Requires a Vercel-hosted deployment context** (production or preview) to test against — this is the first Phase 3 sub-phase requiring any live/deployed environment, unlike Faz3.1/Faz3.2 which are fully local/static.
- Requires a real, working Dropbox-hosted test video URL, which may require the user's direct involvement to provide (their own Dropbox account, or pointing to a known-public test file) — this sub-phase should not fabricate or guess at a placeholder URL.
- If the fix path is "widen CSP," requires human confirmation before deploying the change to production, since it changes the app's live security policy (a Phase-2-adjacent action, even though it is filed under Phase 3 per the Main Plan's own roadmap placement).
- Fresh Claude Code session token/context risk: **Low–Medium**. Mostly a live-test-and-observe task; the main cost is coordinating a real Vercel deployment/test cycle, not code volume. No subagent needed, though a live test can be time-consuming within a single fresh session and should be budgeted accordingly.

## 11. Risks and Mitigations

- **Risk:** No real Dropbox test file is readily available, stalling this sub-phase indefinitely.
  - Impact: Phase 3 cannot fully close without this live evidence.
  - Mitigation: F3.3-01 explicitly flags this as needing the user's help if no test file is available; Step 3's audit should treat an unresolved live-test blocker here as an explicit, documented gap rather than a silent gap.
- **Risk:** The live test result is ambiguous (e.g., Dropbox's CDN happens to work today via a redirect chain that resolves to an already-allowlisted domain, but that behavior is not guaranteed to be stable).
  - Impact: A "works today" result that could silently break later if Dropbox changes its CDN routing.
  - Mitigation: If the live test passes without any CSP change, document *why* it passes (e.g., trace the actual final resource URL/domain observed) rather than just recording "works, no action needed" — this gives future sessions the evidence needed to understand if the pass is fragile.
- **Risk:** Widening the CSP `media-src` allowlist introduces a new, broader trust boundary than intended (e.g., an overly broad wildcard).
  - Impact: Expands the app's attack surface beyond what is actually needed.
  - Mitigation: F3.3-03 explicitly requires the exact domain(s) confirmed necessary by the live test, not a speculative broad addition (e.g., not a blanket `https://*.dropboxusercontent.com` if a more specific host suffices, unless the live test shows multiple subdomains are genuinely needed).

## 12. Desired End State

The Dropbox and generic-HTTPS media-loading golden paths are confirmed, via real live testing, to either work correctly (with CSP already sufficient or newly widened to exactly what's needed) or to have their UI claims corrected to match actual behavior — with no remaining static-inference-only uncertainty. The Step 4 ledger entry should record the live test's exact result, the chosen fix path and why, and the post-fix re-verification result.

## 13. Next Sub-Phase Transition Criteria

- The live test has been performed and its result recorded (pass, fail-then-fixed, or explicit user-input blocker).
- Exactly one fix path has been applied and re-verified live.
- The already-working Google Drive and YouTube paths are confirmed unaffected.
- With this sub-phase complete, Phase 3 (Documentation & Public-Facing Truth Reconciliation) is fully closed; Phase 4 (Test Coverage Expansion) may proceed once Phase 1's CI (Faz1.3) exists to run its new test step, per `Main-Planing.md` Section 6's Phase 4 description ("Pure logic has unit tests running in CI from Phase 1").
