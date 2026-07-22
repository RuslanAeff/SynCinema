# Faz 2.5 — `.sync` Project Import Shape Validation

## 1. Context

`Main-Planing.md` Section 6, Phase 2 description: "add shape validation to `.sync` project import before spreading its contents into live state." `Autopsy.md` **AUTOPSY-P2-02** (Section 6, also Section 13) confirms the exact location: `useAudioTracks.ts:211-223`'s `importProject` spreads `prefs[t.name]` directly onto live track state (`{...t, ...prefs[t.name]}`) with no schema check, meaning `Partial<AudioTrack>` is a compile-time-only guarantee that provides zero runtime protection against a malformed or adversarially crafted `.sync` file — and, per `Autopsy.md`'s framing, that compile-time checking is itself not currently enforced until Faz1.1 lands.

## 2. Goal

A `.sync` project file whose `trackPrefs` contain unexpected, malformed, or unexpected-type fields cannot corrupt live `AudioTrack` state when imported — only recognized, correctly-typed fields are applied.

## 3. Description

**Problem solved:** `importProject` (`useAudioTracks.ts:184-233`) parses arbitrary JSON from a user-selected file and spreads matching entries directly onto live track objects with `{...t, ...prefs[t.name], eq: prefs[t.name].eq || t.eq, useCompressor: prefs[t.name].useCompressor ?? t.useCompressor}`. A crafted `.sync` file could set fields the UI does not expect the import path to touch — for example, overwriting `id` (breaking React key identity or downstream lookups), `objectUrl` (pointing audio playback at an attacker-controlled or invalid URL), or `file` (a non-`File` value where component code expects a real `File` object).

**Why it belongs at this point:** It is the fourth of Phase 2's four named items, independent of the other three, and specifically protects the one place in the app where fully user-controlled, file-based input flows directly into live application state without any interim validation layer (unlike the proxy, which validates its one input, the Google Drive file ID, per `Project-Ontology.md` Section 7's invariant).

