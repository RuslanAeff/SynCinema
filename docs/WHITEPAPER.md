# SynCinema Technical Whitepaper

## Multi-Device Audio Routing and Synchronization for Web-Based Video Playback

**Version:** 1.0  
**Date:** January 2026  
**Author:** Ruslan Aliyev  
**Contact:** [GitHub](https://github.com/RuslanAeff/SynCinema)

---

## Executive Summary

SynCinema is an open-source, browser-based application that enables users to route multiple audio tracks to different output devices while maintaining synchronization with video playback. Built entirely on W3C web standards, SynCinema addresses a growing need for personalized audio experiences in shared viewing environments.

**Key Innovation:** Client-side multi-audio routing using standard Web APIs, eliminating the need for proprietary hardware or server infrastructure.

**Primary Use Cases:**
- 🎬 Multi-language family viewing (each viewer hears their preferred language)
- ♿ Accessibility (audio descriptions on personal devices)
- 🎭 Silent cinema events (audio distributed to attendees' headphones)
- 🎓 Language learning (original + dubbed audio comparison)

---

## 1. Problem Statement

### 1.1 The Shared Viewing Dilemma

In multi-viewer environments (families, classrooms, cinemas), a fundamental conflict exists: **one video source, multiple audio preferences**. Current solutions require:

- Expensive proprietary hardware (Sonos, specialized cinema equipment)
- Server-side streaming infrastructure
- Platform-specific applications

### 1.2 Market Gap

No existing solution provides:
- ✅ Zero-cost entry (browser-only, no hardware)
- ✅ Cross-platform compatibility (any device with a modern browser)
- ✅ User-controlled audio routing (not service-provider controlled)
- ✅ Offline capability (no internet required after initial load)

---

## 2. Technical Architecture

### 2.1 Technology Stack

| Layer | Technology | Standard/Source |
|-------|------------|-----------------|
| Audio Processing | Web Audio API | W3C Recommendation |
| Device Routing | Audio Output Devices API | W3C Working Draft (2015) |
| Media Playback | HTML5 Video/Audio | WHATWG Living Standard |
| UI Framework | React 18 | MIT License |
| Build System | Vite | MIT License |

### 2.2 Core Components

```
┌─────────────────────────────────────────────────────────┐
│                    SynCinema Architecture               │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐ │
│  │   Video     │    │   Audio     │    │   Audio     │ │
│  │   Source    │    │   Track 1   │    │   Track 2   │ │
│  │   (MP4)     │    │   (MP3)     │    │   (WAV)     │ │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘ │
│         │                  │                  │         │
│         ▼                  ▼                  ▼         │
│  ┌─────────────────────────────────────────────────────┐│
│  │              AudioContext (Web Audio API)           ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐              ││
│  │  │ Source  │  │ Source  │  │ Source  │              ││
│  │  │  Node   │  │  Node   │  │  Node   │              ││
│  │  └────┬────┘  └────┬────┘  └────┬────┘              ││
│  │       │            │            │                    ││
│  │       ▼            ▼            ▼                    ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐              ││
│  │  │  Gain   │  │  Gain   │  │  Gain   │              ││
│  │  │  Node   │  │  Node   │  │  Node   │              ││
│  │  └────┬────┘  └────┬────┘  └────┬────┘              ││
│  │       │            │            │                    ││
│  │       ▼            ▼            ▼                    ││
│  │  ┌─────────┐  ┌─────────┐  ┌─────────┐              ││
│  │  │Biquad   │  │Biquad   │  │Biquad   │  (3-Band EQ)││
│  │  │ Filter  │  │ Filter  │  │ Filter  │              ││
│  │  └────┬────┘  └────┬────┘  └────┬────┘              ││
│  └───────┼────────────┼────────────┼───────────────────┘│
│          │            │            │                    │
│          ▼            ▼            ▼                    │
│  ┌───────────┐  ┌───────────┐  ┌───────────┐           │
│  │  Device A │  │  Device B │  │  Device C │           │
│  │ (Speakers)│  │(Headphones)│ │(Bluetooth)│           │
│  └───────────┘  └───────────┘  └───────────┘           │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Audio Routing Implementation

SynCinema utilizes the `HTMLMediaElement.setSinkId()` method, standardized by W3C:

```javascript
// Standard W3C API usage
const audioElement = document.createElement('audio');
audioElement.src = 'audio-track.mp3';

// Route to specific device
const deviceId = 'abc123-device-id';
await audioElement.setSinkId(deviceId);
```

**Standards Reference:**
- W3C Audio Output Devices API: https://www.w3.org/TR/audio-output/
- First Working Draft: February 10, 2015
- Browser Support: Chrome 49+, Edge 79+, Firefox (flag), Safari (partial)

### 2.4 Synchronization Mechanism

SynCinema employs a **user-controlled synchronization** model:

```javascript
// Manual offset adjustment (user-controlled)
function applyOffset(audioElement, offsetMs) {
    const videoTime = videoElement.currentTime;
    audioElement.currentTime = videoTime + (offsetMs / 1000);
}
```

**Key Design Decision:** Manual synchronization was chosen over automatic drift correction to:
1. Reduce computational overhead
2. Give users precise control
3. Avoid patent-encumbered automatic sync algorithms

---

## 3. Prior Art and Open Standards

### 3.1 Foundational Technologies

SynCinema builds upon established open-source projects and web standards:

| Technology | Year | Relevance |
|------------|------|-----------|
| **Popcorn.js** (Mozilla) | 2011 | Video-synchronized media events |
| **Video.js** | 2010 | HTML5 video player framework |
| **Web Audio API** | 2011 | Audio processing standard |
| **Audio Output Devices API** | 2015 | Device routing capability |

### 3.2 W3C Standards Timeline

```
2011 ─── Web Audio API draft published
         │
2015 ─── Audio Output Devices API first working draft
         │ - setSinkId() method defined
         │ - enumerateDevices() for device listing
         │
2016 ─── Chrome 49 implements setSinkId()
         │
2020 ─── Widespread browser support
         │
2026 ─── SynCinema utilizes mature standards
```

### 3.3 Open Source References

```
Popcorn.js: https://github.com/mozilla/popcorn-js
Video.js: https://github.com/videojs/video.js
Web Audio API Examples: https://github.com/mdn/webaudio-examples
```

---

## 4. Differentiating Features

### 4.1 Client-Side Architecture

Unlike server-dependent solutions, SynCinema processes all audio locally:

| Aspect | SynCinema | Traditional Solutions |
|--------|-----------|----------------------|
| Server Required | ❌ No | ✅ Yes |
| Internet Required | ❌ No (after load) | ✅ Yes |
| User Data Sent | ❌ None | ✅ Streaming data |
| Latency | ~10ms | 100-500ms |
| Cost | Free | Subscription/Hardware |

### 4.2 Per-Track Audio Processing

Each audio track has independent:
- **Volume control** (0-100%)
- **3-band EQ** (Low/Mid/High, ±12dB)
- **Playback rate** (0.5x - 2.0x)
- **Offset adjustment** (±10 seconds)
- **Device routing** (any connected audio device)

### 4.3 Project Persistence

Users can save and load complete project configurations:

```json
{
  "version": "2.0",
  "videoFile": "movie.mp4",
  "audioTracks": [
    {
      "id": "track-1",
      "file": "english.mp3",
      "deviceId": "speakers-123",
      "volume": 0.8,
      "offset": 0.2,
      "eq": { "low": 2, "mid": 0, "high": -1 }
    },
    {
      "id": "track-2", 
      "file": "spanish.mp3",
      "deviceId": "headphones-456",
      "volume": 1.0,
      "offset": 0.15,
      "eq": { "low": 0, "mid": 0, "high": 0 }
    }
  ]
}
```

---

## 5. Use Case Scenarios

### 5.1 Multi-Language Family Viewing

**Scenario:** A family watches a movie together. Father prefers Turkish audio, mother prefers English, child prefers German.

**Solution:**
1. Load video file
2. Add Turkish audio → route to TV speakers
3. Add English audio → route to Bluetooth headphones (mother)
4. Add German audio → route to wired headphones (child)
5. Adjust individual offsets for lip-sync

### 5.2 Accessibility Enhancement

**Scenario:** A visually impaired viewer needs audio description alongside the main audio.

**Solution:**
1. Load video with original audio
2. Add audio description track → route to personal earpiece
3. Main audio plays through room speakers
4. Viewer hears both: room ambiance + personal description

### 5.3 Educational Audio Comparison

**Scenario:** Language student wants to compare original and dubbed versions.

**Solution:**
1. Load video
2. Add original language audio (left ear)
3. Add target language dub (right ear)
4. Student can compare pronunciation in real-time

---

## 6. Technical Limitations

### 6.1 Browser Compatibility

| Browser | setSinkId Support | Notes |
|---------|-------------------|-------|
| Chrome | ✅ Full | Since v49 |
| Edge | ✅ Full | Since v79 |
| Firefox | ⚠️ Flag | Experimental |
| Safari | ⚠️ Partial | WebKit limitations |

### 6.2 Hardware Constraints

- Maximum simultaneous devices: Limited by OS audio subsystem
- Bluetooth latency: 40-200ms (device-dependent)
- USB audio latency: 5-20ms
- Clock drift between devices: Requires periodic manual adjustment

### 6.3 Intentional Exclusions

The following features are **intentionally not implemented**:

| Feature | Reason |
|---------|--------|
| Automatic sync algorithms | Patent considerations |
| Network audio streaming | Scope limitation |
| DRM content support | Legal complexity |
| Audio fingerprinting | Privacy concerns |

---

## 7. Roadmap

### Phase 1: Current Release ✅
- Local file playback
- Multi-device routing
- Manual synchronization
- Project save/load

### Phase 2: Planned
- YouTube URL support (via embedding)
- Subtitle synchronization
- Improved mobile experience

### Phase 3: Future Consideration
- WebRTC peer-to-peer audio sharing
- Cloud project storage
- API for third-party integration

---

## 8. License and Open Source

SynCinema is released under the **MIT License**, allowing:
- ✅ Commercial use
- ✅ Modification
- ✅ Distribution
- ✅ Private use

**Repository:** https://github.com/RuslanAeff/SynCinema

---

## 9. Conclusion

SynCinema demonstrates that sophisticated multi-audio experiences can be delivered through standard web technologies without proprietary infrastructure. By leveraging W3C standards established since 2015, the project provides a foundation for accessible, cross-platform audio personalization.

The intentional use of **manual user controls** rather than automatic algorithms ensures both user empowerment and freedom from patent-encumbered methodologies.

---

## References

1. W3C Web Audio API Specification: https://www.w3.org/TR/webaudio/
2. W3C Audio Output Devices API: https://www.w3.org/TR/audio-output/
3. MDN Web Docs - Web Audio API: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
4. Mozilla Popcorn.js (Archive): https://github.com/mozilla/popcorn-js
5. WHATWG HTML Living Standard: https://html.spec.whatwg.org/

---

**Document Version History:**
| Version | Date | Changes |
|---------|------|---------|
| 1.0 | January 2026 | Initial release |

---

*This document is provided for informational purposes and establishes the technical foundation and prior art basis of the SynCinema project.*
