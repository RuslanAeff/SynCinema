# Faz 2.4 — Microphone Permission Gesture-Gating

## 1. Context

`Main-Planing.md` Section 6, Phase 2 description: "gate the microphone-permission request behind an explicit user action instead of mount-time." `Autopsy.md` **AUTOPSY-P2-01** confirms the exact location: `useAudioTracks.ts:21-46`'s `refreshDevices` is called from a mount-time `useEffect` (`useAudioTracks.ts:42-46`), meaning the permission prompt appears immediately on page load before any user interaction.

## 2. Goal

The browser's microphone-permission prompt appears only after the user takes an explicit action that implies they want to select an output device, not automatically when the app loads.

## 3. Description

**Problem solved:** `useAudioTracks.ts:42-46` runs `refreshDevices()` inside a `useEffect` with an empty-ish dependency (`[refreshDevices]`, itself stable via `useCallback`), which fires on every mount. `refreshDevices` (lines 21-40) calls `navigator.mediaDevices.getUserMedia({ audio: true })` whenever `permissionsGranted` is false — meaning a first-time visitor sees a browser permission prompt before doing anything, which is both an unconventional first impression and, per `Autopsy.md` Section 13, "erodes trust."

**Why it belongs at this point:** It is one of the four concrete Phase 2 items named in the Main Plan, independent of the other three, and low-risk since it only changes *when* an existing, already-correct permission flow triggers, not the flow's logic itself.

**Risk reduction:** Closes AUTOPSY-P2-01; improves first-impression trust, which `Main-Planing.md` Section 2 explicitly lists as something that "must never be compromised" ("User trust in what the product claims it can do").

**Vibecoding slice strategy:**
- First useful slice: identify the actual first point in the UI where a user expresses intent to use per-track device routing (most likely opening the device-selection dropdown/sidebar section for a track, or explicitly per `AUTOPSY-P2-01`'s Step 2 impact note: "gate this behind an explicit user action (e.g., opening the device-selection UI)").
- Fastest validation signal: load the app fresh (cleared permissions) and confirm no permission prompt appears until the identified gesture is performed.
- What not to over-plan yet: do not redesign the broader device-enumeration/permission architecture — `refreshDevices`'s internal logic (the `getUserMedia`-then-`enumerateDevices`-with-300ms-delay pattern) is sound and evidenced as intentional (`useAudioTracks.ts:29-32`'s comment explaining the delay); only the trigger point moves.

## 4. Scope

