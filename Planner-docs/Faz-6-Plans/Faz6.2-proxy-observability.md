# Faz 6.2 — Proxy Observability

## 1. Context

`Main-Planing.md` Section 6, Phase 6 description: "add basic request logging/metrics on the Vercel proxy function (rate-limit hits, failure modes)." `Autopsy.md` Section 10 notes the proxy's in-memory rate limiter "is a reasonable lightweight control for a low-traffic personal tool, with a documented limitation (per-instance memory, resets on cold start) that is acceptable for the current scale but should be revisited if traffic grows meaningfully (Phase 6/7 territory)." `Autopsy.md` Section 12 explicitly assigns this to Phase 6: "The rate limiter's documented in-memory limitation (Section 10) should be explicitly accepted-as-a-tradeoff or revisited here, not silently forgotten."

## 2. Goal

The Vercel proxy function's operational behavior — rate-limit hits, Google Drive fetch failures, origin/referer rejections — is visible somewhere a developer can review it after the fact, without requiring a live-tailed console during the exact moment of an incident.

## 3. Description

**Problem solved:** `api/proxy.ts` already has good inline `console.log`/`console.warn`/`console.error` calls at each of its decision points (origin rejection, rate limiting, file-ID validation, Google Drive fetch failure) — per `Main-Planing.md` Section 7's own praise ("the inline comments are notably good where they exist, e.g., in `useVideoPlayer.ts` and `api/proxy.ts` — this is a strength to preserve"). But Vercel serverless function logs are ephemeral/console-only unless explicitly reviewed via the Vercel dashboard in near-real-time, meaning a spike in rate-limit hits or a pattern of failed Google Drive fetches could go entirely unnoticed.

**Why it belongs at this point:** Sequenced second in Phase 6, after the broader client-side error-reporting decision (Faz6.1), because it is a narrower, proxy-specific instance of the same underlying gap (no persistent, reviewable operational visibility) — and because a decision made in Faz6.1 (which service, if any, is adopted) may influence whether this sub-phase reuses the same service or a Vercel-native alternative (e.g., Vercel's own log drains/observability features).

**Risk reduction:** Makes the proxy's already-documented rate-limiter limitation (per-instance memory, resets on cold start) an explicitly monitored tradeoff rather than a silent one — if the limitation ever becomes a real problem (meaningful traffic growth), evidence will exist to justify revisiting it, rather than the team discovering it only after a real abuse incident.

**Vibecoding slice strategy:**
- First useful slice: confirm what Vercel's own built-in function logs/observability dashboard already provides for free before adding any new external logging dependency — Vercel likely already retains recent invocation logs, request counts, and error rates without any code change required.
- Fastest validation signal: trigger a rate-limit hit deliberately (e.g., 11 rapid requests) and confirm it is visible and reviewable after the fact via whatever mechanism this sub-phase settles on (Vercel's own dashboard, or a forwarded log if Faz6.1's chosen error-reporting service is reused).
- What not to over-plan yet: do not build a custom metrics/dashboard system — for a low-traffic personal project, Vercel's built-in observability (or, at most, forwarding the proxy's existing console output to Faz6.1's chosen service, if any) is very likely sufficient; a bespoke solution would be scope creep relative to actual evidenced need.

## 4. Scope

- Confirming and documenting what Vercel's own dashboard already surfaces for `api/proxy.ts` (invocation count, error rate, recent logs) with no code change required — this may fully satisfy the Main Plan's goal on its own.
- If Vercel's built-in visibility is deemed insufficient: forwarding key proxy events (rate-limit hits specifically, since that is the Main Plan's named example) to Faz6.1's chosen error-reporting/logging service, if one was adopted.
- Explicitly re-confirming and documenting the existing rate-limiter's per-instance-memory limitation as an accepted tradeoff for current scale, with a stated condition for revisiting it (e.g., "if sustained traffic exceeds N requests/day" or "if a real abuse incident occurs").

## 5. Out of Scope

- Migrating the rate limiter to a distributed store (e.g., Redis/Upstash) — `Project-Ontology.md` Section 8 lists this as an explicitly open, traffic-dependent question ("Depends on future traffic, which is unknown"), not something this sub-phase should decide preemptively.
- Any change to `api/proxy.ts`'s actual security logic (that is Phase 2's territory, already covered by Faz2.1).
- Client-side error reporting (Faz6.1's scope, not this sub-phase's).

## 6. Current Repository Evidence

