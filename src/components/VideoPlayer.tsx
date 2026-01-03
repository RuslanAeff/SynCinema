/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Video Player Component
 *  @author Ruslan Aliyev
 *  Full-featured video player with detach mode and subtitle overlay
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Play, Pause, RotateCcw, Film, Maximize, Minimize, Volume2 } from 'lucide-react';
import { Translations } from '../i18n';
import { useI18n } from '../context/I18nContext';

interface VideoPlayerProps {
    videoFile: File | null;
    videoObjectUrl: string | null;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    videoRef: React.RefObject<HTMLVideoElement>;
    togglePlay: () => void;
    handleSeek: (time: number) => void;
    setIsPlaying: (playing: boolean) => void;
    setCurrentTime: (time: number) => void;
    setDuration: (duration: number) => void;
    subtitleCues?: { id: string, startTime: number, endTime: number, text: string }[];
    subtitleOffset?: number;
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
}) => {
    const { t } = useI18n();
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const controlsTimeoutRef = useRef<number | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const syncChannelRef = useRef<BroadcastChannel | null>(null);

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
        subtitleOffset
    });

    // Keep refs updated
    useEffect(() => {
        stateRef.current = {
            videoObjectUrl,
            currentTime,
            isPlaying,
            duration,
            subtitleCues,
            subtitleOffset
        };
    }, [videoObjectUrl, currentTime, isPlaying, duration, subtitleCues, subtitleOffset]);

    // Initialize BroadcastChannel for detached player sync (runs once)
    useEffect(() => {
        const channel = new BroadcastChannel('syncinema-player-sync');
        syncChannelRef.current = channel;

        // Listen for messages from detached window
        channel.onmessage = (event: MessageEvent) => {
            const { type, payload } = event.data;
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
                        channel.postMessage({ type: 'SYNC_VIDEO_URL', payload: state.videoObjectUrl, timestamp: Date.now() });
                    }
                    channel.postMessage({
                        type: 'SYNC_STATE',
                        payload: { currentTime: state.currentTime, isPlaying: state.isPlaying, duration: state.duration },
                        timestamp: Date.now()
                    });
                    if (state.subtitleCues.length > 0) {
                        channel.postMessage({
                            type: 'SYNC_SUBTITLES',
                            payload: { cues: state.subtitleCues, offset: state.subtitleOffset },
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
                timestamp: Date.now()
            });
        }
    }, [videoObjectUrl]);

    // Broadcast play/pause state
    useEffect(() => {
        if (syncChannelRef.current) {
            syncChannelRef.current.postMessage({
                type: isPlaying ? 'SYNC_PLAY' : 'SYNC_PAUSE',
                timestamp: Date.now()
            });
        }
    }, [isPlaying]);

    // Broadcast subtitles
    useEffect(() => {
        if (syncChannelRef.current && subtitleCues.length > 0) {
            syncChannelRef.current.postMessage({
                type: 'SYNC_SUBTITLES',
                payload: { cues: subtitleCues, offset: subtitleOffset },
                timestamp: Date.now()
            });
        }
    }, [subtitleCues, subtitleOffset]);

    // Broadcast seek periodically (for time sync)
    useEffect(() => {
        if (syncChannelRef.current && isPlaying) {
            const interval = setInterval(() => {
                syncChannelRef.current?.postMessage({
                    type: 'SYNC_STATE',
                    payload: { currentTime, isPlaying, duration },
                    timestamp: Date.now()
                });
            }, 2000); // Sync every 2 seconds
            return () => clearInterval(interval);
        }
    }, [currentTime, isPlaying, duration]);

    // Open detached window - now just opens the window, sync via BroadcastChannel
    const openDetachedWindow = useCallback(() => {
        window.open('/detached.html', 'SynCinema_Detached', 'width=960,height=600,resizable=yes');
        // No need to store reference - BroadcastChannel handles sync
    }, []);

    const formatTime = (time: number) => {
        const minutes = Math.floor(time / 60);
        const seconds = Math.floor(time % 60);
        return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    };

    const handleUserActivity = useCallback(() => {
        setShowControls(true);
        if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
        // Auto-hide controls after 3 seconds in fullscreen, 5 seconds otherwise
        if (isPlaying || isFullscreen) {
            const timeout = isFullscreen ? 3000 : 5000;
            controlsTimeoutRef.current = window.setTimeout(() => setShowControls(false), timeout);
        }
    }, [isPlaying, isFullscreen]);

    useEffect(() => {
        if (isPlaying || isFullscreen) handleUserActivity();
        else {
            setShowControls(true);
            if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current);
        }
        return () => { if (controlsTimeoutRef.current) window.clearTimeout(controlsTimeoutRef.current); };
    }, [isPlaying, isFullscreen, handleUserActivity]);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
            setShowControls(true);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    const toggleFullscreen = async () => {
        if (!containerRef.current) return;
        if (!document.fullscreenElement) {
            try { await containerRef.current.requestFullscreen(); } catch (err) { console.error(err); }
        } else {
            if (document.exitFullscreen) await document.exitFullscreen();
        }
    };

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
                    break;

                // Seek 5 seconds
                case 'ArrowLeft':
                    e.preventDefault();
                    if (video) {
                        video.currentTime = Math.max(0, video.currentTime - 5);
                        setCurrentTime(video.currentTime);
                    }
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    if (video) {
                        video.currentTime = Math.min(video.duration, video.currentTime + 5);
                        setCurrentTime(video.currentTime);
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
            onMouseMove={handleUserActivity}
            onClick={handleUserActivity}
        >
            <div className="flex-1 flex items-center justify-center relative overflow-hidden group">
                {videoObjectUrl ? (
                    <video
                        ref={videoRef}
                        src={videoObjectUrl}
                        className="max-w-full max-h-full shadow-2xl"
                        onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
                        onEnded={() => setIsPlaying(false)}
                        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
                    />
                ) : (
                    <div className="text-center text-gray-600">
                        <Film size={64} className="mx-auto mb-4 opacity-20" />
                        <h2 className="text-xl font-medium text-gray-500">{t.player.noVideoLoaded}</h2>
                    </div>
                )}
                {videoObjectUrl && !isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 cursor-pointer backdrop-blur-[2px]" onClick={togglePlay}>
                        <div className="p-6 bg-white/10 rounded-full backdrop-blur-md border border-white/20 hover:scale-110 transition-transform">
                            <Play size={48} fill="currentColor" className="text-white ml-1" />
                        </div>
                    </div>
                )}

                {/* Subtitle Overlay */}
                {subtitleCues.length > 0 && (
                    <div className="absolute bottom-24 left-0 right-0 text-center pointer-events-none p-4">
                        {subtitleCues
                            .filter(cue => currentTime >= (cue.startTime + subtitleOffset) && currentTime <= (cue.endTime + subtitleOffset))
                            .map(cue => (
                                <div key={cue.id} className="bg-black/60 text-white text-lg md:text-2xl px-3 py-1 rounded inline-block mx-auto backdrop-blur-sm shadow-lg whitespace-pre-wrap">
                                    {cue.text}
                                </div>
                            ))
                        }
                    </div>
                )}
            </div>

            {/* Controls Bar - Overlay in fullscreen */}
            <div
                className={`
                    h-24 bg-gray-900 border-t border-gray-800 p-4 flex flex-col justify-center gap-2 relative z-50 transition-all duration-500 ease-in-out
                    ${isFullscreen
                        ? `absolute bottom-0 left-0 right-0 ${!showControls ? 'opacity-0 translate-y-full pointer-events-none' : 'opacity-100 translate-y-0'}`
                        : ''
                    }
                `}
                onMouseEnter={handleUserActivity}
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
                            className="w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 hover:accent-indigo-400 transition-all pointer-events-none"
                        />
                    </div>

                    <span className="text-xs font-mono text-gray-400 w-12">{formatTime(duration)}</span>
                </div>
                <div className="flex items-center justify-center px-4">
                    {/* Left side buttons - hidden but takes space for centering */}
                    <div className="flex-1 flex justify-start">
                        {/* Empty space for balance */}
                    </div>

                    {/* Center controls - Play/Pause and Skip */}
                    <div className="flex items-center gap-6">
                        <button
                            onClick={() => { if (videoRef.current) { videoRef.current.currentTime -= 10; setCurrentTime(videoRef.current.currentTime); } }}
                            className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                        >
                            <RotateCcw size={20} /><span className="sr-only">-10s</span>
                        </button>
                        <button
                            onClick={togglePlay}
                            className="p-3 bg-white text-black rounded-full hover:bg-gray-200 transition-transform hover:scale-105 active:scale-95"
                        >
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" />}
                        </button>
                        <button
                            onClick={() => { if (videoRef.current) { videoRef.current.currentTime += 10; setCurrentTime(videoRef.current.currentTime); } }}
                            className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg"
                        >
                            <RotateCcw size={20} className="-scale-x-100" /><span className="sr-only">+10s</span>
                        </button>
                    </div>

                    {/* Right side buttons - Volume, Fullscreen, Detach */}
                    <div className="flex-1 flex items-center justify-end gap-4">
                        <div className="flex items-center gap-2 group relative">
                            <Volume2 size={20} className="text-gray-600 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white transition-colors" />
                            <input
                                type="range"
                                min="0"
                                max="1"
                                step="0.05"
                                defaultValue="1"
                                onChange={(e) => { if (videoRef.current) videoRef.current.volume = parseFloat(e.target.value); }}
                                className="w-20 h-1.5 bg-gray-300 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                            />
                        </div>
                        <button onClick={toggleFullscreen} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg">
                            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>
                        <button onClick={openDetachedWindow} className="text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors p-2 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg" title="Detach Player">
                            <Maximize size={20} className="rotate-45" />
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