- Removing (or conditioning) the mount-time `useEffect` call to `refreshDevices()` in `useAudioTracks.ts:42-46`.
- Identifying the correct explicit-user-action trigger point in the UI (likely a track row's device-selector dropdown open event, or a dedicated "detect devices" action) and wiring `refreshDevices()` to fire there instead.
- Preserving the existing `devicechange` event listener (`useAudioTracks.ts:44`) as-is, since that listener only *updates* the device list after permission has already been granted once — it does not itself trigger a new permission prompt.
- Ensuring the device list is still populated correctly the first time a user actually needs it (no regression in device-selection functionality, only a change in timing).

## 5. Out of Scope

- Any change to `AudioGraphManager.tsx`'s device-routing logic (`setSinkId` usage) — untouched, since this is purely about *when permission is requested*, not how devices are used once granted.
- Any change to the `devicechange` listener's behavior.
- Redesigning the UX copy/messaging around device permission (e.g., adding an explanatory tooltip) — a reasonable follow-up but not required by the Main Plan's acceptance signal, which is purely behavioral (gesture-gated, not mount-time).

## 6. Current Repository Evidence

- `useAudioTracks.ts:21-40` (`refreshDevices`) — read directly this session; confirms `getUserMedia({ audio: true })` is called whenever `!permissionsGranted`, with a 300ms delay before `enumerateDevices()`, explained by an in-code comment about browsers needing time to update permission state.
- `useAudioTracks.ts:42-46` — the mount-time `useEffect` calling `refreshDevices()` unconditionally on mount.
- `Autopsy.md` Section 7, AUTOPSY-P2-01 (duplicated in Section 13 with the same ID) — "First-impression UX risk; a permission prompt appears before any user action ... Step 2 sub-plan should gate this behind an explicit user action (e.g., opening the device-selection UI)."
- `Project-Ontology.md` Section 4 lists `useAudioTracks.ts` under "Media ingestion" module ownership, alongside `UrlLoaderModal.tsx` — this sub-phase's change is scoped to this hook only, not the ingestion UI components themselves, beyond wiring the new trigger point.

## 7. Planned Work Breakdown

- **F2.4-01 — Locate the correct explicit-gesture trigger point**
  - Description: Trace how `refreshDevices`/`audioDevices`/`permissionsGranted` are consumed downstream (likely in `AudioTrackRow.tsx` or a sidebar device-selector component) to find the first UI element a user interacts with when they actually want to choose an output device.
  - Output: A confirmed trigger point (e.g., `onClick`/`onFocus` of a device-selector dropdown, or a dedicated button).
- **F2.4-02 — Remove the mount-time `useEffect` trigger**
  - Description: Delete or condition the `useEffect` at `useAudioTracks.ts:42-46` so `refreshDevices()` no longer fires automatically on mount.
  - Output: Updated `useAudioTracks.ts`.
- **F2.4-03 — Wire `refreshDevices()` to the identified gesture**
  - Description: Call `refreshDevices()` from the trigger point identified in F2.4-01 (e.g., the device-selector's open handler), ensuring it only fires once per session unless the user explicitly refreshes (preserving `permissionsGranted`'s existing short-circuit logic).
  - Output: Updated component wiring at the trigger-point location.
- **F2.4-04 — Manual verification with cleared permissions**
  - Description: In a browser profile/incognito session with no prior microphone permission grant for the app's origin, load the app and confirm no permission prompt appears until the identified gesture is performed; then perform the gesture and confirm the prompt appears and devices populate correctly afterward.
  - Output: Confirmed before/after manual test evidence.

## 8. Acceptance Criteria

- Loading the app fresh (cleared site permissions) shows no microphone-permission prompt before any user interaction.
- Performing the identified explicit gesture (e.g., opening a track's device selector) triggers the permission prompt exactly as before, and device enumeration still works correctly once granted.
- The existing `devicechange` listener continues to update the device list live after permission is granted, unchanged.
- `npm run typecheck`, `npm run lint`, `npm run build` all pass.
- No other part of the media-ingestion or audio-track-management flow regresses.

## 9. Validation and Test Approach

- **Manual validation (primary):** the cleared-permissions before/after test in F2.4-04 (VAL-MANUAL-PERMISSION-GATE) — this is inherently a browser-behavior check that automated unit tests cannot fully replace, since `getUserMedia` prompts are a real browser UI element.
- **Local validation:** `npm run typecheck` (VAL-TYPECHECK), `npm run lint` (VAL-LINT), `npm run build` (VAL-BUILD).
- **Regression check:** confirm adding an audio track and selecting an output device still works end-to-end after the change (VAL-MANUAL-DEVICE-SELECT).
- This is local/manual browser validation; no live deployment or security-boundary validation applies.

```markdown
| Path | State | Purpose | Validation Command IDs |
|---|---|---|---|
| src/hooks/useAudioTracks.ts | modified | Remove mount-time refreshDevices() trigger. | VAL-TYPECHECK, VAL-LINT, VAL-BUILD, VAL-MANUAL-PERMISSION-GATE |
| src/components/AudioTrackRow.tsx | existing | Likely location of the device-selector UI; read as context to find/wire the explicit-gesture trigger point; may become modified once F2.4-01 confirms the exact location. | VAL-MANUAL-DEVICE-SELECT |
```

## 10. Dependencies and Sequencing

- No dependency on any other Phase 2 sub-phase; fully independent.
- Requires no credentials, live endpoints, or human approval beyond normal diff review — this is a pure client-side UX/timing change.
- Fresh Claude Code session token/context risk: **Low**. One hook change plus tracing one downstream consumer. No subagent needed.

## 11. Risks and Mitigations

- **Risk:** The chosen trigger point is not actually the first place a user would reasonably expect device selection to matter (e.g., gating too late, after the user has already added an audio track and expects it to just work).
  - Impact: A confusing UX where adding a track doesn't immediately offer device choice.
  - Mitigation: F2.4-01 traces actual downstream usage before deciding, rather than guessing; the manual test in F2.4-04 should include the realistic first-use flow (add a track, then look for a device selector) to catch a poorly-chosen trigger point.
- **Risk:** Some browsers cache the "no permission yet" state such that gating changes reveal a different empty-device-list UI state that was previously masked by the mount-time prompt happening so early.
  - Impact: A newly-visible empty-state UI bug that previously went unnoticed.
  - Mitigation: F2.4-04's manual test explicitly checks the pre-permission UI state, not just the post-permission one.

## 12. Desired End State

The microphone-permission prompt no longer appears on page load; it appears only when the user takes an explicit action indicating intent to select an output device, with no regression to device enumeration or selection once granted. The Step 4 ledger entry should record the exact trigger point chosen and the manual verification result.

## 13. Next Sub-Phase Transition Criteria

- Cleared-permissions manual test confirms no mount-time prompt.
- Gesture-triggered permission flow works end-to-end with no regression.
- Phase 1 validation gates pass.
- Faz2.5 (`.sync` Import Shape Validation) may proceed independently; this sub-phase does not block it.
