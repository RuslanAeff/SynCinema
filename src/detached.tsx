/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Detached Player (BroadcastChannel Implementation)
 *  @author Ruslan Aliyev
 *  Synchronized video player window using BroadcastChannel API
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import { Play, Pause, Maximize, Minimize, Volume2, VolumeX } from 'lucide-react';

interface SubtitleCue {
    start: number;
    end: number;
    text: string;
}

const CHANNEL_NAME = 'syncinema-player-sync';

const DetachedPlayer: React.FC = () => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const channelRef = useRef<BroadcastChannel | null>(null);

    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [subtitleCues, setSubtitleCues] = useState<SubtitleCue[]>([]);
    const [subtitleOffset, setSubtitleOffset] = useState(0);
    const [isConnected, setIsConnected] = useState(false);
    const [showControls, setShowControls] = useState(true);

    const lastSyncRef = useRef<number>(0);

    // Target state to sync to when video is ready
    const targetStateRef = useRef<{ currentTime: number; isPlaying: boolean } | null>(null);

    // Apply target state to video (called when video is ready or state changes)
    const applyTargetState = useCallback(() => {
        const video = videoRef.current;
        const target = targetStateRef.current;

        if (!video || !target) return;

        // Only apply if video is ready (readyState >= 2 means HAVE_CURRENT_DATA)
        if (video.readyState < 2) {
            console.log('[Detached] Video not ready yet, readyState:', video.readyState);
            return;
        }

        console.log('[Detached] Applying target state:', target, 'video currentTime:', video.currentTime);

        // Seek if needed
        if (Math.abs(video.currentTime - target.currentTime) > 0.5) {
            console.log('[Detached] Seeking to:', target.currentTime);
            video.currentTime = target.currentTime;
        }

        // Play/Pause if needed
        if (target.isPlaying && video.paused) {
            console.log('[Detached] Starting playback');
            video.play().catch(e => console.log('[Detached] Play failed:', e));
        } else if (!target.isPlaying && !video.paused) {
            console.log('[Detached] Pausing');
            video.pause();
        }

        // Clear applied state
        targetStateRef.current = null;
    }, []);

    // Initialize BroadcastChannel
    useEffect(() => {
        const channel = new BroadcastChannel(CHANNEL_NAME);
        channelRef.current = channel;

        channel.onmessage = (event: MessageEvent) => {
            const { type, payload, timestamp } = event.data;

            // Ignore old messages
            if (timestamp && timestamp < lastSyncRef.current - 1000) return;
            if (timestamp) lastSyncRef.current = timestamp;

            switch (type) {
                case 'SYNC_VIDEO_URL':
                    console.log('[Detached] Received video URL');
                    setVideoUrl(payload);
                    setIsConnected(true);
                    break;

                case 'SYNC_STATE':
                    if (payload) {
                        console.log('[Detached] Received SYNC_STATE:', payload);
                        setDuration(payload.duration || 0);
                        setCurrentTime(payload.currentTime);
                        setIsPlaying(payload.isPlaying);
                        setIsConnected(true);

                        // Store target state
                        targetStateRef.current = {
                            currentTime: payload.currentTime,
                            isPlaying: payload.isPlaying
                        };
                    }
                    break;

                case 'SYNC_SEEK':
                    if (payload !== undefined) {
                        console.log('[Detached] Received SYNC_SEEK:', payload);
                        setCurrentTime(payload);
                        if (videoRef.current && videoRef.current.readyState >= 2) {
                            videoRef.current.currentTime = payload;
                        } else {
                            targetStateRef.current = { currentTime: payload, isPlaying };
                        }
                    }
                    break;

                case 'SYNC_PLAY':
                    console.log('[Detached] Received SYNC_PLAY');
                    setIsPlaying(true);
                    if (videoRef.current && videoRef.current.readyState >= 2) {
                        videoRef.current.play().catch(() => { });
                    }
                    break;

                case 'SYNC_PAUSE':
                    console.log('[Detached] Received SYNC_PAUSE');
                    setIsPlaying(false);
                    if (videoRef.current) {
                        videoRef.current.pause();
                    }
                    break;

                case 'SYNC_SUBTITLES':
                    if (payload) {
                        setSubtitleCues(payload.cues || []);
                        setSubtitleOffset(payload.offset || 0);
                    }
                    break;
            }
        };

        // Request initial state from main window
        channel.postMessage({ type: 'DETACHED_READY', timestamp: Date.now() });

        return () => { channel.close(); };
    }, [isPlaying]);

    // Watch for video URL changes and apply state when video becomes ready
    useEffect(() => {
        if (!videoUrl) return;

        const video = videoRef.current;
        if (!video) return;

        const handleLoadedData = () => {
            console.log('[Detached] Video loadeddata event, readyState:', video.readyState);
            applyTargetState();
        };

        const handleCanPlay = () => {
            console.log('[Detached] Video canplay event, readyState:', video.readyState);
            applyTargetState();
        };

        const handleCanPlayThrough = () => {
            console.log('[Detached] Video canplaythrough event');
            applyTargetState();
        };

        video.addEventListener('loadeddata', handleLoadedData);
        video.addEventListener('canplay', handleCanPlay);
        video.addEventListener('canplaythrough', handleCanPlayThrough);

        return () => {
            video.removeEventListener('loadeddata', handleLoadedData);
            video.removeEventListener('canplay', handleCanPlay);
            video.removeEventListener('canplaythrough', handleCanPlayThrough);
        };
    }, [videoUrl, applyTargetState]);

    // Also try to apply state when target changes (for already-loaded videos)
    useEffect(() => {
        if (targetStateRef.current) {
            // Give React a tick to update and try applying
            const timer = setTimeout(applyTargetState, 100);
            return () => clearTimeout(timer);
        }
    }, [currentTime, isPlaying, applyTargetState]);

    // Handle video time updates
    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        const handleTimeUpdate = () => {
            setCurrentTime(video.currentTime);
        };

        const handleDurationChange = () => {
            setDuration(video.duration);
        };

        const handlePlay = () => setIsPlaying(true);
        const handlePause = () => setIsPlaying(false);

        video.addEventListener('timeupdate', handleTimeUpdate);
        video.addEventListener('durationchange', handleDurationChange);
        video.addEventListener('play', handlePlay);
        video.addEventListener('pause', handlePause);

        return () => {
            video.removeEventListener('timeupdate', handleTimeUpdate);
            video.removeEventListener('durationchange', handleDurationChange);
            video.removeEventListener('play', handlePlay);
            video.removeEventListener('pause', handlePause);
        };
    }, []);

    // Local controls
    const handleLocalSeek = useCallback((time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
            channelRef.current?.postMessage({
                type: 'DETACHED_SEEK',
                payload: time,
                timestamp: Date.now()
            });
        }
    }, []);

    const handleLocalTogglePlay = useCallback(() => {
        const newState = !isPlaying;
        channelRef.current?.postMessage({
            type: newState ? 'DETACHED_PLAY' : 'DETACHED_PAUSE',
            timestamp: Date.now()
        });
    }, [isPlaying]);

    const toggleFullscreen = useCallback(() => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
            setIsFullscreen(true);
        } else {
            document.exitFullscreen();
            setIsFullscreen(false);
        }
    }, []);

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    // Get active subtitles
    const activeSubtitles = subtitleCues.filter(
        cue => currentTime + subtitleOffset >= cue.start && currentTime + subtitleOffset <= cue.end
    );

    // Hide controls after inactivity
    useEffect(() => {
        let timeout: number;
        const handleMouseMove = () => {
            setShowControls(true);
            clearTimeout(timeout);
            timeout = window.setTimeout(() => {
                if (isPlaying) setShowControls(false);
            }, 3000);
        };

        document.addEventListener('mousemove', handleMouseMove);
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            clearTimeout(timeout);
        };
    }, [isPlaying]);

    return (
        <div className="h-screen w-screen bg-black flex flex-col overflow-hidden">
            {/* Video Container */}
            <div
                className="flex-1 relative flex items-center justify-center bg-black"
                onDoubleClick={toggleFullscreen}
            >
                {videoUrl ? (
                    <>
                        <video
                            ref={videoRef}
                            src={videoUrl}
                            className="max-h-full max-w-full object-contain"
                            muted={isMuted}
                            playsInline
                            preload="auto"
                        />

                        {/* Subtitle Overlay */}
                        {activeSubtitles.length > 0 && (
                            <div className="absolute bottom-20 left-0 right-0 text-center pointer-events-none">
                                {activeSubtitles.map((cue, i) => (
                                    <div
                                        key={i}
                                        className="inline-block bg-black/80 text-white text-lg md:text-2xl px-4 py-2 rounded-lg mb-1"
                                        style={{ textShadow: '2px 2px 4px rgba(0,0,0,0.8)' }}
                                    >
                                        {cue.text}
                                    </div>
                                ))}
                            </div>
                        )}

                        {/* Play Button Overlay */}
                        {!isPlaying && (
                            <button
                                onClick={handleLocalTogglePlay}
                                className="absolute inset-0 flex items-center justify-center bg-black/30 hover:bg-black/40 transition-colors"
                            >
                                <div className="w-20 h-20 rounded-full bg-white/90 flex items-center justify-center">
                                    <Play size={40} className="text-black ml-1" fill="currentColor" />
                                </div>
                            </button>
                        )}

                        {/* Connection Status */}
                        <div className={`absolute top-4 right-4 px-3 py-1 rounded-full text-xs font-medium transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'} ${isConnected ? 'bg-green-500/80' : 'bg-yellow-500/80'}`}>
                            {isConnected ? '● Connected' : '○ Waiting...'}
                        </div>

                        {/* Muted Indicator */}
                        {isMuted && (
                            <div className={`absolute top-4 left-4 px-3 py-1 rounded-full text-xs bg-gray-800/80 text-gray-300 transition-opacity ${showControls ? 'opacity-100' : 'opacity-0'}`}>
                                🔇 Audio from main window
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-gray-500 text-center">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center animate-pulse">
                            <Play size={32} className="text-gray-600" />
                        </div>
                        <p className="text-lg mb-2">Waiting for video...</p>
                        <p className="text-sm text-gray-600">Load a video in the main SynCinema window</p>
                    </div>
                )}
            </div>

            {/* Controls Bar */}
            <div className={`h-20 bg-gray-900/95 border-t border-gray-800 p-4 flex flex-col justify-center gap-2 transition-opacity duration-300 ${showControls || !isPlaying ? 'opacity-100' : 'opacity-0'}`}>
                {/* Progress Bar */}
                <div className="flex items-center gap-4">
                    <span className="text-xs font-mono text-gray-400 w-12 text-right">{formatTime(currentTime)}</span>
                    <input
                        type="range"
                        min={0}
                        max={duration || 100}
                        value={currentTime}
                        onChange={(e) => handleLocalSeek(parseFloat(e.target.value))}
                        className="flex-1 h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                    />
                    <span className="text-xs font-mono text-gray-400 w-12">{formatTime(duration)}</span>
                </div>

                {/* Control Buttons */}
                <div className="flex items-center justify-between px-4">
                    <div className="w-24 text-xs text-gray-500">
                        Detached View
                    </div>

                    <div className="flex items-center gap-6">
                        <button
                            onClick={handleLocalTogglePlay}
                            className="p-3 bg-white text-black rounded-full hover:bg-gray-200 transition-transform hover:scale-105"
                        >
                            {isPlaying ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" className="ml-1" />}
                        </button>
                    </div>

                    <div className="flex items-center gap-4 w-24 justify-end">
                        <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="text-gray-400 hover:text-white transition-colors p-2"
                            title={isMuted ? "Unmute" : "Mute"}
                        >
                            {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                        </button>
                        <button
                            onClick={toggleFullscreen}
                            className="text-gray-400 hover:text-white transition-colors p-2"
                        >
                            {isFullscreen ? <Minimize size={20} /> : <Maximize size={20} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Mount the app
const rootElement = document.getElementById('root');
if (rootElement) {
    const root = ReactDOM.createRoot(rootElement);
    root.render(<DetachedPlayer />);
}
