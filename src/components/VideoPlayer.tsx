/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Video Player Component
 *  @author Ruslan Aliyev
 *  Full-featured video player with detach mode and subtitle overlay
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Film, Maximize, Minimize, Volume2, Expand, Shrink, PictureInPicture2, Sun } from 'lucide-react';
import { formatTime } from '../utils/formatTime';
import { Translations } from '../i18n';
import { useI18n } from '../context/I18nContext';
import { SubtitleStyle } from '../types';

interface VideoPlayerProps {
    videoFile: File | null;
    videoObjectUrl: string | null;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    videoRef: React.RefObject<HTMLVideoElement | null>;
    togglePlay: () => void;
    handleSeek: (time: number) => void;
    setIsPlaying: (playing: boolean) => void;
    setCurrentTime: (time: number) => void;
    setDuration: (duration: number) => void;
    subtitleCues?: { id: string, startTime: number, endTime: number, text: string }[];
    subtitleOffset?: number;
    subtitleStyle?: SubtitleStyle;
    onTrackEvent?: (event: string) => void;
    onTrackWatchTime?: (seconds: number) => void;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
    videoFile,
    videoObjectUrl,
    isPlaying,
    currentTime,
    duration,
    videoRef,
    togglePlay,
    handleSeek,
    setIsPlaying,
    setCurrentTime,
    setDuration,
    subtitleCues = [],
    subtitleOffset = 0,
    subtitleStyle,
    onTrackEvent,
    onTrackWatchTime,
}) => {
    const { t } = useI18n();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    // Video scaling: 'contain' keeps full frame (letterbox), 'cover' fills the screen (crops edges).
    // Default to 'cover' on touch devices so ultra-wide phones aren't letterboxed out of the box.
    const [fillMode, setFillMode] = useState<'contain' | 'cover'>(
        () => (typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches ? 'cover' : 'contain')
    );
    const [isPiPActive, setIsPiPActive] = useState(false);
    // Software brightness (CSS filter on the video) — adjustable via left-edge vertical swipe
    const [brightness, setBrightness] = useState(1);
    // Orientation + input type drive the immersive (overlay-controls) layout and swipe gestures
    const [isLandscape, setIsLandscape] = useState(false);
    const [isTouchDevice, setIsTouchDevice] = useState(false);
    // Transient on-screen indicator for touch gestures (brightness / volume / seek feedback)
    const [gestureHint, setGestureHint] = useState<{ icon: 'vol' | 'bright' | 'fwd' | 'rwd'; value: string } | null>(null);
    const gestureHintTimeoutRef = useRef<number | null>(null);
    const controlsTimeoutRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    // Immersive = real fullscreen, or a touch device held in landscape.
    // In this mode controls overlay the video (so it fills the screen) and swipe gestures are active.
    const isImmersive = isFullscreen || (isTouchDevice && isLandscape);

    // Touch gesture tracking (double-tap seek, vertical-swipe brightness/volume, single-tap controls)
    const touchStateRef = useRef({ startX: 0, startY: 0, startTime: 0, startVolume: 1, startBrightness: 1, side: 'right' as 'left' | 'right', isVerticalSwipe: false, moved: false });
    const lastTapRef = useRef<{ time: number; x: number }>({ time: 0, x: 0 });
    const lastTouchEndRef = useRef<number>(0);
    const singleTapTimeoutRef = useRef<number | null>(null);
    const syncChannelRef = useRef<BroadcastChannel | null>(null);
    const sessionTokenRef = useRef<string>('');

    // Progress bar hover preview
    const [hoverTime, setHoverTime] = useState<number | null>(null);
    const [hoverPosition, setHoverPosition] = useState<number>(0);
    const [previewImage, setPreviewImage] = useState<string | null>(null);
    const previewVideoRef = useRef<HTMLVideoElement>(null);
    const previewCanvasRef = useRef<HTMLCanvasElement>(null);
    const progressBarRef = useRef<HTMLDivElement>(null);

    // Refs to hold current state for BroadcastChannel handler (avoids stale closures)
    const stateRef = useRef({
        videoObjectUrl,
        currentTime,
        isPlaying,
        duration,
        subtitleCues,
        subtitleOffset,
        subtitleStyle
    });

    // Keep refs updated
    useEffect(() => {
        stateRef.current = {
            videoObjectUrl,
            currentTime,
            isPlaying,
            duration,
            subtitleCues,
            subtitleOffset,
            subtitleStyle
        };
    }, [videoObjectUrl, currentTime, isPlaying, duration, subtitleCues, subtitleOffset, subtitleStyle]);

    // Track watch time when video is playing
    useEffect(() => {
        if (!isPlaying || !onTrackWatchTime) return;

        const interval = setInterval(() => {
            onTrackWatchTime(1); // Track 1 second of watch time
        }, 1000);

        return () => clearInterval(interval);
    }, [isPlaying, onTrackWatchTime]);

    // Initialize BroadcastChannel for detached player sync (runs once)
    useEffect(() => {
        // Generate a unique session token for secure BroadcastChannel communication
        const sessionToken = crypto.randomUUID();
        sessionTokenRef.current = sessionToken;

        const channel = new BroadcastChannel('syncinema-player-sync');
        syncChannelRef.current = channel;

        // Listen for messages from detached window
        channel.onmessage = (event: MessageEvent) => {
            const { type, payload, token } = event.data;

            // Reject messages without a valid session token
            if (token !== sessionTokenRef.current) return;

            const state = stateRef.current; // Always get fresh state from ref

            switch (type) {
                case 'DETACHED_READY':
                    // Detached window is ready - send current state
                    console.log('[Main] Detached window connected, sending state:', {
                        hasVideo: !!state.videoObjectUrl,
                        isPlaying: state.isPlaying,
                        currentTime: state.currentTime
                    });
                    if (state.videoObjectUrl) {
                        channel.postMessage({ type: 'SYNC_VIDEO_URL', payload: state.videoObjectUrl, token: sessionToken, timestamp: Date.now() });
                    }
                    channel.postMessage({
                        type: 'SYNC_STATE',
                        payload: { currentTime: state.currentTime, isPlaying: state.isPlaying, duration: state.duration },
                        token: sessionToken,
                        timestamp: Date.now()
                    });
                    if (state.subtitleCues.length > 0) {
                        channel.postMessage({
                            type: 'SYNC_SUBTITLES',
                            payload: { cues: state.subtitleCues, offset: state.subtitleOffset, style: state.subtitleStyle },
                            token: sessionToken,
                            timestamp: Date.now()
                        });
                    }
                    break;
                case 'DETACHED_PLAY':
                    if (!state.isPlaying) togglePlay();
                    break;
                case 'DETACHED_PAUSE':
                    if (state.isPlaying) togglePlay();
                    break;
                case 'DETACHED_SEEK':
                    handleSeek(payload);
                    break;
            }
        };

        return () => {
            channel.close();
        };
    }, [togglePlay, handleSeek]); // Only stable function references

    // Broadcast video URL when it changes
    useEffect(() => {
        if (syncChannelRef.current && videoObjectUrl) {
            syncChannelRef.current.postMessage({
                type: 'SYNC_VIDEO_URL',
                payload: videoObjectUrl,
                token: sessionTokenRef.current,
                timestamp: Date.now()
            });
        }
    }, [videoObjectUrl]);

    // Broadcast play/pause state
    useEffect(() => {
        if (syncChannelRef.current) {
            syncChannelRef.current.postMessage({
                type: isPlaying ? 'SYNC_PLAY' : 'SYNC_PAUSE',
                token: sessionTokenRef.current,
                timestamp: Date.now()
            });
        }
    }, [isPlaying]);

    // Broadcast subtitles (including style, so the detached window reflects live changes)
    useEffect(() => {
        if (syncChannelRef.current && subtitleCues.length > 0) {
            syncChannelRef.current.postMessage({
                type: 'SYNC_SUBTITLES',
                payload: { cues: subtitleCues, offset: subtitleOffset, style: subtitleStyle },
                token: sessionTokenRef.current,
                timestamp: Date.now()
            });
        }
    }, [subtitleCues, subtitleOffset, subtitleStyle]);

    // Broadcast seek periodically (for time sync)
    useEffect(() => {
        if (syncChannelRef.current && isPlaying) {
            const interval = setInterval(() => {
                syncChannelRef.current?.postMessage({
                    type: 'SYNC_STATE',
                    payload: { currentTime, isPlaying, duration },
                    token: sessionTokenRef.current,
                    timestamp: Date.now()
                });
            }, 2000); // Sync every 2 seconds
            return () => clearInterval(interval);
        }
    }, [currentTime, isPlaying, duration]);

    // Open detached window - pass session token via URL
    const openDetachedWindow = useCallback(() => {
        window.open(`/detached.html?token=${sessionTokenRef.current}`, 'SynCinema_Detached', 'width=960,height=600,resizable=yes');
    }, []);



    const handleUserActivity = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
        // Only auto-hide while actually playing — keep controls reachable when paused.
        // 5s of no interaction → slide the panel away (stable, consistent everywhere).
        if (isPlaying) {
            controlsTimeoutRef.current = window.setTimeout(() => setShowControls(false), 5000);
        }
    }, [isPlaying]);

    // Desktop mouse movement reveals the controls; ignore the synthetic mousemove a touch
    // tap emits right after touchend, otherwise it fights the single-tap show/hide toggle.
    const handleMouseMove = useCallback(() => {
        if (Date.now() - lastTouchEndRef.current < 800) return;
        handleUserActivity();
    }, [handleUserActivity]);

    useEffect(() => {
        if (isPlaying) handleUserActivity();
        else {
            setShowControls(true);
            if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
        }
        return () => { if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current); };
    }, [isPlaying, isImmersive, handleUserActivity]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
            setShowControls(true);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Track orientation + pointer type to decide when to switch to the immersive (overlay) layout
    useEffect(() => {
        if (typeof window === 'undefined' || !window.matchMedia) return;
        const mqLandscape = window.matchMedia('(orientation: landscape)');
        const mqCoarse = window.matchMedia('(pointer: coarse)');
        const update = () => {
            setIsLandscape(mqLandscape.matches);
            setIsTouchDevice(mqCoarse.matches);
        };
        update();
        mqLandscape.addEventListener('change', update);
        mqCoarse.addEventListener('change', update);
        return () => {
            mqLandscape.removeEventListener('change', update);
            mqCoarse.removeEventListener('change', update);
        };
    }, []);

    const toggleFullscreen = useCallback(async () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            try {
                await containerRef.current.requestFullscreen();
                // On mobile, lock to landscape for a proper cinema view (no-op/throws on desktop)
                const orientation = screen.orientation as (ScreenOrientation & { lock?: (o: string) => Promise<void> }) | undefined;
                if (orientation?.lock) {
                    orientation.lock('landscape').catch(() => { /* unsupported on desktop — ignore */ });
                }
            } catch (err) { console.error(err); }
        } else {
            try { screen.orientation?.unlock?.(); } catch { /* ignore */ }
            if (document.exitFullscreen) await document.exitFullscreen();
        }
    }, []);

    // Native Picture-in-Picture toggle
    const togglePiP = useCallback(async () => {
        const video = videoRef.current;
        if (!video) return;
        try {
            if (document.pictureInPictureElement) {
                await document.exitPictureInPicture();
            } else if (document.pictureInPictureEnabled) {
                await video.requestPictureInPicture();
            }
        } catch (err) {
            console.error('[PiP] Failed to toggle Picture-in-Picture:', err);
        }
    }, [videoRef]);

    // Keep PiP button state in sync with the browser
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;
        const onEnter = () => setIsPiPActive(true);
        const onLeave = () => setIsPiPActive(false);
        video.addEventListener('enterpictureinpicture', onEnter);
        video.addEventListener('leavepictureinpicture', onLeave);
        return () => {
            video.removeEventListener('enterpictureinpicture', onEnter);
            video.removeEventListener('leavepictureinpicture', onLeave);
        };
    }, [videoRef, videoObjectUrl]);

    // Clean up gesture timers on unmount (VideoPlayer unmounts when switching to YouTube)
    useEffect(() => {
        return () => {
            if (singleTapTimeoutRef.current) window.clearTimeout(singleTapTimeoutRef.current);
            if (gestureHintTimeoutRef.current) window.clearTimeout(gestureHintTimeoutRef.current);
        };
    }, []);

    // Show a brief on-screen gesture hint (volume / seek), then fade out
    const flashGestureHint = useCallback((icon: 'vol' | 'bright' | 'fwd' | 'rwd', value: string) => {
        setGestureHint({ icon, value });
        if (gestureHintTimeoutRef.current) window.clearTimeout(gestureHintTimeoutRef.current);
        gestureHintTimeoutRef.current = window.setTimeout(() => setGestureHint(null), 700);
    }, []);

    // ─── Touch gesture handlers (mobile) ───────────────────────────────────
    const handleTouchStart = useCallback((e: React.TouchEvent) => {
        if (e.touches.length !== 1) return;
        const touch = e.touches[0];
        const rect = containerRef.current?.getBoundingClientRect();
        const width = rect?.width || window.innerWidth;
        const relX = touch.clientX - (rect?.left ?? 0);
        touchStateRef.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            startTime: Date.now(),
            startVolume: videoRef.current?.volume ?? 1,
            startBrightness: brightness,
            // Which half the swipe began in: left = brightness, right = volume
            side: relX < width / 2 ? 'left' : 'right',
            isVerticalSwipe: false,
            moved: false,
        };
    }, [videoRef, brightness]);

    const handleTouchMove = useCallback((e: React.TouchEvent) => {
        if (e.touches.length !== 1) return;
        // Brightness/volume swipes only in the immersive cinema layout — keep normal page scroll in portrait
        if (!isImmersive) return;
        const touch = e.touches[0];
        const state = touchStateRef.current;
        const dx = touch.clientX - state.startX;
        const dy = touch.clientY - state.startY;

        if (Math.abs(dx) > 8 || Math.abs(dy) > 8) state.moved = true;

        // Lock into a vertical-swipe gesture once it's clearly vertical
        if (!state.isVerticalSwipe && Math.abs(dy) > 24 && Math.abs(dy) > Math.abs(dx) * 1.5) {
            state.isVerticalSwipe = true;
        }

        if (state.isVerticalSwipe) {
            const rect = containerRef.current?.getBoundingClientRect();
            const height = rect?.height || window.innerHeight;
            const delta = -dy / height; // swipe up = increase
            if (state.side === 'left') {
                // Left half → screen brightness (software, via CSS filter on the video)
                const next = Math.max(0.2, Math.min(1.5, state.startBrightness + delta * 1.3));
                setBrightness(next);
                flashGestureHint('bright', `${Math.round(next * 100)}%`);
            } else if (videoRef.current) {
                // Right half → volume
                const next = Math.max(0, Math.min(1, state.startVolume + delta));
                videoRef.current.volume = next;
                flashGestureHint('vol', `${Math.round(next * 100)}%`);
            }
        }
    }, [isImmersive, videoRef, flashGestureHint]);

    const handleTouchEnd = useCallback((e: React.TouchEvent) => {
        const state = touchStateRef.current;
        const video = videoRef.current;
        // Mark the moment a touch ended so the synthetic mouse-click that follows can be ignored
        lastTouchEndRef.current = Date.now();

        // A vertical brightness/volume swipe consumes the gesture — no tap handling
        if (state.isVerticalSwipe) return;
        if (state.moved) return; // a horizontal drag / scroll, not a tap

        const now = Date.now();
        const tapX = e.changedTouches[0]?.clientX ?? state.startX;
        const rect = containerRef.current?.getBoundingClientRect();
        const width = rect?.width || window.innerWidth;
        const relativeX = tapX - (rect?.left ?? 0);

        const DOUBLE_TAP_MS = 300;
        const isDoubleTap = now - lastTapRef.current.time < DOUBLE_TAP_MS;

        if (isDoubleTap) {
            // Cancel any pending single-tap action
            if (singleTapTimeoutRef.current) {
                window.clearTimeout(singleTapTimeoutRef.current);
                singleTapTimeoutRef.current = null;
            }
            lastTapRef.current = { time: 0, x: 0 };

            if (!video) return;
            const third = width / 3;
            if (relativeX < third) {
                // Left third → rewind 10s
                video.currentTime = Math.max(0, video.currentTime - 10);
                setCurrentTime(video.currentTime);
                flashGestureHint('rwd', '-10s');
                onTrackEvent?.('seekCount');
            } else if (relativeX > third * 2) {
                // Right third → forward 10s
                video.currentTime = Math.min(video.duration || Infinity, video.currentTime + 10);
                setCurrentTime(video.currentTime);
                flashGestureHint('fwd', '+10s');
                onTrackEvent?.('seekCount');
            } else {
                // Center → play/pause
                togglePlay();
                onTrackEvent?.('playPauseCount');
            }
        } else {
            // Defer single tap so a follow-up tap can upgrade it to a double tap
            lastTapRef.current = { time: now, x: tapX };
            if (singleTapTimeoutRef.current) window.clearTimeout(singleTapTimeoutRef.current);
            singleTapTimeoutRef.current = window.setTimeout(() => {
                singleTapTimeoutRef.current = null;
                if (isImmersive) {
                    // Immersive: single tap toggles the control overlay (and restarts the 5s auto-hide when revealed)
                    setShowControls(prev => {
                        const next = !prev;
                        if (next && isPlaying) {
                            if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
                            controlsTimeoutRef.current = window.setTimeout(() => setShowControls(false), 5000);
                        }
                        return next;
                    });
                } else {
                    // Inline (portrait): single tap plays/pauses, like a simple embedded player
                    togglePlay();
                    onTrackEvent?.('playPauseCount');
                }
            }, DOUBLE_TAP_MS);
        }
    }, [isImmersive, isPlaying, videoRef, togglePlay, setCurrentTime, onTrackEvent, flashGestureHint]);

    // Keyboard Shortcuts (Pro Workflow)
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            // Ignore when typing in inputs
            if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) return;

            const video = videoRef.current;
            if (!video && !['Space', 'KeyK'].includes(e.code)) return;

            switch (e.code) {
                // Play/Pause
                case 'Space':
                case 'KeyK':
                    e.preventDefault();
                    togglePlay();
                    onTrackEvent?.('playPauseCount');
                    break;

                // Seek 5 seconds
                case 'ArrowLeft':
                    e.preventDefault();
                    if (video) {
                        video.currentTime = Math.max(0, video.currentTime - 5);
                        setCurrentTime(video.currentTime);
                        onTrackEvent?.('seekCount');
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (video) {
                        video.currentTime = Math.min(video.duration, video.currentTime + 5);
                        setCurrentTime(video.currentTime);
                        onTrackEvent?.('seekCount');
                    }
                    break;

                // J-K-L Playback (Pro editing style)
                case 'KeyJ':
                    e.preventDefault();
                    if (video) {
                        // Rewind: decrease playback rate or seek back
                        if (video.playbackRate > 0) {
                            video.playbackRate = Math.max(0.25, video.playbackRate - 0.5);
                        }
                        video.currentTime = Math.max(0, video.currentTime - 2);
                    }
                    break;
                case 'KeyL':
                    e.preventDefault();
                    if (video) {
                        // Fast forward: increase playback rate or seek forward
                        if (video.paused) {
                            video.play();
                        }
                        video.playbackRate = Math.min(4, video.playbackRate + 0.5);
                        video.currentTime = Math.min(video.duration, video.currentTime + 2);
                    }
                    break;

                // Frame stepping (requires pause)
                case 'Comma': // < key - Previous frame
                    e.preventDefault();
                    if (video) {
                        video.pause();
                        // Typically 1 frame ≈ 1/30 second (assuming 30fps)
                        video.currentTime = Math.max(0, video.currentTime - (1 / 30));
                        setCurrentTime(video.currentTime);
                    }
                    break;
                case 'Period': // > key - Next frame
                    e.preventDefault();
                    if (video) {
                        video.pause();
                        video.currentTime = Math.min(video.duration, video.currentTime + (1 / 30));
                        setCurrentTime(video.currentTime);
                    }
                    break;

                // Volume control
                case 'ArrowUp':
                    e.preventDefault();
                    if (video) {
                        video.volume = Math.min(1, video.volume + 0.1);
                    }
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    if (video) {
                        video.volume = Math.max(0, video.volume - 0.1);
                    }
                    break;

                // Jump to start/end
                case 'Home':
                    e.preventDefault();
                    if (video) {
                        video.currentTime = 0;
                        setCurrentTime(0);
                    }
                    break;
                case 'End':
                    e.preventDefault();
                    if (video) {
                        video.currentTime = video.duration;
                        setCurrentTime(video.duration);
                    }
                    break;

                // Fullscreen
                case 'KeyF':
                    e.preventDefault();
                    toggleFullscreen();
                    break;

                // Mute toggle
                case 'KeyM':
                    e.preventDefault();
                    if (video) video.muted = !video.muted;
                    break;

                // Reset playback speed
                case 'Backspace':
                    e.preventDefault();
                    if (video) video.playbackRate = 1;
                    break;

                // Number keys (0-9) - Jump to percentage
                case 'Digit0':
                case 'Digit1':
                case 'Digit2':
                case 'Digit3':
                case 'Digit4':
                case 'Digit5':
                case 'Digit6':
                case 'Digit7':
                case 'Digit8':
                case 'Digit9':
                    e.preventDefault();
                    if (video && video.duration) {
                        const percent = parseInt(e.code.replace('Digit', '')) / 10;
                        video.currentTime = video.duration * percent;
                        setCurrentTime(video.currentTime);
                    }
                    break;
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [togglePlay, toggleFullscreen]); // videoRef is ref, stable

    // Progress bar hover preview handlers
    const handleProgressHover = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        if (!progressBarRef.current || !duration) return;

        const rect = progressBarRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const percentage = Math.max(0, Math.min(1, x / rect.width));
        const time = percentage * duration;

        setHoverTime(time);
        setHoverPosition(x);

        // Seek preview video to this time
        if (previewVideoRef.current && videoObjectUrl) {
            previewVideoRef.current.currentTime = time;
        }
    }, [duration, videoObjectUrl]);

    const handleProgressLeave = useCallback(() => {
        setHoverTime(null);
        setPreviewImage(null);
    }, []);

    // Capture frame when preview video seeks
    useEffect(() => {
        const previewVideo = previewVideoRef.current;
        const canvas = previewCanvasRef.current;

        // Only attach if video is loaded
        if (!previewVideo || !canvas || !videoObjectUrl) return;

        const handleSeeked = () => {
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Ensure video has dimensions
            if (previewVideo.videoWidth === 0 || previewVideo.videoHeight === 0) return;

            // Set canvas size to match video aspect ratio
            const aspectRatio = previewVideo.videoWidth / previewVideo.videoHeight;
            canvas.width = 160;
            canvas.height = Math.round(160 / aspectRatio);

            // Draw current frame
            ctx.drawImage(previewVideo, 0, 0, canvas.width, canvas.height);

            try {
                setPreviewImage(canvas.toDataURL('image/jpeg', 0.7));
            } catch (e) {
                console.error('[Preview] Failed to capture frame:', e);
            }
        };

        // Also capture immediately if video is already seeked
        const handleLoadedData = () => {
            if (previewVideo.readyState >= 2) {
                handleSeeked();
            }
        };

        previewVideo.addEventListener('seeked', handleSeeked);
        previewVideo.addEventListener('loadeddata', handleLoadedData);

        return () => {
            previewVideo.removeEventListener('seeked', handleSeeked);
            previewVideo.removeEventListener('loadeddata', handleLoadedData);
        };
    }, [videoObjectUrl]); // Re-run when video changes

    return (
        <div
            ref={containerRef}
            data-tour="video-area"
            className={`flex-1 flex flex-col relative bg-gray-100 dark:bg-black transition-all ${isFullscreen && !showControls ? 'cursor-none' : ''}`}
            onMouseMove={handleMouseMove}
        >
            <div
                className={`flex-1 flex items-center justify-center relative overflow-hidden group ${isImmersive ? 'touch-none' : ''}`}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {videoObjectUrl ? (
                    <video
                        ref={videoRef}
                        src={videoObjectUrl}
                        playsInline
                        className={`w-full h-full shadow-2xl ${fillMode === 'cover' ? 'object-cover' : 'object-contain'}`}
                        style={{ filter: brightness !== 1 ? `brightness(${brightness})` : undefined }}
                        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                        onEnded={() => setIsPlaying(false)}
                        onClick={(e) => {
                            // Desktop click toggles play; ignore the synthetic click that follows a touch (handled by gestures)
                            if (Date.now() - lastTouchEndRef.current < 600) return;
                            e.stopPropagation();
                            togglePlay();
                            onTrackEvent?.('playPauseCount');
                        }}
                    />
                ) : (
                    <div className="text-center text-gray-600">
                        <Film size={64} className="mx-auto mb-4 opacity-20" />
                        <h2 className="text-xl font-medium text-gray-500">{t.player.noVideoLoaded}</h2>
                    </div>
                )}
                {videoObjectUrl && !isPlaying && (
                    <div
                        className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer backdrop-blur-[2px] z-20"
                        onClick={() => { if (Date.now() - lastTouchEndRef.current < 600) return; togglePlay(); onTrackEvent?.('playPauseCount'); }}
                        onTouchEnd={(e) => { e.stopPropagation(); lastTouchEndRef.current = Date.now(); togglePlay(); onTrackEvent?.('playPauseCount'); }}
                    >
                        <div className="p-6 bg-white/10 rounded-full backdrop-blur-md border border-white/20 hover:scale-110 transition-transform">
                            <Play size={48} fill="currentColor" className="text-white ml-1" />
                        </div>
                    </div>
                )}

                {/* Subtitle Overlay — positioned relative to the video area, distance adjustable */}
                {subtitleCues.length > 0 && (
                    <div
                        className="absolute left-0 right-0 text-center pointer-events-none px-4 z-30 transition-[bottom] duration-200"
                        style={{ bottom: isImmersive && showControls ? `calc(${subtitleStyle?.position ?? 8}% + 4.5rem)` : `${subtitleStyle?.position ?? 8}%` }}
                    >
                        {subtitleCues
                            .filter(cue => currentTime >= (cue.startTime + subtitleOffset) && currentTime <= (cue.endTime + subtitleOffset))
                            .map(cue => {
                                // A precise pixel size overrides the responsive preset classes
                                const hasPx = typeof subtitleStyle?.fontSizePx === 'number';
                                const sizeClass = hasPx ? '' :
                                    subtitleStyle?.fontSize === 'small' ? 'text-base md:text-lg' :
                                        subtitleStyle?.fontSize === 'large' ? 'text-2xl md:text-4xl' :
                                            subtitleStyle?.fontSize === 'xlarge' ? 'text-3xl md:text-5xl font-bold' :
                                                'text-lg md:text-3xl';

                                // Compose the text-shadow from the outline + soft-shadow toggles
                                const shadowParts: string[] = [];
                                if (subtitleStyle?.outline) {
                                    shadowParts.push('-1.5px -1.5px 0 #000', '1.5px -1.5px 0 #000', '-1.5px 1.5px 0 #000', '1.5px 1.5px 0 #000', '0 0 4px #000');
                                }
                                if (subtitleStyle?.textShadow) {
                                    shadowParts.push('0 2px 4px rgba(0,0,0,0.9)');
                                }

                                return (
                                    <div
                                        key={cue.id}
                                        className={`px-3 py-1 rounded inline-block mx-auto whitespace-pre-wrap leading-snug ${sizeClass}`}
                                        style={{
                                            color: subtitleStyle?.color || '#ffffff',
                                            backgroundColor: subtitleStyle?.backgroundColor || 'rgba(0,0,0,0.6)',
                                            fontFamily: subtitleStyle?.fontFamily || 'system-ui, sans-serif',
                                            fontSize: hasPx ? `${subtitleStyle!.fontSizePx}px` : undefined,
                                            textShadow: shadowParts.length ? shadowParts.join(', ') : undefined,
                                        }}
                                    >
                                        {cue.text}
                                    </div>
                                );
                            })
                        }
                    </div>
                )}

                {/* Touch gesture hint (volume / seek feedback) */}
                {gestureHint && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40">
                        <div className="bg-black/70 text-white rounded-2xl px-5 py-3 flex items-center gap-2 backdrop-blur-sm">
                            {gestureHint.icon === 'vol' && <Volume2 size={22} />}
                            {gestureHint.icon === 'bright' && <Sun size={22} />}
                            {gestureHint.icon === 'fwd' && <RotateCcw size={22} className="-scale-x-100" />}
                            {gestureHint.icon === 'rwd' && <RotateCcw size={22} />}
                            <span className="text-lg font-semibold tabular-nums">{gestureHint.value}</span>
                        </div>
                    </div>
                )}
            </div>

            {/* Controls Bar — overlays the video in the immersive (fullscreen / mobile-landscape) layout
                so the video fills the screen instead of being squeezed by the panel */}
            <div
                className={`
                    p-4 flex flex-col justify-center gap-2 z-50 transition-all duration-300 ease-in-out
                    ${isImmersive
                        ? `absolute bottom-0 left-0 right-0 pt-12 bg-gradient-to-t from-black via-black/80 to-transparent ${!showControls ? 'opacity-0 translate-y-full pointer-events-none' : 'opacity-100 translate-y-0'}`
                        : 'h-24 bg-gray-900 border-t border-gray-800 relative'
                    }
                `}
                style={isImmersive ? { paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' } : undefined}
                onMouseEnter={handleUserActivity}
                onPointerDown={handleUserActivity}
            >
                {/* Progress Bar with Preview */}
                <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-gray-400 w-12 text-right">{formatTime(currentTime)}</span>

                    {/* Progress Bar Container with Hover Preview */}
                    <div
                        ref={progressBarRef}
                        className="flex-1 relative group"
                    >
                        {/* Hover Preview Tooltip */}
                        {hoverTime !== null && (
                            <div
                                className="absolute bottom-6 transform -translate-x-1/2 pointer-events-none z-50"
                                style={{ left: hoverPosition }}
                            >
                                <div className="bg-gray-800 border border-gray-700 rounded-lg shadow-xl overflow-hidden">
                                    {previewImage ? (
                                        <img
                                            src={previewImage}
                                            alt="Preview"
                                            className="w-40 h-auto block"
                                        />
                                    ) : (
                                        <div className="w-40 h-24 bg-gray-900 flex items-center justify-center">
                                            <span className="text-xs text-gray-500">Loading...</span>
                                        </div>
                                    )}
                                    <div className="px-2 py-1 text-center bg-gray-900">
                                        <span className="text-xs font-mono text-white">{formatTime(hoverTime)}</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Invisible hover area on top of input */}
                        <div
                            className="absolute inset-0 z-10 cursor-pointer"
                            onMouseMove={handleProgressHover}
                            onMouseLeave={handleProgressLeave}
                            onClick={(e) => {
                                // Forward click to input for seeking
                                const rect = e.currentTarget.getBoundingClientRect();
                                const percentage = (e.clientX - rect.left) / rect.width;
                                handleSeek(percentage * duration);
                            }}
                        />

                        <input
                            type="range"
                            min={0}
                            max={duration || 100}
                            value={currentTime}
                            onChange={(e) => handleSeek(parseFloat(e.target.value))}
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500 hover:accent-primary-400 transition-all pointer-events-none"
                        />
                    </div>

                    <span className="text-xs font-mono text-gray-400 w-12">{formatTime(duration)}</span>
                </div>
                <div className="flex items-center justify-between sm:justify-center px-2 sm:px-4">
                    {/* Left side buttons - hidden on mobile, takes space for centering on desktop */}
                    <div className="hidden sm:flex flex-1 justify-start">
                        {/* Empty space for balance */}
                    </div>

                    {/* Center controls - Play/Pause and Skip */}
                    <div className="flex items-center gap-3 sm:gap-6">
                        <button
                            onClick={() => { if (videoRef.current) { videoRef.current.currentTime -= 10; setCurrentTime(videoRef.current.currentTime); onTrackEvent?.('seekCount'); } }}
                            className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                        >
                            <RotateCcw size={18} className="sm:w-5 sm:h-5" /><span className="sr-only">-10s</span>
                        </button>
                        <button
                            onClick={() => { togglePlay(); onTrackEvent?.('playPauseCount'); }}
                            className="p-2 sm:p-3 bg-white text-black rounded-full hover:bg-gray-200 transition-transform hover:scale-105 active:scale-95"
                        >
                            {isPlaying ? <Pause size={20} className="sm:w-6 sm:h-6" fill="currentColor" /> : <Play size={20} className="sm:w-6 sm:h-6" fill="currentColor" />}
                        </button>
                        <button
                            onClick={() => { if (videoRef.current) { videoRef.current.currentTime += 10; setCurrentTime(videoRef.current.currentTime); onTrackEvent?.('seekCount'); } }}
                            className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                        >
                            <RotateCcw size={18} className="sm:w-5 sm:h-5 -scale-x-100" /><span className="sr-only">+10s</span>
                        </button>
                    </div>

                    {/* Right side buttons - Volume, Fill, PiP, Fullscreen, Detach */}
                    <div className="flex items-center sm:flex-1 justify-end gap-1.5 sm:gap-3">
                        <div className="flex items-center gap-2 group relative">
                            <Volume2 size={18} className="sm:w-5 sm:h-5 text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                defaultValue="1"
                                aria-label="Video volume"
                                onChange={(e) => { if (videoRef.current) videoRef.current.volume = parseFloat(e.target.value); onTrackEvent?.('volumeAdjustments'); }}
                                className="w-10 sm:w-20 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-primary-500"
                            />
                        </div>

                        {/* Fill / Fit Mode Toggle — fixes letterboxing on ultra-wide phones */}
                        <button
                            onClick={() => setFillMode(m => (m === 'cover' ? 'contain' : 'cover'))}
                            className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                            title={fillMode === 'cover' ? 'Fit to screen (show full frame)' : 'Fill screen (crop edges)'}
                            aria-label={fillMode === 'cover' ? 'Fit video to screen' : 'Fill screen with video'}
                        >
                            {fillMode === 'cover' ? <Shrink size={18} className="sm:w-5 sm:h-5 text-primary-400" /> : <Expand size={18} className="sm:w-5 sm:h-5" />}
                        </button>

                        {/* Picture-in-Picture (native browser PiP) */}
                        <button
                            onClick={togglePiP}
                            className="hidden sm:inline-flex text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                            title="Picture-in-Picture"
                            aria-label="Toggle Picture-in-Picture"
                        >
                            <PictureInPicture2 size={18} className={`sm:w-5 sm:h-5 ${isPiPActive ? 'text-primary-400' : ''}`} />
                        </button>

                        {/* Fullscreen Toggle (locks landscape on mobile) */}
                        <button
                            onClick={() => { toggleFullscreen(); onTrackEvent?.('fullscreenToggles'); }}
                            className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                            title={isFullscreen ? t.player.exitFullscreen : t.player.fullscreen}
                            aria-label={isFullscreen ? t.player.exitFullscreen : t.player.fullscreen}
                        >
                            {isFullscreen ? <Minimize size={18} className="sm:w-5 sm:h-5" /> : <Maximize size={18} className="sm:w-5 sm:h-5" />}
                        </button>

                        {/* Detach / Separate Window (desktop only — popups aren't useful on mobile) */}
                        <button
                            onClick={() => { openDetachedWindow(); onTrackEvent?.('detachOpened'); }}
                            className="hidden sm:inline-flex text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-1.5 sm:p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                            title={t.player.detach}
                            aria-label={t.player.detach}
                        >
                            <Film size={18} className="sm:w-5 sm:h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Hidden Preview Video for Thumbnail Extraction */}
            {videoObjectUrl && (
                <>
                    <video
                        ref={previewVideoRef}
                        src={videoObjectUrl}
                        className="hidden"
                        muted
                        preload="metadata"
                    />
                    <canvas ref={previewCanvasRef} className="hidden" />
                </>
            )}
        </div>
    );
};
