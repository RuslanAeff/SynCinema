/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - YouTube Player Component
 *  @author Ruslan Aliyev
 *  YouTube IFrame API integration with limited controls
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { AlertTriangle, Volume2, VolumeX, Play, Pause, Maximize, Minimize, Youtube, ExternalLink } from 'lucide-react';

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
}

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
    currentTime
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
    const intervalRef = useRef<number | null>(null);
    const controlsTimeoutRef = useRef<number | null>(null);

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

    // Initialize YouTube player
    useEffect(() => {
        let mounted = true;

        const initPlayer = async () => {
            await loadYouTubeAPI();

            if (!mounted || !containerRef.current) return;

            playerRef.current = new window.YT.Player(containerRef.current, {
                videoId: videoId,
                playerVars: {
                    autoplay: 0,
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                    showinfo: 0,
                    fs: 0,
                    playsinline: 1,
                    origin: window.location.origin
                },
                events: {
                    onReady: (event) => {
                        if (!mounted) return;
                        setIsReady(true);
                        const dur = event.target.getDuration();
                        setDuration(dur);
                        onDurationChange(dur);
                    },
                    onStateChange: (event) => {
                        if (!mounted) return;
                        const state = event.data;
                        if (state === window.YT.PlayerState.PLAYING) {
                            onPlayingChange(true);
                            startTimeUpdate();
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
            }
        };
    }, [videoId]);

    // Time update interval
    const startTimeUpdate = useCallback(() => {
        if (intervalRef.current) return;
        intervalRef.current = window.setInterval(() => {
            if (playerRef.current && typeof playerRef.current.getCurrentTime === 'function') {
                const time = playerRef.current.getCurrentTime();
                setLocalTime(time);
                onTimeUpdate(time);

                // Update quality info
                if (typeof playerRef.current.getPlaybackQuality === 'function') {
                    const quality = playerRef.current.getPlaybackQuality();
                    setCurrentQuality(quality);
                }
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

    // Format time
    const formatTime = (seconds: number) => {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    // Format quality label
    const formatQuality = (quality: string): string => {
        const qualityMap: Record<string, string> = {
            'tiny': '144p',
            'small': '240p',
            'medium': '360p',
            'large': '480p',
            'hd720': '720p',
            'hd1080': '1080p',
            'hd1440': '1440p',
            'hd2160': '4K',
            'highres': '4K+',
            'default': 'Auto',
            'auto': 'Auto'
        };
        return qualityMap[quality] || quality;
    };

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
            <div className="flex-1 relative">
                <div
                    ref={containerRef}
                    className="absolute inset-0 w-full h-full"
                    style={{ pointerEvents: isReady ? 'none' : 'auto' }}
                />

                {!isReady && (
                    <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                        <div className="text-center">
                            <Youtube size={48} className="text-red-500 mx-auto mb-4 animate-pulse" />
                            <p className="text-gray-400">Loading YouTube player...</p>
                        </div>
                    </div>
                )}
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
                        {/* Quality Badge */}
                        <div
                            className={`px-2.5 py-1 rounded-md text-xs font-mono border ${isFullscreen ? 'bg-white/10 border-white/20 text-white/80' : 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300'}`}
                            title="Current video quality"
                        >
                            {formatQuality(currentQuality)}
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
