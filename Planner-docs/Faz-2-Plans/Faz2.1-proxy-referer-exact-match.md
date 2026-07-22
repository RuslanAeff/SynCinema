# Faz 2.1 — Google Drive Proxy Referer Exact-Match Fix

## 1. Context

`Main-Planing.md` Section 6, Phase 2 description names this as the first of four concrete security gaps to close: "Fix the `startsWith` referer-check bypass in `api/proxy.ts`." `Autopsy.md` **AUTOPSY-P1-03** confirms the exact bypass: `api/proxy.ts:81` checks `referer.startsWith(allowed)`, which a crafted referer like `https://syncinema.vercel.app.attacker.example` would satisfy. This sub-phase is the first of Phase 2 because it is the most self-contained of the four security items — a single-function fix with no external dashboard/RPC dependency — and Phase 2 as a whole is sequenced immediately after Phase 1 per `Main-Planing.md` Section 9 ("Phase 1 (Stabilization) and Phase 2 (Security Hardening), in that order").

## 2. Goal

Close the origin/referer bypass in `api/proxy.ts` so that only requests whose `Origin` or `Referer` header exactly matches one of the allowed origins are accepted by the Google Drive proxy — not merely prefixed by one.

## 3. Description

**Problem solved:** `isAllowedOrigin()` in `api/proxy.ts:70-87` correctly checks `Origin` via exact array membership (`ALLOWED_ORIGINS.includes(origin)`), but its `Referer` fallback path uses `referer.startsWith(allowed)`, which is not equivalent — a referer URL merely needs to *begin with* an allowed string, and browsers do not prevent a page hosted at an attacker-controlled domain sharing a prefix from setting that referer naturally by simply being served from a URL like `https://syncinema.vercel.app.attacker.example/...`.

**Why it belongs at this point:** It is the cheapest, most isolated of the four Phase 2 fixes (pure function logic, no external system), making it a good first slice within the phase, consistent with the vibecoding principle of tackling the fastest-validating item first.

**Risk reduction:** This proxy is, per `Main-Planing.md` Section 5 and `Project-Ontology.md` Section 4, one of only two networked surfaces the product owns; closing a real bypass here directly serves the stated priority ("hardening effort should concentrate there before anything else, ahead of new features").

**Preparation for later phases:** None beyond keeping the proxy's existing, otherwise-solid controls (CSP, rate limiting, file-ID regex) intact while fixing this one specific check.

**Vibecoding slice strategy:**
- First useful slice: replace `startsWith` with proper URL-origin parsing (parse the referer as a URL and compare its `origin` exactly against `ALLOWED_ORIGINS`), which is both more correct and more idiomatic than substring matching.
- Fastest validation signal: a scripted/manual request with a crafted bypass referer, before and after the fix, showing 403 → 403 stays for genuinely bad referers, but the previously-accepted bypass referer now also returns 403.
- What not to over-plan yet: do not redesign the whole origin-validation strategy (e.g., switching to signed request tokens) — the existing `Origin`-header-first, `Referer`-fallback design is sound per `Autopsy.md` ("an otherwise well-built control"); only the comparison operator is wrong.

## 4. Scope

- Modifying `isAllowedOrigin()` in `api/proxy.ts` to parse the `Referer` header as a URL and compare `new URL(referer).origin` against `ALLOWED_ORIGINS` via exact `includes()`, matching the existing `Origin`-header logic instead of using `startsWith`.
- Handling a malformed/unparseable `Referer` header safely (treat as invalid → deny, matching the existing "no origin/referer = deny by default" behavior at `api/proxy.ts:84-86`).
- Adding the crafted-bypass referer example from `Autopsy.md` AUTOPSY-P1-03 as an explicit negative test case in this sub-phase's validation.

## 5. Out of Scope

- Any change to `ALLOWED_ORIGINS` itself, rate limiting, file-ID validation, or any other part of `api/proxy.ts`.
- Any change to `vercel.json`'s CORS/CSP headers (that is Faz3.3's concern for the CSP `media-src` question specifically).
- Migrating to a stronger authentication scheme (e.g., signed tokens) for the proxy — not evidenced as necessary and would be scope creep beyond the identified bypass.

## 6. Current Repository Evidence

- `api/proxy.ts:70-87` (`isAllowedOrigin`) — read directly this session; confirms `origin && ALLOWED_ORIGINS.includes(origin)` for the `Origin` header (correct, exact-match) followed by `referer && ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed))` for the `Referer` fallback (the bypass).
- `api/proxy.ts:14-20` (`ALLOWED_ORIGINS`) — `https://syncinema.vercel.app`, `https://www.syncinema.vercel.app`, `http://localhost:5173`, `http://localhost:4173`, `http://localhost:3000`.
- `Autopsy.md` Section 7 — "A crafted referer like `https://syncinema.vercel.app.attacker.example` would satisfy [the check]. This is a real, concrete bypass of an otherwise well-built control (CSP + rate limiting + file-ID regex validation are all present and correctly implemented alongside it)."
- `Autopsy.md` Section 13, AUTOPSY-P1-03 — names the exact fix required: "an exact-match (or proper URL-parsing) fix with a negative test case."

## 7. Planned Work Breakdown

