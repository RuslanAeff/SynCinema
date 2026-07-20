/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Video Player Hook
 *  @author Ruslan Aliyev
 *  Core video playback, subtitles, and marker management
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { ExtendedMediaElement } from '../types';
import { getVideoFingerprint } from '../utils/fileFingerprint';

// `currentTime` fans out to the whole tree — sidebar, every audio track row, the
// subtitle overlay — so committing it on every animation frame makes playback cost
// a full re-render 60x/second. Displays are MM:SS and the progress bar moves
// sub-pixel per tick, so committing at 10Hz is visually identical and ~6x cheaper.
const TIME_COMMIT_INTERVAL_MS = 100;

export const useVideoPlayer = () => {
    const [videoFile, setVideoFile] = useState<File | null>(null);
    const [videoObjectUrl, setVideoObjectUrl] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [videoVolume, setVideoVolume] = useState(1);
    const [videoMuted, setVideoMuted] = useState(false);
    const [videoDeviceId, setVideoDeviceId] = useState(''); // Output device for video audio
    const [markers, setMarkers] = useState<{ id: string; time: number; label: string }[]>([]);

    const videoRef = useRef<HTMLVideoElement>(null);

    // Sync video volume with video element
    useEffect(() => {
        if (videoRef.current) {
            videoRef.current.volume = videoVolume;
            videoRef.current.muted = videoMuted;
        }
    }, [videoVolume, videoMuted]);

    // Handle video output device change
    useEffect(() => {
        const video = videoRef.current as ExtendedMediaElement | null;
        if (!video) return;

        const setOutputDevice = async () => {
            if ('setSinkId' in video) {
                try {
                    await video.setSinkId(videoDeviceId || '');
                    console.log('[Video] Output device set to:', videoDeviceId || 'default');
                } catch (err) {
                    console.error('[Video] Failed to set output device:', err);
                }
            }
        };

        setOutputDevice();
    }, [videoDeviceId]);

    const loadVideo = useCallback((file: File) => {
        if (videoObjectUrl && !videoObjectUrl.startsWith('http')) {
            URL.revokeObjectURL(videoObjectUrl);
        }
        const url = URL.createObjectURL(file);
        setVideoFile(file);
        setVideoObjectUrl(url);
        setIsPlaying(false);
        setCurrentTime(0);
    }, [videoObjectUrl]);

    // Load video from URL (Google Drive, direct links, etc.)
    const loadVideoFromUrl = useCallback((url: string, filename: string) => {
        if (videoObjectUrl && !videoObjectUrl.startsWith('http')) {
            URL.revokeObjectURL(videoObjectUrl);
        }
        // Create a fake File object for display purposes
        const fakeFile = new File([], filename, { type: 'video/mp4' });
        setVideoFile(fakeFile);
        setVideoObjectUrl(url);
        setIsPlaying(false);
        setCurrentTime(0);
        console.log('[Video] Loading from URL:', url);
    }, [videoObjectUrl]);

    const togglePlay = useCallback(() => {
        if (videoRef.current) {
            if (isPlaying) videoRef.current.pause();
            else videoRef.current.play();
            setIsPlaying(!isPlaying);
        }
    }, [isPlaying]);

    const handleSeek = useCallback((time: number) => {
        if (videoRef.current) {
            videoRef.current.currentTime = time;
            setCurrentTime(time);
        }
    }, []);

    // Update loop for current time — tracks playback every frame but only commits
    // to React state every TIME_COMMIT_INTERVAL_MS (see note at top of file).
    useEffect(() => {
        let animationFrameId: number;
        let lastCommit = 0;

        const updateLoop = (now: number) => {
            if (videoRef.current && !videoRef.current.paused) {
                if (now - lastCommit >= TIME_COMMIT_INTERVAL_MS) {
                    lastCommit = now;
                    setCurrentTime(videoRef.current.currentTime);
                }
                animationFrameId = requestAnimationFrame(updateLoop);
            }
        };

        if (isPlaying) animationFrameId = requestAnimationFrame(updateLoop);
        else if (videoRef.current) setCurrentTime(videoRef.current.currentTime);

        return () => cancelAnimationFrame(animationFrameId);
    }, [isPlaying]);

    const [subtitleCues, setSubtitleCues] = useState<{ id: string, startTime: number, endTime: number, text: string }[]>([]);
    const [subtitleOffset, setSubtitleOffset] = useState(0);

    const parseSRT = (text: string) => {
        const cues = [];
        const blocks = text.trim().split(/\n\s*\n/);
        for (const block of blocks) {
            const lines = block.split('\n');
            if (lines.length >= 3) {
                const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
                if (timeMatch) {
                    const start = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
                    const end = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;
                    cues.push({
                        id: lines[0],
                        startTime: start,
                        endTime: end,
                        text: lines.slice(2).join('\n')
                    });
                }
            }
        }
        return cues;
    };

    const loadSubtitles = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            setSubtitleCues(parseSRT(text));
        };
        reader.readAsText(file);
    }, []);

    // Marker functions
    const addMarker = useCallback((label?: string) => {
        const newMarker = {
            id: crypto.randomUUID(),
            time: currentTime,
            label: label || `Marker ${markers.length + 1}`
        };
        setMarkers(prev => [...prev, newMarker].sort((a, b) => a.time - b.time));
    }, [currentTime, markers.length]);

    const deleteMarker = useCallback((id: string) => {
        setMarkers(prev => prev.filter(m => m.id !== id));
    }, []);

    return {
        videoFile,
        videoObjectUrl,
        isPlaying,
        currentTime,
        duration,
        videoRef,
        subtitleCues,
        subtitleOffset,
        videoVolume,
        videoMuted,
        videoDeviceId,
        markers,
        loadVideo,
        loadVideoFromUrl,
        loadSubtitles,
        setSubtitleOffset,
        setVideoVolume,
        setVideoMuted,
        setVideoDeviceId,
        addMarker,
        deleteMarker,
        togglePlay,
        handleSeek,
        setDuration,
        setIsPlaying,
        setCurrentTime,
        videoFingerprint: getVideoFingerprint(videoFile, videoObjectUrl)
    };
};