**Risk reduction:** Closes AUTOPSY-P2-02; the `.sync` format is explicitly a "user-owned export/import format" per `Main-Planing.md` Section 5, so this is not about distrustful multi-tenant security in the traditional sense, but about defending the app against a malformed or maliciously-shared `.sync` file (e.g., downloaded from an untrusted source and imported by a user expecting it to be safe, since the product's own UI presents `.sync` files as a normal, safe project-sharing mechanism).

**Vibecoding slice strategy:**
- First useful slice: define an explicit whitelist of the `AudioTrack` fields the import path is allowed to touch (`offset`, `playbackRate`, `deviceId`, `eq`, `useCompressor`, `gainBoost` — exactly the fields `saveTrackPref` at `useAudioTracks.ts:125-132` already writes, which is strong evidence of the *intended* shape of a track pref) and only copy those specific fields across, with type/range checks per field.
- Fastest validation signal: import a deliberately malformed `.sync` file (extra unexpected fields, wrong types) and confirm the resulting track state contains only the whitelisted fields, correctly typed, with no crash.
- What not to over-plan yet: do not build a general-purpose schema-validation library dependency (e.g., zod) unless the field count/complexity genuinely warrants it — `Project-Ontology.md` Section 8's own open question ("reject unknown fields entirely, or merge permissively while only whitelisting known keys?") is explicitly framed as a Step 2/4 design decision; this sub-plan resolves it in favor of **whitelist known keys, ignore the rest**, since that is the minimal-dependency, most defensive option consistent with not silently accepting unknown shape.

## 4. Scope

- Defining an explicit, typed validation function for a single track's imported pref object, checking: `offset`/`playbackRate`/`gainBoost` are finite numbers within sane bounds (e.g., `gainBoost` within the documented 1.0–3.0× range per `Project-Ontology.md` Section 2); `deviceId` is a string; `eq` is an object with numeric `low`/`mid`/`high`; `useCompressor` is a boolean.
- Applying this validation inside `importProject` before the `setAudioTracks` spread, so only validated, whitelisted fields reach live state — unknown/extra fields are dropped, not merged.
- Applying the same reasoning to `appSettings.masterVolume`/`appSettings.theme` (also spread with minimal checking today — `importProject` at lines 200-207) since they are part of the same import path, even though `Autopsy.md`'s specific citation focuses on `trackPrefs`.
- Preserving the existing user-facing toast messaging (`showToast` calls) but updating the wording if validation causes some fields/tracks to be silently skipped, so the user isn't left thinking more was imported than actually was.

## 5. Out of Scope

- Any change to `exportProject` — the export path already only writes known, correctly-typed values, since it reads from live app state, not from an external file.
- Introducing a new validation library dependency unless the whitelist-based approach proves genuinely insufficient during implementation (see Section 3's vibecoding note).
- Any change to the `.sync` file format itself (e.g., adding a version-checked schema migration system) — this sub-phase validates the *current* format's fields defensively; it does not redesign the format.

## 6. Current Repository Evidence

- `useAudioTracks.ts:184-233` (`importProject`, read directly this session) — confirms the unvalidated spread at lines 211-223, and separately at lines 200-207 for `appSettings`.
- `useAudioTracks.ts:125-132` (`saveTrackPref`'s call site inside `updateAudioTrack`) — confirms the intended/canonical shape of a track pref: exactly `offset`, `playbackRate`, `deviceId`, `eq`, `useCompressor`, `gainBoost`, which is direct repository evidence for this sub-phase's whitelist design (Section 3).
- `Autopsy.md` Section 6 — "A malformed or adversarially crafted `.sync` file could overwrite fields the UI does not expect (e.g., `id`, `objectUrl`) since `Partial<AudioTrack>` is not enforced at runtime, only at compile time — and compile-time checking is itself not enforced in the build (see above)," directly linking this finding to Faz1.1's fix.
- `Project-Ontology.md` Section 8 — "Should `.sync` file import validation ... reject unknown fields entirely, or merge permissively while only whitelisting known keys? — status: open. A Step 2/4 design decision, not yet made." This sub-plan makes that decision explicitly (Section 3).

## 7. Planned Work Breakdown

- **F2.5-01 — Define the track-pref whitelist and per-field validators**
  - Description: Implement a pure function (e.g., `sanitizeImportedTrackPref(raw: unknown): Partial<AudioTrack>`) that checks each of the six known fields' type/range and returns only the valid subset.
  - Output: New validation function, colocated with `useAudioTracks.ts` or in `src/utils/` alongside `fileFingerprint.ts`/`formatTime.ts` if a separate module fits the existing project structure better.
- **F2.5-02 — Apply the whitelist inside `importProject`**
  - Description: Replace the direct `{...t, ...prefs[t.name], ...}` spread with `{...t, ...sanitizeImportedTrackPref(prefs[t.name])}`, and apply an equivalent check to `appSettings.masterVolume`/`appSettings.theme` before use.
  - Output: Updated `importProject` in `useAudioTracks.ts`.
- **F2.5-03 — Update user-facing messaging for partial/rejected imports**
  - Description: Adjust the `showToast` call so a user importing a `.sync` file with some invalid fields sees accurate feedback (e.g., distinguishing "settings restored" from "some settings were invalid and skipped") rather than an unconditional success message.
  - Output: Updated toast messaging logic.
- **F2.5-04 — Test with a deliberately malformed `.sync` file**
  - Description: Construct a `.sync`-format JSON file with extra unexpected top-level keys inside a track pref (e.g., `id`, `objectUrl`, `file`) and wrong-typed known fields (e.g., `offset: "not-a-number"`), import it, and confirm only valid whitelisted fields are applied and the app does not crash or silently accept the bad values.
  - Output: Confirmed before/after evidence of the fix.

## 8. Acceptance Criteria

- Importing a `.sync` file with extra fields (e.g., `id`, `objectUrl`) does not change the live track's `id` or `objectUrl` — those remain the values the app itself assigned.
- Importing a `.sync` file with a wrong-typed known field (e.g., `offset` as a string) does not apply that invalid value; the previous/default value is retained instead.
- Importing a well-formed `.sync` file (matching `saveTrackPref`'s canonical shape) continues to work exactly as before — no regression for the normal case.
- `appSettings.masterVolume`/`appSettings.theme` are similarly validated before being applied.
- `npm run typecheck`, `npm run lint`, `npm run build` all pass.
- The user-facing import confirmation message accurately reflects what was actually applied.

## 9. Validation and Test Approach

- **Manual validation (primary for now):** the malformed-file import test in F2.5-04 (VAL-MANUAL-IMPORT-SANITIZE).
- **Local validation:** `npm run typecheck` (VAL-TYPECHECK), `npm run lint` (VAL-LINT), `npm run build` (VAL-BUILD).
- **Future automated coverage:** `sanitizeImportedTrackPref` is a pure function with no DOM/`AudioContext` dependency, making it a strong, low-effort candidate for Phase 4's unit-test backlog (Faz4.2/Faz4.3) once Vitest exists — this sub-plan should note that connection explicitly for Step 4/Phase 4 continuity rather than treating it as forgotten scope.
- This is local, non-networked validation; no live/security-boundary validation applies since `.sync` files never leave the browser (per `Main-Planing.md` Section 5's persistence-boundary description, `.sync` files are user-owned export/import only).

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| src/hooks/useAudioTracks.ts | modified | Apply whitelist-based sanitization to imported track prefs and app settings before spreading into live state. | VAL-TYPECHECK, VAL-LINT, VAL-BUILD, VAL-MANUAL-IMPORT-SANITIZE |
```

## 10. Dependencies and Sequencing

- No dependency on any other Phase 2 sub-phase; fully independent.
- Benefits from Faz1.1 (typecheck-in-build) being in place, since this sub-phase's whole premise is that compile-time `Partial<AudioTrack>` typing alone is insufficient — having a real build-time typecheck gate makes the runtime validation this sub-phase adds a genuine second, complementary layer rather than the only layer.
- Requires no credentials, live endpoints, or human approval — pure client-side logic change.
- Fresh Claude Code session token/context risk: **Low**. One new pure function plus one call-site change. No subagent needed.

## 11. Risks and Mitigations

- **Risk:** The whitelist is too strict and silently drops a legitimate field a future feature adds to `AudioTrack` without updating the whitelist.
  - Impact: A future track-pref field silently fails to round-trip through export/import.
  - Mitigation: Document the whitelist's field list directly alongside `saveTrackPref`'s own field list (they should always match) so a future contributor adding a new persisted field is prompted to update both in the same place; note this coupling explicitly in code.
- **Risk:** Range validation for `gainBoost`/`offset` is set too narrowly and rejects legitimate edge-case values a real user actually saved.
  - Impact: Legitimate user settings fail to import.
  - Mitigation: Base range bounds on the actual UI-enforced ranges already in the codebase (e.g., the gain boost slider's 100%–300% range per `Main-Planing.md` Section 6, Phase 4 description) rather than inventing new bounds.

## 12. Desired End State

`.sync` import applies only validated, whitelisted, correctly-typed fields to live track state; a malformed or crafted file cannot inject unexpected fields or wrong-typed values; the user is accurately informed if any part of an import was rejected. The Step 4 ledger entry should record the malformed-file test result and flag `sanitizeImportedTrackPref` as an available Phase 4 unit-test target.

## 13. Next Sub-Phase Transition Criteria

- The malformed-file import test confirms only whitelisted, valid fields are applied.
- The well-formed import path is confirmed unregressed.
- Phase 1 validation gates pass.
- With this sub-phase complete, Phase 2 (Security Hardening) is fully closed pending Faz2.2's and Faz2.3's live-execution approvals; Phase 3 (Documentation Reconciliation) may begin independently at any point, since it has no dependency on Phase 2's completion.
