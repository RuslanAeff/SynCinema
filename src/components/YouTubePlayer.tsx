/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - YouTube Player Component
 *  @author Ruslan Aliyev
 *  YouTube IFrame API integration with limited controls
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AlertTriangle, Volume2, VolumeX, Play, Pause, Maximize, Minimize, Youtube, ExternalLink, Check, Gauge } from 'lucide-react';
import { formatTime } from '../utils/formatTime';
import {
    DetailBoost,
    QualityPreference,
    formatQuality,
    pickBestQuality,
    qualityForPlayerSize,
    qualityRank,
    resolveBoostFactor,
    sortQualitiesDesc,
} from '../utils/youtubeQuality';
import { SubtitleStyle } from '../types';
import { SubtitleOverlay } from './SubtitleOverlay';

// YouTube IFrame API types
declare global {
    interface Window {
        YT: typeof YT;
        onYouTubeIframeAPIReady: () => void;
    }
}

interface YouTubePlayerProps {
    videoId: string;
    isPlaying: boolean;
    onPlayingChange: (playing: boolean) => void;
    onTimeUpdate: (time: number) => void;
    onDurationChange: (duration: number) => void;
    currentTime: number;
    /** Externally loaded .srt cues, rendered over the iframe. */
    subtitleCues?: { id: string, startTime: number, endTime: number, text: string }[];
    subtitleOffset?: number;
    subtitleStyle?: SubtitleStyle;
}

/** Where the user's quality choice is remembered between sessions. */
const QUALITY_PREFERENCE_KEY = 'syncinema.youtube.quality';

/**
 * How many times we re-ask for a level after YouTube drifts off it. Past this, adaptive
 * streaming is choosing for bandwidth or player-size reasons and re-requesting in a loop
 * only causes rebuffering.
 */
const MAX_QUALITY_NUDGES = 2;

/** Where the detail-boost choice is remembered between sessions. */
const DETAIL_BOOST_KEY = 'syncinema.youtube.detailBoost';

const readStoredPreference = (): QualityPreference => {
    try {
        const stored = window.localStorage.getItem(QUALITY_PREFERENCE_KEY);
        if (stored === 'auto' || stored === 'best' || qualityRank(stored ?? '') >= 0) {
            return stored as QualityPreference;
        }
    } catch {
        // Private mode or blocked storage — fall through to the default.
    }
    return 'best';
};

/** Off by default: oversampling costs bandwidth, so it stays an opt-in. */
const readStoredBoost = (): DetailBoost => {
    try {
        const stored = window.localStorage.getItem(DETAIL_BOOST_KEY);
        if (stored === 'off' || stored === 'high' || stored === 'max') return stored;
    } catch {
        // Private mode or blocked storage — fall through to the default.
    }
    return 'off';
};

/** Whether the viewer has asked the browser to conserve data. */
const prefersReducedData = (): boolean => {
    const connection = (navigator as Navigator & {
        connection?: { saveData?: boolean; effectiveType?: string };
    }).connection;

    if (!connection) return false;
    if (connection.saveData) return true;
    return connection.effectiveType === '2g' || connection.effectiveType === 'slow-2g';
};

// Load YouTube IFrame API script
const loadYouTubeAPI = (): Promise<void> => {
    return new Promise((resolve) => {
        if (window.YT && window.YT.Player) {
            resolve();
            return;
        }

        const tag = document.createElement('script');
        tag.src = 'https://www.youtube.com/iframe_api';

        window.onYouTubeIframeAPIReady = () => {
            resolve();
        };

        const firstScriptTag = document.getElementsByTagName('script')[0];
        firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    });
};

