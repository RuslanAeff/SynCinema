# Faz 6.1 — Error Reporting Decision and Wiring

## 1. Context

`Main-Planing.md` Section 6, Phase 6 description: "Choose (or explicitly defer, as a documented decision) a lightweight error-reporting service beyond `console.error`." `Autopsy.md` Section 10 confirms the current state: 66 `console.log`/`console.error`/`console.warn` call sites are the entire observability story, and `ErrorBoundary.tsx` "only logs to `console.error`, meaning a production error is invisible to the developer unless a user reports it manually." `Main-Planing.md` Section 9 flags this as needing human input, not a silent default: "the exact error-reporting vendor/approach for Phase 6 (or an explicit decision to defer it)."

## 2. Goal

A production runtime error occurring in a real user's browser becomes visible to the developer without requiring the user to manually report it — or, if the user explicitly chooses to defer this capability, that decision is documented with a clear rationale rather than left as an unaddressed gap.

## 3. Description

**Problem solved:** `ErrorBoundary.tsx` (per `Autopsy.md` Section 10) catches render errors and shows a translated fallback UI, "a reasonable minimum for a client-only app," but only logs to `console.error` — invisible unless the developer happens to be watching that specific browser's console at that moment. For a single-developer, live, real-user-facing product, this means most production errors are simply never seen.

**Why it belongs at this point:** Sequenced first in Phase 6 because it is the highest-value observability gap (`console.error`-only means literally invisible-by-default errors), and because Phase 6 as a whole is the "production-grade operational readiness" phase — this is its most direct match to that goal.

**Risk reduction:** Closes a real blind spot; `Main-Planing.md` Section 3 notes "no observability beyond `console.log`/`console.error` ... and a client-side `ErrorBoundary` that only renders a fallback UI locally — no error reporting service" as part of the project's current operational-readiness gap.

**Vibecoding slice strategy:**
- First useful slice: this sub-phase's true first step is a **decision**, not an integration — evaluate 1-2 lightweight, low-setup-cost options (e.g., Sentry's free tier, or a simpler self-hosted/serverless error-logging endpoint) against the project's actual constraints (`Main-Planing.md` Section 4's constraint answers: solo developer, no strict tool preference, "use what fits") and present the tradeoff to the user rather than unilaterally picking one.
- Fastest validation signal: once a choice is made (or explicitly deferred), a deliberately-thrown test error in a non-production context confirms it is captured and visible wherever the chosen service reports to.
- What not to over-plan yet: do not build a full structured-logging/metrics pipeline — that is a larger scope than "error reporting" and not evidenced as needed yet; a single error-reporting integration, wired into the existing `ErrorBoundary.tsx` plus a global `window.onerror`/`unhandledrejection` handler, is the appropriately-scoped first step.

## 4. Scope

- Presenting the error-reporting vendor/approach decision to the user as an explicit choice (this sub-plan itself should not silently pick a vendor on the user's behalf, consistent with `Main-Planing.md` Section 9's flag that this needs human confirmation).
- If a service is chosen: wiring it into `ErrorBoundary.tsx`'s catch path, plus adding a global `window.addEventListener('error', ...)` and `window.addEventListener('unhandledrejection', ...)` handler to catch errors outside React's render tree.
- If deferred: writing an explicit decision record stating why, and what future condition (e.g., "once real user count grows past X" or "once a specific unreported bug occurs") would revisit the decision.
- Ensuring no PII or sensitive data (e.g., `.sync` file contents, Supabase anon key context) is inadvertently sent to a third-party error-reporting service without the user's awareness — this is a real design consideration for any chosen vendor, not an afterthought.

## 5. Out of Scope

- Full structured logging or metrics/tracing infrastructure beyond error capture specifically.
- Any change to `api/proxy.ts`'s own error handling/logging — that is Faz6.2's scope specifically.
- Server-side (Supabase RPC) error visibility — Supabase's own dashboard already provides some visibility there; this sub-phase is about the client-side application's error visibility.

## 6. Current Repository Evidence

- `Autopsy.md` Section 10 — "66 `console.log`/`console.error`/`console.warn` call sites across the codebase are the entire logging story; there is no structured logging, no error-reporting service (Sentry or equivalent), and no metrics/tracing anywhere."
- `src/components/ErrorBoundary.tsx` — per Autopsy, "catches render errors and shows a translated fallback UI plus a reload button ... but it only logs to `console.error`."
- `Main-Planing.md` Section 6, Phase 6 — "Choose (or explicitly defer, as a documented decision) a lightweight error-reporting service beyond `console.error`."
- `Main-Planing.md` Section 9 — flags the exact vendor/approach choice as needing human confirmation before detailed implementation.

