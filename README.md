<div align="center">

# SynCinema

### Professional Multi-Output Synchronized Video Player

[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Live Demo](https://img.shields.io/badge/Demo-Live-green.svg)](https://syncinema.vercel.app)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-3178C6?logo=typescript)](https://typescriptlang.org)
[![i18n](https://img.shields.io/badge/i18n-4_Languages-blueviolet)](https://syncinema.vercel.app)

**Watch a video while routing multiple external audio tracks to different output devices simultaneously — with millisecond-precision sync, a 3-band EQ, compressor, and community-shared sync offsets.**

*Perfect for family movie nights where everyone wants their own language track on their own headphones.*

**[Try it live → syncinema.vercel.app](https://syncinema.vercel.app)**

</div>

---

## Table of Contents

1. [Core Concept](#core-concept)
2. [Feature Overview](#feature-overview)
3. [Tech Stack](#tech-stack)
4. [Project Structure](#project-structure)
5. [Architecture & Data Flow](#architecture--data-flow)
6. [Key Components](#key-components)
7. [Custom Hooks](#custom-hooks)
8. [Web Audio Pipeline](#web-audio-pipeline)
9. [Cloud Sync System](#cloud-sync-system)
10. [File Fingerprinting](#file-fingerprinting)
11. [Internationalization](#internationalization)
12. [Persistence & State](#persistence--state)
13. [Environment Variables](#environment-variables)
14. [Getting Started](#getting-started)
15. [Keyboard Shortcuts](#keyboard-shortcuts)
16. [Design Decisions & Gotchas](#design-decisions--gotchas)

---

## Core Concept

SynCinema solves a specific problem: **playing a video while routing separate audio tracks to different physical output devices simultaneously**. For example, a film's original audio goes to TV speakers while a dubbed/commentary track goes to headphones — both perfectly in sync.

Each audio track is fully independent:
- Its own output device (via Web Audio API `AudioContext.setSinkId`)
- Its own start offset (can be shifted ±hours relative to video)
- Its own playback speed, volume, mute state, 3-band EQ, dynamic compressor, and gain boost

---

## Feature Overview

### Audio & Video

| Feature | Details |
|---|---|
| **Multi-track audio** | Unlimited simultaneous audio tracks, each with independent settings |
| **Multi-device output routing** | Per-track output device selection; video audio is routed separately |
| **Sync offset control** | Millisecond-precision slider + manual input per audio track |
| **3-band EQ** | Low (lowshelf 320 Hz), Mid (peaking 1 kHz, Q=0.5), High (highshelf 3.2 kHz) |
| **Dynamic compressor** | Toggle per track; bypassed by graph rewiring (not parameter hacks) |
| **Gain boost** | 100%–300% amplification per track via a dedicated GainNode |
| **EQ presets** | Flat, Cinema, Dialogue, Music, Night Mode, Bass Boost |
| **Master volume** | Global multiplier applied to all audio tracks |
| **VU Meter** | Real-time audio level visualizer per track |

### Video Sources

| Feature | Details |
|---|---|
| **Local files** | Drag & drop or file picker — video, audio, .srt subtitles |
| **YouTube** | Full YouTube IFrame API integration |
| **URL loading** | Direct HTTP(S), Google Drive (via proxy), Dropbox |
| **Bookmarklet** | Browser bookmarklet sends any tab's video to SynCinema via `?video=` URL param |
| **Drag & Drop** | Drop video, audio, or subtitle files anywhere on the UI |

### Subtitles

| Feature | Details |
|---|---|
| **SRT support** | Parse and display .srt subtitle files |
| **Offset adjustment** | Shift subtitles ± seconds to resync |
| **Style controls** | Color, background, font size (small/medium/large/xlarge), text shadow |

### Tools & Settings

| Feature | Details |
|---|---|
| **Project save/load** | Export/import `.sync` files (JSON) with all track prefs |
| **Timeline markers** | Set named bookmarks; click to seek |
| **Local analytics** | Per-session usage stats (watch time, events) |
| **i18n** | English, Turkish, Azerbaijani, Russian |
| **Theme system** | Dark/Light mode + accent color customization |
| **Onboarding** | Welcome screen + interactive step-by-step tour (desktop only) |
| **Admin panel** | Hidden panel for moderating Supabase sync_presets (Ctrl+Shift+A) |
| **Detached player** | Pop video out to a separate browser window |
| **Seasonal effects** | Canvas snowfall Dec 20 – Jan 10 |

### Community Cloud Sync

| Feature | Details |
|---|---|
| **Auto-discover** | When you load a video+audio pair, SynCinema checks Supabase for a known community offset |
| **Share offsets** | Contribute your sync offset for others to find |
| **Trust system** | Presets with >1 vote are marked "trusted"; single-vote presets show a warning |
| **Vote dedup** | Server-side deduplication via browser fingerprint hash |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 |
| Language | TypeScript ~5.8 |
| Build tool | Vite 6 |
| Styling | Tailwind CSS v3 + PostCSS + Autoprefixer |
| Icons | Lucide React |
| Audio DSP | Web Audio API (native browser) |
| Waveforms | WaveSurfer.js 7 |
| Backend / DB | Supabase (PostgreSQL + RPC functions) |
| Video | HTML5 `<video>` + YouTube IFrame API |
| State | React hooks only (no Redux / Zustand) |
| Persistence | `localStorage` + Supabase |
| Deploy | Vercel |

---

## Project Structure

```
src/
├── App.tsx                     # Root component — orchestrates all state
├── main.tsx                    # Entry point
├── detached.tsx                # Standalone detached player window
├── index.css                   # Global styles + Tailwind directives
├── types.ts                    # Shared TypeScript interfaces
├── types/
│   ├── dom-extensions.d.ts     # DOM API typings not covered by lib.dom.d.ts
│   └── youtube.d.ts            # YouTube IFrame API type definitions
│
├── hooks/
│   ├── useVideoPlayer.ts       # Video state, subtitle parsing (SRT), markers
│   ├── useAudioTracks.ts       # Audio track CRUD, localStorage prefs, project import/export
│   ├── useCloudSync.ts         # Supabase: find/save community sync presets
│   ├── useTheme.ts             # Dark/light + accent color
│   └── useAnalytics.ts         # Local session analytics
│
├── components/
│   ├── VideoPlayer.tsx         # HTML5 video element + controls overlay
│   ├── YouTubePlayer.tsx       # YouTube IFrame API wrapper
│   ├── AudioGraphManager.tsx   # Web Audio API node graph (one instance per audio track)
│   ├── AudioTrackRow.tsx       # Per-track controls UI (EQ, offset, device, etc.)
│   ├── Sidebar.tsx             # Right-side control panel (desktop) / bottom (mobile)
│   ├── sidebar/
│   │   ├── SidebarHeader.tsx   # Logo, project save/load, theme, language
│   │   ├── VideoSettings.tsx   # Video source, volume, output device
│   │   ├── AudioSection.tsx    # Audio tracks list + add buttons
│   │   ├── MasterVolume.tsx    # Global volume slider
│   │   ├── SubtitleSettings.tsx# Subtitle file + offset + style
│   │   └── MarkerSection.tsx   # Timeline markers list
│   ├── WelcomeScreen.tsx       # First-run welcome overlay
│   ├── OnboardingTour.tsx      # Step-by-step interactive tour
│   ├── HelpPanel.tsx           # Slide-in help documentation panel
│   ├── UrlLoaderModal.tsx      # Modal for loading video/audio from URL
│   ├── StatisticsPanel.tsx     # Local analytics panel
│   ├── AdminPanel.tsx          # Supabase sync_presets moderation panel
│   ├── SubtitleOverlay.tsx     # Subtitle cue rendering, shared by local + YouTube players
│   ├── Snowfall.tsx            # Canvas-based seasonal snowfall effect
│   ├── Toast.tsx               # Toast notification system + useToast hook
│   ├── Button.tsx              # Reusable button component
│   ├── Logo.tsx                # App logo SVG
│   ├── LanguageSelector.tsx    # Language picker dropdown
│   └── ErrorBoundary.tsx       # React error boundary
│
├── utils/
│   ├── fileFingerprint.ts      # DJB2-based fingerprint IDs for video/audio files
│   ├── formatTime.ts           # Time formatting utilities
│   ├── getDeviceIcon.tsx       # Audio device type icon resolver
│   └── syncImportValidation.ts # Whitelist-based .sync import shape validation
│
├── lib/
│   └── supabase.ts             # Supabase client init + SyncPreset type
│
├── context/
│   └── I18nContext.tsx         # React context providing `t` (translation object)
│
├── i18n/
│   ├── types.ts                # Language union type + full Translations interface
│   ├── index.ts                # detectLanguage(), getSavedLanguage(), translations map
│   ├── en.ts                   # English strings
│   ├── tr.ts                   # Turkish strings
│   ├── az.ts                   # Azerbaijani strings
│   └── ru.ts                   # Russian strings
│
└── constants/
    └── eqPresets.ts            # EQ preset values (Flat, Cinema, Dialogue, etc.)
```

**Root-level extras:**
- `supabase/migrations/` — versioned SQL migrations for the Supabase RPC functions and RLS policies (see `supabase/README.md`)
- `api/` — Vercel serverless functions (Google Drive proxy)
- `vercel.json` — Vercel routing config
- `.env.local` — local env vars (not committed)

---

## Architecture & Data Flow

```
App.tsx
 ├── useVideoPlayer()        → video state (file, URL, currentTime, isPlaying, subtitles, markers)
 ├── useAudioTracks()        → audio track array + device list + project save/load
 ├── useTheme()              → dark/light + accent color
 ├── useAnalytics()          → local event tracking
 └── useCloudSync()          → Supabase preset lookup & sharing

Render tree:
 App
 ├── VideoPlayer / YouTubePlayer     (currentTime is the sync clock)
 ├── Sidebar
 │   ├── SidebarHeader
 │   ├── VideoSettings
 │   ├── MasterVolume
 │   ├── AudioSection
 │   │   └── AudioTrackRow × N
 │   │       └── AudioGraphManager   (one Web Audio API context per track)
 │   ├── SubtitleSettings
 │   └── MarkerSection
 ├── HelpPanel (overlay)
 ├── UrlLoaderModal (overlay)
 ├── StatisticsPanel (overlay)
 └── AdminPanel (overlay)
```

**Sync mechanism:** `VideoPlayer` fires `onTimeUpdate` → App updates `currentTime` → each `AudioTrackRow` receives `videoCurrentTime`, computes `targetTime = videoCurrentTime - track.offset`, and corrects `audioElement.currentTime` when drift exceeds a threshold.

---

## Key Components

### `AudioGraphManager.tsx`

A render-null React component (`return null`) that owns one `AudioContext` per `<audio>` element. It manages the DSP signal chain via `useEffect` hooks reacting to prop changes.

**Signal chain:**
```
MediaElementSource → LowShelf → PeakingMid → HighShelf → [DynamicsCompressor?] → GainNode → destination
```

**Key behaviors:**
- **Compressor toggle**: `eq.high.disconnect()` then reconnect either to the compressor or directly to the gain node. No parameter tricks — this is a true hardware bypass.
- **Device switching**: calls `AudioContext.setSinkId(deviceId)` (Chrome 110+). The `AudioContext` is **never destroyed or recreated** on device change.
- **Initialization**: runs exactly once when `audioElement` is first set. A `deviceIdRef` captures the initial device without making the init effect depend on `deviceId`.

### `VideoPlayer.tsx`

Wraps a native `<video>` element. Uses `ExtendedMediaElement` (custom type extending `HTMLMediaElement` with `setSinkId`) for the video's own audio output routing. Subtitle cues are rendered as absolutely-positioned overlay divs (not native `<track>`) to allow full CSS style control.

### `YouTubePlayer.tsx`

Loads the YouTube IFrame API script dynamically (once per app lifetime). Exposes `play/pause` and `seekTo` via the YT player object. `currentTime` is polled via `setInterval` (YouTube API does not push time updates) and lifted to App state.

Note: YouTube audio cannot be routed to a specific device — the IFrame API renders through the browser's default output only.

### `AdminPanel.tsx`

Hidden panel accessible via `Ctrl+Shift+A` (desktop) or `?admin=true` URL parameter (mobile). The URL param is stripped immediately via `window.history.replaceState`. Connects directly to Supabase to read and delete rows from `sync_presets`. Password-protected in the UI.

---

## Custom Hooks

### `useVideoPlayer`

**Owns:** `videoFile`, `videoObjectUrl`, `isPlaying`, `currentTime`, `duration`, `videoVolume`, `videoMuted`, `videoDeviceId`, `subtitleCues`, `subtitleOffset`, `markers`

**Exposes:** `loadVideo(file)`, `loadVideoFromUrl(url, filename)`, `togglePlay()`, `handleSeek(time)`, `loadSubtitles(file)`, `addMarker()`, `deleteMarker(id)`, `videoFingerprint`

`videoFingerprint` is computed on every render from `getVideoFingerprint(videoFile, videoObjectUrl)` — it does not trigger re-renders itself.

SRT parsing is synchronous via `FileReader.readAsText`. The parser splits on double-newline blocks and extracts timestamps with a regex.

### `useAudioTracks`

**Owns:** `audioTracks[]`, `audioDevices[]`, `permissionsGranted`, `masterVolume`

**localStorage key:** `synCinema_trackPrefs` — an object keyed by filename storing `{ offset, playbackRate, deviceId, eq, useCompressor, gainBoost }`. These prefs are automatically applied when a file with the same name is loaded again.

**Device enumeration:** requires microphone permission to get labeled device names. Calls `getUserMedia({ audio: true })`, stops the stream immediately, waits 300 ms (browser internal state update delay), then calls `enumerateDevices()`.

**Project file format (`.sync`):**
```json
{
  "version": "1.0",
  "exportDate": "2025-01-01T00:00:00.000Z",
  "trackPrefs": {
    "audio_en.mp3": { "offset": 1.5, "playbackRate": 1, "deviceId": "", "eq": { "low": 0, "mid": 0, "high": 0 }, "useCompressor": false, "gainBoost": 1 }
  },
  "appSettings": { "masterVolume": 1, "theme": "dark" }
}
```

### `useCloudSync`

Calls two Supabase RPC functions:
- `safe_insert_preset(p_video_id, p_audio_id, p_offset_ms)` — server-side rate limiting on insert
- `safe_increment_vote(p_row_id, p_voter_hash)` — server-side deduplication using a browser fingerprint hash

Client-side rate limit: 5-second cooldown enforced via `lastRequestTimeRef`.

Offset grouping: offsets within ±50 ms are treated as the same preset (rounded to nearest 100 ms).

### `useAnalytics`

All data stored in localStorage under `syncinema_analytics`. Tracks: `totalWatchTime` (seconds), `totalSessions`, `videosLoaded`, `audioTracksAdded`, `projectsSaved`, `projectsLoaded`, `subtitlesLoaded`, `markersAdded`, plus individual feature interaction counts.

### `useTheme`

localStorage keys: `synCinema_theme` (`'dark'` | `'light'`), `synCinema_accent` (hex color string). Applies a `dark` class to `<html>` and injects a `<style>` tag with CSS custom properties for the accent color so Tailwind utilities pick it up.

---

## Web Audio Pipeline

Each audio track gets exactly one `AudioContext`. The full signal chain:

```
<audio> element
    │
MediaElementAudioSourceNode
    │
BiquadFilterNode  (type: lowshelf,  freq: 320 Hz)          ← eq.low  (±dB)
    │
BiquadFilterNode  (type: peaking,   freq: 1000 Hz, Q: 0.5) ← eq.mid  (±dB)
    │
BiquadFilterNode  (type: highshelf, freq: 3200 Hz)         ← eq.high (±dB)
    │
    ├── [useCompressor = false] ──────────────────────────────────────────┐
    │                                                                     │
    └── [useCompressor = true] → DynamicsCompressorNode                  │
         threshold: -24 dB | knee: 30 | ratio: 12:1                      │
         attack: 3 ms      | release: 250 ms                             │
                                                │                        │
                                                └────────────────────────┤
                                                                         ▼
                                                                    GainNode    ← gainBoost (1.0 – 3.0×)
                                                                         │
                                                          AudioContext.destination
                                                          (routed via AudioContext.setSinkId)
```

**Compressor defaults (disabled state):** threshold=0, knee=0, ratio=1 — these values create a unity-gain passthrough, but we bypass the node entirely for cleaner audio. When enabled, the graph is rewired.

---

## Cloud Sync System

**Purpose:** Allow users to share the sync offset they discovered for a (video, audio) pair with the community.

**Flow:**
1. App detects both `videoFingerprint` and `audioFingerprint` (first audio track)
2. Queries Supabase `sync_presets` for the highest-voted preset for that pair
3. If found and offset differs by >100 ms from current: shows a toast with an "Apply" button
4. If found and offset matches current: silently marks the track as cloud-synced
5. If not found: nothing happens (no false positives)

**Supabase table: `sync_presets`**
```sql
id         uuid PRIMARY KEY DEFAULT gen_random_uuid()
video_id   text NOT NULL
audio_id   text NOT NULL
offset_ms  integer NOT NULL        -- milliseconds, capped at ±36,000,000 (10 hours)
votes      integer DEFAULT 1
created_at timestamptz DEFAULT now()
```

**RPC functions:**
- `safe_insert_preset` — inserts a new preset; server enforces rate limits per IP
- `safe_increment_vote` — increments votes; rejects if `voter_hash` already voted for this row

**Trust system:** `votes > 1` → trusted (info toast). `votes == 1` → unverified (warning toast). The toast always shows vote count and trust label.

**Browser fingerprint for vote dedup:**
```ts
btoa(encodeURIComponent(
  `${navigator.userAgent}_${screen.width}x${screen.height}_${navigator.language}_${new Date().getTimezoneOffset()}`
)).substring(0, 64)
```

---

## File Fingerprinting

`src/utils/fileFingerprint.ts`

Fingerprints uniquely identify media without reading file content (no byte-level hashing — fast and synchronous).

| Source | Format | Example |
|---|---|---|
| Local file | `local_<size>_<djb2hash(name+size+mtime)>` | `local_52428800_1k3m9z` |
| YouTube | `yt_<11-char-videoId>` | `yt_dQw4w9WgXcQ` |
| Google Drive | `gdrive_<fileId>` | `gdrive_1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs` |
| Other URL | `url_<base64(hostname+pathname)>` | `url_ZXhhbXBsZS5jb20vdmlkZW8ubXA0` |

DJB2 hash (fast, good distribution, 32-bit integer):
```ts
let hash = 5381;
for (let i = 0; i < str.length; i++) {
  hash = ((hash << 5) + hash) + str.charCodeAt(i);
  hash = hash & hash; // keep 32-bit
}
return Math.abs(hash).toString(36);
```

---

## Internationalization

**Supported languages:** English (`en`), Turkish (`tr`), Azerbaijani (`az`), Russian (`ru`)

**Detection order:** localStorage `syncinema_language` → `navigator.language` prefix match → fallback `en`

**Usage in components:**
```tsx
const { t } = useI18n();
// t is fully typed as Translations (src/i18n/types.ts)
<p>{t.sidebar.audioTracks}</p>
<p>{t.cloudSyncMessages.foundMessage.replace('{seconds}', '1.500')}</p>
```

**Adding a new language:**
1. Create `src/i18n/xx.ts` implementing the full `Translations` interface from `types.ts`
2. Add `'xx'` to the `Language` union in `types.ts`
3. Add an entry to `LANGUAGES` array and `translations` map in `index.ts`

---

## Persistence & State

| Data | Storage | Key |
|---|---|---|
| Track prefs (offset, EQ, device, etc.) | `localStorage` | `synCinema_trackPrefs` |
| Theme (dark/light) | `localStorage` | `synCinema_theme` |
| Accent color | `localStorage` | `synCinema_accent` |
| Language | `localStorage` | `syncinema_language` |
| Analytics | `localStorage` | `syncinema_analytics` |
| Welcome screen seen this session | `sessionStorage` | `syncinema_welcome_seen` |
| Onboarding tour done this session | `sessionStorage` | `syncinema_tour_completed` |
| Community sync offsets | Supabase | `sync_presets` table |
| Full project settings | `.sync` file (user download) | — |

---

## Environment Variables

Create `.env.local` in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

Both are optional. If absent, the Supabase client is `null` and all Cloud Sync features silently no-op. The app is fully functional without them.

---

## Getting Started

**Prerequisites:** Node.js v18+

```bash
# Install dependencies
npm install

# Start dev server (http://localhost:3000)
npm run dev

# Production build
npm run build

# Preview production build
npm run preview
```

---

## Keyboard Shortcuts

| Key | Action |
|---|---|
| `Space` / `K` | Play / Pause |
| `←` / `→` | Seek ±5 seconds |
| `J` | Rewind + slow down |
| `L` | Fast forward + speed up |
| `↑` / `↓` | Volume ±10% |
| `M` | Mute / Unmute video |
| `F` | Toggle fullscreen |
| `0`–`9` | Jump to 0%–90% of duration |
| `Home` / `End` | Jump to start / end |
| `Esc` | Exit fullscreen / Close panels |
| `Enter` | Dismiss welcome screen |
| `Ctrl+Shift+A` | Toggle Admin Panel |

---

## Design Decisions & Gotchas

**AudioContext is never destroyed on device switch.** Early versions destroyed and recreated the context on device change, causing audio glitches and desync. Now `AudioContext.setSinkId(deviceId)` is called on the existing context while the graph stays intact. The init effect uses a `deviceIdRef` to read the initial device without declaring it as a dependency (which would cause the effect to re-run on every device change).

**Compressor bypass rewires the graph.** Setting `ratio=1` and `threshold=0` technically passes audio through, but the DynamicsCompressorNode still applies subtle gain reduction. The correct approach is to `disconnect()` the high-shelf filter from the compressor and connect it directly to the gain node instead.

**Mobile onboarding is skipped.** The tour uses `data-tour` attributes as step anchors. The sidebar layout on mobile (horizontal scrolling bottom bar) differs fundamentally from desktop (fixed right sidebar), so tour steps cannot target the same elements. `window.innerWidth < 1024` (Tailwind `lg` breakpoint) gates the tour.

**YouTube audio cannot be device-routed.** The YouTube IFrame API renders audio through the browser's own default output. `setSinkId` is only applicable to `AudioContext` and `HTMLMediaElement`; neither is accessible for IFrame content.

**Bookmarklet security.** The `?video=` URL parameter is validated with `/^https?:\/\//i` before use. `javascript:`, `data:`, `file:`, and other schemes are rejected with a `console.warn`.

**Track prefs keyed by filename.** Two different files with the same filename share prefs. This is intentional — the dominant use case is reloading the same audio file across sessions.

**Object URL memory management.** `URL.revokeObjectURL()` is called in `deleteAudioTrack` and before replacing a video URL in `loadVideo`. Audio tracks loaded from remote URLs (Google Drive, Dropbox, etc.) are not object URLs and are not revoked.

**Subtitle rendering via divs.** Native `<track>` elements were abandoned because they don't support arbitrary CSS styling (background color, custom fonts, shadow). Subtitle cues are rendered as React elements positioned absolutely over the video.

**Seasonal snowfall is gated inline.** A short IIFE in the JSX checks the current month and day: `(m === 11 && d >= 20) || (m === 0 && d <= 10)` (Dec 20 – Jan 10). The `<Snowfall>` component is not mounted outside that window.

---

## License

This project is under a **Proprietary License**.

| Permission | Status |
|---|---|
| Source code viewing (educational) | Allowed |
| Personal, non-commercial use | Allowed |
| Commercial use | Requires permission |
| Modifications | Requires permission |

See [LICENSE](LICENSE) for full details.

---

<div align="center">

**Author:** Ruslan Aliyev · [GitHub @RuslanAeff](https://github.com/RuslanAeff)

*For movie lovers everywhere*

</div>
