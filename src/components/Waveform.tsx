import React, { useEffect, useRef, useState } from 'react';
import WaveSurfer from 'wavesurfer.js';

interface WaveformProps {
    url: string;
    currentTime: number; // Video current time
    offset: number;      // Audio offset relative to video
    isPlaying: boolean;
    onSeek: (time: number) => void;
    height?: number;
}

export const Waveform: React.FC<WaveformProps> = ({
    url,
    currentTime,
    offset,
    isPlaying,
    onSeek,
    height = 40
}) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const wavesurfer = useRef<WaveSurfer | null>(null);
    const [audioDuration, setAudioDuration] = useState(0);

    useEffect(() => {
        if (!containerRef.current) return;

        wavesurfer.current = WaveSurfer.create({
            container: containerRef.current,
            waveColor: '#4f46e5', // Indigo-600
            progressColor: '#818cf8', // Indigo-400
            cursorColor: '#f43f5e', // Rose-500
            height: height,
            normalize: true,
            minPxPerSec: 50,
            interact: false,
            barWidth: 2,
            barGap: 3,
            barRadius: 2,
        });

        wavesurfer.current.load(url);

        wavesurfer.current.on('ready', () => {
            setAudioDuration(wavesurfer.current?.getDuration() || 0);
        });

        return () => {
            wavesurfer.current?.destroy();
        };
    }, [url, height]);

    // Sync Playhead
    useEffect(() => {
        if (wavesurfer.current) {
            const audioTime = Math.max(0, currentTime - offset);
            const duration = wavesurfer.current.getDuration();
            if (duration > 0) {
                const progress = audioTime / duration;
                if (progress >= 0 && progress <= 1) {
                    wavesurfer.current.seekTo(progress);
                }
            }
        }
    }, [currentTime, offset]);

    // Calculate video time indicator position (where video is, relative to audio)
    const videoIndicatorPercent = audioDuration > 0
        ? Math.max(0, Math.min(100, ((currentTime - offset) / audioDuration) * 100))
        : 0;

    return (
        <div className="relative w-full">
            <div ref={containerRef} className="w-full" />
            {/* Video time indicator line */}
            <div
                className="absolute top-0 bottom-0 w-0.5 bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)] pointer-events-none transition-all duration-75"
                style={{ left: `${videoIndicatorPercent}%` }}
            />
        </div>
    );
};