## 7. Planned Work Breakdown

- **F6.1-01 — Present the decision to the user**
  - Description: Summarize 1-2 lightweight, low-setup-cost error-reporting options (with their approximate cost/complexity/privacy tradeoffs) and ask the user to choose one or explicitly defer.
  - Output: A recorded user decision.
- **F6.1-02 — Wire the chosen service (if not deferred)**
  - Description: Integrate the chosen service's client SDK into `ErrorBoundary.tsx`'s catch handler and add global `error`/`unhandledrejection` listeners.
  - Output: Updated `ErrorBoundary.tsx`; new global error-listener wiring (likely in `main.tsx` or `App.tsx`).
- **F6.1-03 — Privacy/data-sensitivity review**
  - Description: Confirm what data the chosen service captures by default (stack traces, URL, user agent) and whether any of it overlaps with data the app treats as sensitive (none currently evidenced as PII-bearing, but this should be a deliberate check, not an assumption).
  - Output: A short confirmation note.
- **F6.1-04 — Test with a deliberate error**
  - Description: Throw a deliberate test error in a non-production build/environment and confirm it is captured and visible in the chosen service's dashboard (or, if deferred, this step does not apply).
  - Output: Confirmed evidence the integration works, or an explicit "deferred, not applicable" record.

## 8. Acceptance Criteria

- A decision (adopt a specific service, or explicitly defer) is recorded with rationale.
- If adopted: a deliberately-thrown test error is confirmed visible in the chosen service without requiring a user report.
- If adopted: the privacy/data-sensitivity review is recorded, confirming no unexpected sensitive data is captured.
- If deferred: the decision record states the future trigger condition for revisiting it.
- `npm run typecheck`, `npm run lint`, `npm run build` all pass if any code changes were made.

## 9. Validation and Test Approach

- **Decision validation:** the recorded decision itself (VAL-DOCS-DECISION), following the same pattern as Faz5.1.
- **Integration validation (if adopted):** the deliberate test-error capture (VAL-MANUAL-ERROR-CAPTURE).
- **Local validation:** `npm run typecheck`, `npm run lint`, `npm run build` if code changes were made.
- No live-security validation applies beyond the privacy review in F6.1-03.

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| src/components/ErrorBoundary.tsx | modified | Wire the chosen error-reporting service into the existing catch handler, if adopted. | VAL-TYPECHECK, VAL-MANUAL-ERROR-CAPTURE |
| src/main.tsx | modified | Add global window error/unhandledrejection listeners reporting to the chosen service, if adopted. | VAL-TYPECHECK, VAL-MANUAL-ERROR-CAPTURE |
| Planner-docs/Planing-Ledger.md | modified | Record the error-reporting decision (adopted or deferred) and rationale. | VAL-DOCS-DECISION |
```

## 10. Dependencies and Sequencing

- No dependency on Phases 1–5, though sequenced after them as a Phase 6 item per the Main Plan's roadmap.
- Requires an explicit human decision before implementation proceeds (F6.1-01) — this sub-phase must not silently pick a vendor.
- If a third-party service is chosen, may require a new account/API key for that service — any such key must be handled via environment configuration, never written into a Planner-docs file, consistent with the project's existing pattern for `VITE_SUPABASE_*` values.
- Fresh Claude Code session token/context risk: **Low**. Small, well-scoped integration once the decision is made. No subagent needed.

## 11. Risks and Mitigations

- **Risk:** A chosen third-party error-reporting service captures more data than intended (e.g., full request bodies, user input) by default.
  - Impact: An unintended privacy exposure.
  - Mitigation: F6.1-03 explicitly requires reviewing the service's default data capture before considering this sub-phase complete.
- **Risk:** This sub-phase is implemented without the user's explicit vendor choice, defaulting to whatever is most familiar.
  - Impact: A tool decision made without the user's informed consent, potentially incurring unwanted cost or vendor lock-in.
  - Mitigation: F6.1-01 is a hard prerequisite gate — Step 4 must not proceed to F6.1-02 without a recorded user decision.

## 12. Desired End State

Production runtime errors are either now visible to the developer without manual user reports (if adopted), or a clear, revisitable decision to defer this capability is on record (if deferred). The Step 4 ledger entry should record which path was chosen and why.

## 13. Next Sub-Phase Transition Criteria

- The error-reporting decision is recorded, and if adopted, verified working via a deliberate test error.
- Faz6.2 (Proxy Observability) may proceed independently; this sub-phase does not block it.