- **F2.1-01 — Reproduce the bypass against the current code**
  - Description: Confirm, via a local `vite dev`/proxy invocation or direct unit-style call to `isAllowedOrigin`, that the crafted referer `https://syncinema.vercel.app.attacker.example` currently passes the check.
  - Output: A concrete before-fix reproduction, giving this sub-phase a real regression baseline (mirrors the vibecoding "prove it's broken before fixing it" pattern used in Faz1.1/Faz1.3).
- **F2.1-02 — Implement exact-origin referer comparison**
  - Description: Replace the `startsWith` call with `new URL(referer).origin` compared via `ALLOWED_ORIGINS.includes(...)`, wrapped in a try/catch that denies on a parse failure.
  - Output: Updated `api/proxy.ts`.
- **F2.1-03 — Add a negative test case using the crafted referer**
  - Description: Since Phase 4 introduces the project's first test runner, this proxy fix's own regression case should either (a) be captured now as a documented manual verification step if Phase 4 has not landed yet, or (b) become one of the first API-layer tests once Vitest exists — this sub-plan should record the exact request/response pair as reusable evidence either way.
  - Output: A documented before/after request-response pair (manual now; automatable later, cross-referenced from Faz4.1 as an available API-layer follow-up).
- **F2.1-04 — Re-verify legitimate origins still pass**
  - Description: Confirm requests from `https://syncinema.vercel.app` (Origin header) and `http://localhost:3000` (Referer header, matching `vite.config.ts`'s actual dev port) still succeed after the fix.
  - Output: Confirmed no false-positive regression for legitimate traffic.

## 8. Acceptance Criteria

- The crafted referer `https://syncinema.vercel.app.attacker.example` (or an equivalent same-prefix bypass attempt) is rejected with 403 after the fix.
- A genuine request from `https://syncinema.vercel.app` (matching `Origin`) and from `http://localhost:3000` (matching `Referer`, exact origin) both still succeed.
- `isAllowedOrigin()` no longer contains any `startsWith`-based comparison against `ALLOWED_ORIGINS`.
- A malformed `Referer` header does not throw an unhandled exception; it is treated as an invalid/denied request.
- `npm run typecheck`, `npm run lint`, `npm run build` (from Phase 1) all still pass.

## 9. Validation and Test Approach

- **Local validation:** `npm run typecheck` (VAL-TYPECHECK), `npm run build` (VAL-BUILD).
- **Security validation (primary, manual for now):** the before/after crafted-referer request pair from F2.1-01/F2.1-03 (VAL-SEC-REFERER); this should be re-run as an automated test once Faz4.1's test runner exists.
- **Regression check:** confirm the legitimate-origin cases in F2.1-04 still pass, so the fix does not become a new denial-of-service against real users.
- This is local-readiness validation; no live Vercel deployment is required to validate the logic itself, though a post-deploy smoke check (one real proxied Google Drive load from the production domain) is a reasonable low-cost confirmation once deployed.

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| api/proxy.ts | modified | Replace `startsWith` referer check with exact-origin comparison via URL parsing. | VAL-TYPECHECK, VAL-BUILD, VAL-SEC-REFERER |
```

## 10. Dependencies and Sequencing

- No dependency on other Phase 2 sub-phases; can be implemented independently of Faz2.2–Faz2.5.
- Benefits from Phase 1's CI (Faz1.3) being in place to catch any typecheck/build regression automatically.
- Requires no credentials; requires no live Supabase access. A live Vercel deployment is only needed for an optional post-deploy smoke check, not for validating the fix itself.
- No human approval beyond normal diff review, since this closes a concrete, already-documented bypass rather than introducing new risk.
- Fresh Claude Code session token/context risk: **Low**. Single-function change in a single file. No subagent needed.

## 11. Risks and Mitigations

- **Risk:** The fix is too strict and rejects a legitimate origin/referer variant not currently in `ALLOWED_ORIGINS` (e.g., a Vercel preview-deployment URL).
  - Impact: A legitimate request (e.g., testing a PR preview deploy) gets denied.
  - Mitigation: F2.1-04 explicitly re-verifies all currently-listed legitimate origins; if preview-deployment support is desired, that is a separate, explicit `ALLOWED_ORIGINS` addition decision, not a side effect of this fix.
- **Risk:** `new URL(referer)` throws on certain malformed but real-world referer strings (e.g., browser extensions sending non-standard referer values).
  - Impact: A legitimate edge-case request could be denied when it previously (insecurely) passed.
  - Mitigation: F2.1-02 wraps the parse in a try/catch and denies on failure, which is the secure-by-default behavior already established at `api/proxy.ts:84-86` for the no-origin/no-referer case.

## 12. Desired End State

`api/proxy.ts`'s referer check uses exact origin comparison, the documented bypass no longer works, and all legitimate traffic paths continue to succeed. The Step 4 ledger entry should record the before/after crafted-referer test result as concrete evidence AUTOPSY-P1-03 is closed.

## 13. Next Sub-Phase Transition Criteria

- The crafted-referer bypass is confirmed closed via a real before/after test.
- Legitimate origins still pass.
- Phase 1 validation gates (typecheck, build) still pass.
- Faz2.2 (Server-Side Admin Brute-Force Lockout) may proceed independently and in parallel; this sub-phase does not block it.