- `api/proxy.ts:28-55` — the in-memory rate limiter, with a periodic cleanup `setInterval`, confirmed via direct read this session (also referenced in Faz2.1's evidence for the same file).
- `api/proxy.ts:161-173` — the rate-limit-hit logging (`console.warn(\`[Proxy] Rate limited IP: ${clientIp}\`)`) already exists at the point of rejection.
- `Autopsy.md` Section 10 — "the Vercel proxy function includes an in-memory rate limiter ... a reasonable lightweight control for a low-traffic personal tool, with a documented limitation (per-instance memory, resets on cold start) that is acceptable for the current scale but should be revisited if traffic grows meaningfully (Phase 6/7 territory)."
- `Main-Planing.md` Section 6, Phase 6 — "add basic request logging/metrics on the Vercel proxy function (rate-limit hits, failure modes)."

## 7. Planned Work Breakdown

- **F6.2-01 — Audit Vercel's built-in observability**
  - Description: Review what Vercel's dashboard already provides for `api/proxy.ts` without any code change (invocation logs, error rates, function duration).
  - Output: A documented summary of what's already available "for free."
- **F6.2-02 — Decide whether additional forwarding is needed**
  - Description: Based on F6.2-01, decide whether Vercel's built-in visibility is sufficient or whether specific events (rate-limit hits, Google Drive fetch failures) should also be forwarded to Faz6.1's chosen service (if adopted).
  - Output: A recorded decision.
- **F6.2-03 — Implement forwarding, if decided necessary**
  - Description: Add minimal forwarding calls at the existing `console.warn`/`console.error` call sites in `api/proxy.ts` to also report to the chosen external service.
  - Output: Updated `api/proxy.ts`, only if F6.2-02 determines this is needed.
- **F6.2-04 — Document the rate-limiter tradeoff explicitly**
  - Description: Write an explicit note (in `Planing-Ledger.md` or a code comment near the rate limiter) stating the per-instance-memory limitation is an accepted tradeoff for current scale, with the specific future condition that would justify revisiting it.
  - Output: A recorded, explicit tradeoff acceptance.
- **F6.2-05 — Verify with a deliberate rate-limit trigger**
  - Description: Send 11+ rapid requests to the proxy in a test context and confirm the resulting rate-limit hit is visible via whatever mechanism this sub-phase settled on.
  - Output: Confirmed evidence.

## 8. Acceptance Criteria

- What Vercel's built-in dashboard already provides for the proxy function is documented.
- A decision on whether additional event forwarding is needed is recorded, with rationale.
- If forwarding was implemented, a deliberate rate-limit trigger is confirmed visible after the fact via the chosen mechanism.
- The rate-limiter's per-instance-memory limitation is explicitly documented as an accepted tradeoff, with a stated future revisit condition.
- `npm run typecheck`, `npm run lint`, `npm run build` all pass if `api/proxy.ts` was modified.

## 9. Validation and Test Approach

- **Manual validation (primary):** the deliberate rate-limit trigger test (VAL-MANUAL-RATE-LIMIT-VISIBILITY).
- **Local validation:** `npm run typecheck`, `npm run lint`, `npm run build` if `api/proxy.ts` was modified.
- **Live validation:** since `api/proxy.ts` only runs as a real Vercel function, any forwarding verification (F6.2-05) is inherently a live-environment check, not a local one.
- No security-boundary changes are introduced by this sub-phase; it is purely observability-additive.

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| api/proxy.ts | modified | Add event forwarding to an external observability service at existing rate-limit/failure log points, only if F6.2-02 determines this is needed beyond Vercel's built-in dashboard. | VAL-TYPECHECK, VAL-BUILD, VAL-MANUAL-RATE-LIMIT-VISIBILITY |
| Planner-docs/Planing-Ledger.md | modified | Record the rate-limiter tradeoff acceptance and its future revisit condition. | VAL-DOCS-DECISION |
```

## 10. Dependencies and Sequencing

- Loosely depends on **Faz6.1**'s decision (if an error-reporting service was adopted there, this sub-phase can reuse it rather than evaluating a separate vendor) — not a hard blocking dependency, since F6.2-01/F6.2-02 could determine Vercel's built-in observability is sufficient on its own, making Faz6.1's choice irrelevant to this sub-phase.
- Requires access to the Vercel dashboard for F6.2-01's audit.
- No human approval required beyond normal diff review, since this sub-phase is purely observability-additive with no security-relevant behavior change.
- Fresh Claude Code session token/context risk: **Low**. Small, scoped addition, likely resolved by F6.2-01 alone in the low-traffic case. No subagent needed.

## 11. Risks and Mitigations

- **Risk:** This sub-phase over-builds observability infrastructure disproportionate to the project's actual (low) traffic scale.
  - Impact: Wasted effort, unnecessary new dependency/vendor relationship.
  - Mitigation: F6.2-01 explicitly comes first, and F6.2-02's decision should default toward "Vercel's built-in dashboard is sufficient" unless a concrete gap is found, consistent with vibecoding's preference for the smallest useful next step.
- **Risk:** Forwarding proxy events to an external service accidentally includes sensitive data (e.g., full client IPs beyond what's needed, or request details).
  - Impact: An unintended data-handling concern.
  - Mitigation: If F6.2-03 is implemented, forward only the already-logged, already-minimal event data (e.g., "rate limited," not full request headers).

## 12. Desired End State

The proxy's operational behavior (rate-limit hits, failure modes) is confirmed reviewable after the fact via either Vercel's existing dashboard or an explicit forwarding addition, and the rate-limiter's known scaling limitation is an explicitly accepted, documented tradeoff rather than a silently-forgotten one. The Step 4 ledger entry should record what observability mechanism is in place and the rate-limiter tradeoff's revisit condition.

## 13. Next Sub-Phase Transition Criteria

- Proxy observability (via Vercel's dashboard or explicit forwarding) is confirmed working via a deliberate test.
- The rate-limiter tradeoff is explicitly documented.
- Faz6.3 (Backup/Retention Policy for Supabase `sync_presets`) may proceed independently; this sub-phase does not block it.