export const YouTubePlayer: React.FC<YouTubePlayerProps> = ({
    videoId,
    isPlaying,
    onPlayingChange,
    onTimeUpdate,
    onDurationChange,
    currentTime,
    subtitleCues = [],
    subtitleOffset = 0,
    subtitleStyle,
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const fullscreenContainerRef = useRef<HTMLDivElement>(null);
    const playerRef = useRef<YT.Player | null>(null);
    const [isReady, setIsReady] = useState(false);
    const [showWarning, setShowWarning] = useState(true);
    const [volume, setVolume] = useState(100);
    const [isMuted, setIsMuted] = useState(false);
    const previousVolumeRef = useRef(100);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [duration, setDuration] = useState(0);
    const [localTime, setLocalTime] = useState(0);
    const [currentQuality, setCurrentQuality] = useState<string>('auto');
    const [availableQualities, setAvailableQualities] = useState<string[]>([]);
    const [preferredQuality, setPreferredQuality] = useState<QualityPreference>(readStoredPreference);
    const [detailBoost, setDetailBoost] = useState<DetailBoost>(readStoredBoost);
    const [saveData] = useState(prefersReducedData);
    const [showQualityMenu, setShowQualityMenu] = useState(false);
    const [playerBox, setPlayerBox] = useState({ width: 0, height: 0 });
    const preferredQualityRef = useRef<QualityPreference>(preferredQuality);
    const qualityNudgesRef = useRef(0);
    const videoBoxRef = useRef<HTMLDivElement>(null);
    const qualityMenuRef = useRef<HTMLDivElement>(null);
    const intervalRef = useRef<number | null>(null);
    const controlsTimeoutRef = useRef<number | null>(null);

    // How many times larger than its visible box the embed is laid out.
    const boostFactor = resolveBoostFactor(detailBoost, saveData);

    // Auto-hide controls logic
    const handleUserActivity = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
        // Auto-hide after 3 seconds in fullscreen when playing
        if (isFullscreen && isPlaying) {
            controlsTimeoutRef.current = window.setTimeout(() => setShowControls(false), 3000);
        }
    }, [isFullscreen, isPlaying]);

    useEffect(() => {
        if (isFullscreen && isPlaying) handleUserActivity();
        else {
            setShowControls(true);
            if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
        }
        return () => { if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current); };
    }, [isFullscreen, isPlaying, handleUserActivity]);

    // Listen for fullscreen changes
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
            setShowControls(true);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // ── Quality ──────────────────────────────────────────────────────────────
    // YouTube took real quality control out of the IFrame API years ago:
    // setPlaybackQuality is a suggestion the player may ignore, and adaptive streaming
    // ultimately picks from rendered player size and bandwidth. So we ask for what we
    // want, report what we actually got, and keep the iframe as large as the layout
    // allows — that size is the one lever that still reliably moves the ladder.

    const requestQuality = useCallback((token: string) => {
        const player = playerRef.current;
        if (!player) return;
        try {
            player.setPlaybackQualityRange?.(token, token);
            player.setPlaybackQuality(token);
        } catch {
            // Some player builds drop these methods entirely; the size lever still applies.
        }
    }, []);

    /** The concrete token our preference means right now, or null to leave YouTube alone. */
    const resolvePreferred = useCallback((levels: string[]): string | null => {
        const preference = preferredQualityRef.current;
        if (preference === 'auto') return null;
        if (preference === 'best') return pickBestQuality(levels);
        // A pinned level this video does not offer falls back to the best it does.
        return levels.includes(preference) ? preference : pickBestQuality(levels);
    }, []);

    /** Re-read what YouTube offers and re-assert the preference against it. */
    const syncQuality = useCallback(() => {
        const player = playerRef.current;
        if (!player || typeof player.getAvailableQualityLevels !== 'function') return;
        const levels = sortQualitiesDesc(player.getAvailableQualityLevels());
        setAvailableQualities(levels);
        setCurrentQuality(player.getPlaybackQuality());
        const target = resolvePreferred(levels);
        if (target) requestQuality(target);
    }, [resolvePreferred, requestQuality]);

    // Initialize YouTube player
    useEffect(() => {
        let mounted = true;

        const initPlayer = async () => {
            await loadYouTubeAPI();

            if (!mounted || !containerRef.current) return;

            playerRef.current = new window.YT.Player(containerRef.current, {
                videoId: videoId,
                // Fill the wrapper instead of the API's 640x360 default, which would
                // otherwise pin adaptive streaming near 360p regardless of what we ask for.
                width: '100%',
                height: '100%',
                playerVars: {
                    autoplay: 0,
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                    showinfo: 0,
                    fs: 0,
                    playsinline: 1,
                    origin: window.location.origin,
                    // Legacy hint. Modern players usually ignore it, but it costs nothing
                    // and still nudges the ones that don't.
                    vq: 'hd2160'
                },
                events: {
                    onReady: (event) => {
                        if (!mounted) return;
                        setIsReady(true);
                        const dur = event.target.getDuration();
                        setDuration(dur);
                        onDurationChange(dur);
                        syncQuality();
                    },
                    onPlaybackQualityChange: (event) => {
                        if (!mounted) return;
                        setCurrentQuality(event.data);
                        const levels = sortQualitiesDesc(event.target.getAvailableQualityLevels());
                        setAvailableQualities(levels);
                        const target = resolvePreferred(levels);
                        if (target && event.data !== target && qualityNudgesRef.current < MAX_QUALITY_NUDGES) {
                            qualityNudgesRef.current += 1;
                            requestQuality(target);
                        }
                    },
                    onStateChange: (event) => {
                        if (!mounted) return;
                        const state = event.data;
                        if (state === window.YT.PlayerState.PLAYING) {
                            onPlayingChange(true);
                            startTimeUpdate();
                            // The level list is empty until playback actually begins.
                            syncQuality();
                        } else if (state === window.YT.PlayerState.PAUSED) {
                            onPlayingChange(false);
                            stopTimeUpdate();
                        } else if (state === window.YT.PlayerState.ENDED) {
                            onPlayingChange(false);
                            stopTimeUpdate();
                        }
                    }
                }
            });
        };

        initPlayer();

        return () => {
            mounted = false;
            stopTimeUpdate();
            if (playerRef.current) {
                playerRef.current.destroy();
                playerRef.current = null;
            }
        };
    }, [videoId, syncQuality, resolvePreferred, requestQuality]);

    // Time update interval
    const startTimeUpdate = useCallback(() => {
        if (intervalRef.current) return;
        intervalRef.current = window.setInterval(() => {
            if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                const time = playerRef.current.getCurrentTime();
                setLocalTime(time);
                onTimeUpdate(time);
            }
        }, 500); // Slightly slower interval to reduce overhead
    }, [onTimeUpdate]);

    const stopTimeUpdate = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }
    }, []);

    // Sync play state
    useEffect(() => {
        if (!isReady || !playerRef.current) return;

        if (isPlaying) {
            playerRef.current.playVideo();
        } else {
            playerRef.current.pauseVideo();
        }
    }, [isPlaying, isReady]);

    // Sync volume
    useEffect(() => {
        if (!isReady || !playerRef.current) return;
        playerRef.current.setVolume(isMuted ? 0 : volume);
    }, [volume, isMuted, isReady]);

    // Persist the choice and re-assert it, with a fresh nudge budget per pick.
    useEffect(() => {
        preferredQualityRef.current = preferredQuality;
        qualityNudgesRef.current = 0;
        try {
            window.localStorage.setItem(QUALITY_PREFERENCE_KEY, preferredQuality);
        } catch {
            // Storage blocked — the choice simply won't survive a reload.
        }
        if (isReady) syncQuality();
    }, [preferredQuality, isReady, syncQuality]);

    // Persist the boost and re-read the ladder: resizing the embed changes which levels
    // YouTube is willing to offer, so the menu and the request both need refreshing.
    useEffect(() => {
        try {
            window.localStorage.setItem(DETAIL_BOOST_KEY, detailBoost);
        } catch {
            // Storage blocked — the choice simply won't survive a reload.
        }
        if (isReady) syncQuality();
    }, [detailBoost, isReady, syncQuality]);

    // Track the player's real pixel box: it decides the quality ceiling, so the menu can
    // say why 1080p isn't on offer instead of silently failing to deliver it.
    useEffect(() => {
        const box = videoBoxRef.current;
        if (!box || typeof ResizeObserver === 'undefined') return;
        const observer = new ResizeObserver(([entry]) => {
            const { width, height } = entry.contentRect;
            setPlayerBox({ width, height });
        });
        observer.observe(box);
        return () => observer.disconnect();
    }, []);

    // Dismiss the quality menu on an outside click
    useEffect(() => {
        if (!showQualityMenu) return;
        const handleClickOutside = (event: MouseEvent) => {
            if (!qualityMenuRef.current?.contains(event.target as Node)) {
                setShowQualityMenu(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [showQualityMenu]);

    // Toggle mute
    const toggleMute = () => {
        if (isMuted) {
            setIsMuted(false);
            setVolume(previousVolumeRef.current);
        } else {
            previousVolumeRef.current = volume;
            setIsMuted(true);
        }
    };

    // Handle seek
    const handleSeek = (time: number) => {
        if (!playerRef.current) return;
        playerRef.current.seekTo(time, true);
        setLocalTime(time);
        onTimeUpdate(time);
    };

    // Toggle fullscreen
    const toggleFullscreen = () => {
        const container = fullscreenContainerRef.current;
        if (!container) return;

        if (!document.fullscreenElement) {
            container.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    };

    // What this layout can realistically get, and what YouTube is actually serving.
    // The ceiling follows the boost factor, not devicePixelRatio: YouTube reads the
    // embed's CSS pixels and ignores how dense the panel behind them is — which is the
    // whole reason zooming the browser out raises quality.
    // Until the box has been measured we make no size claims: a 0x0 reading would
    // otherwise flag every level as out of reach on the first paint.
    const hasMeasuredBox = playerBox.width > 0 && playerBox.height > 0;
    const sizeCeiling = qualityForPlayerSize(playerBox.width, playerBox.height, boostFactor);
    const sizeCeilingRank = hasMeasuredBox ? qualityRank(sizeCeiling) : Infinity;
    const bestAvailable = availableQualities[0] ?? null;
    const isBelowBest = bestAvailable !== null
        && qualityRank(currentQuality) >= 0
        && qualityRank(currentQuality) < qualityRank(bestAvailable);

    const qualityOptions: { value: QualityPreference; label: string; needsBiggerPlayer: boolean }[] = [
        { value: 'best', label: 'Best available', needsBiggerPlayer: false },
        { value: 'auto', label: 'Auto (YouTube decides)', needsBiggerPlayer: false },
        ...availableQualities.map((level) => ({
            value: level as QualityPreference,
            label: formatQuality(level),
            needsBiggerPlayer: qualityRank(level) > sizeCeilingRank,
        })),
    ];

    const boostOptions: { value: DetailBoost; label: string; hint: string }[] = [
        { value: 'off', label: 'Off', hint: 'Normal' },
        { value: 'high', label: 'Higher', hint: '2×' },
        { value: 'max', label: 'Maximum', hint: '4×' },
    ];

    // The control bar forces a dark surface in fullscreen; the menu has to follow it.
    const menuSurface = isFullscreen
        ? 'bg-gray-900 border-gray-800'
        : 'bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700';
    const menuRowHover = isFullscreen ? 'hover:bg-gray-800' : 'hover:bg-gray-100 dark:hover:bg-gray-800';
    const menuText = isFullscreen ? 'text-gray-200' : 'text-gray-700 dark:text-gray-200';
    const menuMuted = isFullscreen ? 'text-gray-400' : 'text-gray-500 dark:text-gray-400';
    const menuDivider = isFullscreen ? 'border-gray-800' : 'border-gray-200 dark:border-gray-800';

    return (
        <div
            ref={fullscreenContainerRef}
            className={`flex-1 flex flex-col bg-gray-100 dark:bg-black relative ${isFullscreen && !showControls ? 'cursor-none' : ''}`}
            data-tour="video-area"
            onMouseMove={handleUserActivity}
            onClick={handleUserActivity}
        >
            {/* Warning Banner */}
            {showWarning && (
                <div className="absolute top-0 left-0 right-0 z-20 bg-yellow-900/95 border-b border-yellow-600 p-3">
                    <div className="flex items-start gap-3 max-w-3xl mx-auto">
                        <AlertTriangle className="text-yellow-400 shrink-0 mt-0.5" size={20} />
                        <div className="flex-1">
                            <p className="text-yellow-200 text-sm font-medium">YouTube Player Limitations</p>
                            <p className="text-yellow-300/70 text-xs mt-1">
                                Audio output cannot be changed (always uses default device).
                                External audio tracks can still be routed to different devices.
                            </p>
                        </div>
                        <button
                            onClick={() => setShowWarning(false)}
                            className="text-yellow-400 hover:text-yellow-200 text-sm"
                        >
                            ✕
                        </button>
                    </div>
                </div>
            )}

            {/* YouTube Badge - Hide in fullscreen */}
            {!isFullscreen && (
                <div className="absolute top-4 right-4 z-10 flex items-center gap-2 px-3 py-1.5 bg-red-600 rounded-lg shadow-lg">
                    <Youtube size={16} className="text-white" />
                    <span className="text-white text-xs font-medium">YouTube</span>
                </div>
            )}

            {/* Video Container */}
            <div ref={videoBoxRef} className="flex-1 relative overflow-hidden">
                {/* The API swaps the inner node out for its own iframe, so sizing lives on
                    the wrapper — a leftover 640x360 iframe would cap the quality ladder.
                    Above 1x the wrapper is laid out proportionally larger and scaled back
                    down: YouTube then measures the bigger box and picks a denser rendition,
                    while the picture keeps the exact same place on screen. It is the
                    browser's own zoom-out trick, confined to the video. */}
                <div
                    className="absolute top-0 left-0 origin-top-left [&>iframe]:block [&>iframe]:w-full [&>iframe]:h-full"
                    style={{
                        width: `${boostFactor * 100}%`,
                        height: `${boostFactor * 100}%`,
                        transform: boostFactor === 1 ? undefined : `scale(${1 / boostFactor})`,
                        pointerEvents: isReady ? 'none' : 'auto',
                    }}
                >
                    <div ref={containerRef} className="w-full h-full" />
                </div>

                {!isReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="text-center">
                            <Youtube size={48} className="text-red-500 mx-auto mb-4 animate-pulse" />
                            <p className="text-gray-400">Loading YouTube player...</p>
                        </div>
                    </div>
                )}

                {/* Subtitle Overlay — external .srt drawn over the iframe. Only lifted in
                    fullscreen, where the controls float above the video instead of below it. */}
                <SubtitleOverlay
                    cues={subtitleCues}
                    currentTime={localTime}
                    offset={subtitleOffset}
                    style={subtitleStyle}
                    liftForControls={isFullscreen && showControls}
                />
            </div>

            {/* Custom Controls - Theme-aware */}
            <div
                className={`
                    bg-white/95 dark:bg-gray-900/95 backdrop-blur-sm border-t border-gray-200 dark:border-gray-800 p-4 transition-all duration-500 ease-in-out z-30
                    ${isFullscreen
                        ? `absolute bottom-0 left-0 right-0 !bg-gray-900/95 !border-gray-800 ${!showControls ? 'opacity-0 translate-y-full pointer-events-none' : 'opacity-100 translate-y-0'}`
                        : ''
                    }
                `}
                onMouseEnter={handleUserActivity}
            >
                {/* Progress Bar */}
                <div className="flex items-center gap-4 mb-4">
                    <span className={`text-xs font-mono w-12 ${isFullscreen ? 'text-white/70' : 'text-gray-600 dark:text-gray-400'}`}>{formatTime(localTime)}</span>
                    <div className="flex-1 relative group">
                        <input
                            type="range"
                            min="0"
                            max={duration || 100}
                            value={localTime}
                            onChange={(e) => handleSeek(parseFloat(e.target.value))}
                            className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
                            style={{
                                background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${(localTime / (duration || 1)) * 100}%, ${isFullscreen ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'} ${(localTime / (duration || 1)) * 100}%, ${isFullscreen ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.1)'} 100%)`
                            }}
                        />
                    </div>
                    <span className={`text-xs font-mono w-12 ${isFullscreen ? 'text-white/70' : 'text-gray-600 dark:text-gray-400'}`}>{formatTime(duration)}</span>
                </div>

                {/* Controls */}
                <div className="flex items-center justify-center">
                    <div className="flex-1 flex justify-start" />

                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => handleSeek(Math.max(0, localTime - 10))}
                            className={`p-2 text-sm font-medium transition-colors ${isFullscreen ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                        >
                            -10s
                        </button>
                        <button
                            onClick={() => onPlayingChange(!isPlaying)}
                            className="p-4 bg-red-600 text-white rounded-full hover:bg-red-500 transition-all hover:scale-105 shadow-lg shadow-red-600/30"
                        >
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                        </button>
                        <button
                            onClick={() => handleSeek(Math.min(duration, localTime + 10))}
                            className={`p-2 text-sm font-medium transition-colors ${isFullscreen ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                        >
                            +10s
                        </button>
                    </div>

                    <div className="flex-1 flex items-center justify-end gap-3">
                        {/* Quality picker — the label is what YouTube actually serves,
                            the menu is what we ask it for. */}
                        <div className="relative" ref={qualityMenuRef}>
                            <button
                                onClick={() => {
                                    syncQuality();
                                    setShowQualityMenu((open) => !open);
                                }}
                                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-mono border transition-colors ${isFullscreen ? 'bg-white/10 border-white/20 text-white/80 hover:bg-white/20' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'}`}
                                title="Video quality"
                            >
                                <Gauge size={13} />
                                <span>{formatQuality(currentQuality)}</span>
                                {isBelowBest && (
                                    <span className="text-amber-500" title={`YouTube is serving below the available ${formatQuality(bestAvailable!)}`}>↓</span>
                                )}
                            </button>

                            {showQualityMenu && (
                                <div className={`absolute bottom-full right-0 mb-2 w-64 rounded-lg border shadow-xl overflow-hidden z-40 ${menuSurface}`}>
                                    <div className={`px-3 py-2 text-[11px] uppercase tracking-wide border-b ${menuDivider} ${menuMuted}`}>
                                        Quality
                                    </div>

                                    <div className="max-h-64 overflow-y-auto py-1">
                                        {qualityOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => {
                                                    setPreferredQuality(option.value);
                                                    setShowQualityMenu(false);
                                                }}
                                                className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-left transition-colors ${menuRowHover}`}
                                            >
                                                <span className={preferredQuality === option.value ? 'text-red-500 font-medium' : menuText}>
                                                    {option.label}
                                                </span>
                                                <span className="flex items-center gap-2">
                                                    {option.needsBiggerPlayer && (
                                                        <span className={`text-[10px] ${menuMuted}`} title="Your player is too small for this level; go fullscreen">
                                                            needs a bigger player
                                                        </span>
                                                    )}
                                                    {preferredQuality === option.value && <Check size={14} className="text-red-500" />}
                                                </span>
                                            </button>
                                        ))}

                                        {availableQualities.length === 0 && (
                                            <p className={`px-3 py-2 text-xs ${menuMuted}`}>
                                                Levels appear once playback starts.
                                            </p>
                                        )}
                                    </div>

                                    <div className={`px-3 py-2 border-t text-[11px] uppercase tracking-wide ${menuDivider} ${menuMuted}`}>
                                        Detail boost
                                    </div>

                                    <div className="flex gap-1 px-2 py-2">
                                        {boostOptions.map((option) => (
                                            <button
                                                key={option.value}
                                                onClick={() => setDetailBoost(option.value)}
                                                disabled={saveData && option.value !== 'off'}
                                                className={`flex-1 rounded-md px-2 py-1.5 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${detailBoost === option.value
                                                    ? 'bg-red-600 text-white'
                                                    : `${menuText} ${menuRowHover}`
                                                    }`}
                                                title={`Render the embed ${option.hint} larger, then scale it back`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                    </div>

                                    <div className={`px-3 py-2 border-t text-[11px] leading-relaxed ${menuDivider} ${menuMuted}`}>
                                        {saveData ? (
                                            <>Detail boost is off because your browser has Save-Data turned on.</>
                                        ) : (
                                            <>Boosting asks YouTube for a denser picture than the player box would
                                                normally get — the same effect as zooming the browser out, without
                                                shrinking the controls. Costs more bandwidth.</>
                                        )}
                                        {hasMeasuredBox && (
                                            <> This player is {Math.round(playerBox.width)}×{Math.round(playerBox.height)},
                                                which currently supports up to{' '}
                                                <span className="font-medium">{formatQuality(sizeCeiling)}</span>.</>
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex items-center gap-2">
                            <button
                                onClick={toggleMute}
                                className={`p-1 rounded transition-colors ${isFullscreen ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                                title={isMuted ? 'Unmute' : 'Mute'}
                            >
                                {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                            </button>
                            <input
                                type="range"
                                min="0"
                                max="100"
                                value={isMuted ? 0 : volume}
                                onChange={(e) => {
                                    const val = parseInt(e.target.value);
                                    setVolume(val);
                                    if (val > 0) setIsMuted(false);
                                }}
                                className={`w-20 h-2 rounded-lg appearance-none cursor-pointer accent-red-500 ${isFullscreen ? 'bg-white/20' : 'bg-gray-300 dark:bg-gray-600'}`}
                                style={{
                                    background: `linear-gradient(to right, #ef4444 0%, #ef4444 ${isMuted ? 0 : volume}%, ${isFullscreen ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'} ${isMuted ? 0 : volume}%, ${isFullscreen ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.15)'} 100%)`
                                }}
                            />
                        </div>
                        <button
                            onClick={toggleFullscreen}
                            className={`p-2 transition-colors ${isFullscreen ? 'text-white/60 hover:text-white' : 'text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
                        >
                            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>
                        <a
                            href={`https://www.youtube.com/watch?v=${videoId}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={`p-2 transition-colors ${isFullscreen ? 'text-white/60 hover:text-red-400' : 'text-gray-500 hover:text-red-500 dark:text-gray-400 dark:hover:text-red-400'}`}
                            title="Open on YouTube"
                        >
                            <ExternalLink size={18} />
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Helper function to extract YouTube video ID from URL
export const extractYouTubeVideoId = (url: string): string | null => {
    const patterns = [
        /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([a-zA-Z0-9_-]{11})/,
        /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/
    ];

    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    return null;
};

// Check if URL is a YouTube URL
export const isYouTubeUrl = (url: string): boolean => {
    return extractYouTubeVideoId(url) !== null;
};
