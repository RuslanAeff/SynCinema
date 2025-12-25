import React, { useEffect, useRef, useState } from 'react';

interface VuMeterProps {
    audioElement: HTMLMediaElement | null;
}

export const VuMeter: React.FC<VuMeterProps> = ({ audioElement }) => {
    const [level, setLevel] = useState(0);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationRef = useRef<number>(0);
    const contextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);

    useEffect(() => {
        if (!audioElement) return;

        // Avoid creating multiple contexts/sources for the same element
        if (sourceRef.current) return;

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            const ctx = new AudioContextClass();
            contextRef.current = ctx;

            const analyser = ctx.createAnalyser();
            analyser.fftSize = 256;
            analyserRef.current = analyser;

            const source = ctx.createMediaElementSource(audioElement);
            sourceRef.current = source;

            source.connect(analyser);
            analyser.connect(ctx.destination);

            const dataArray = new Uint8Array(analyser.frequencyBinCount);

            const update = () => {
                if (!analyserRef.current) return;
                analyserRef.current.getByteFrequencyData(dataArray);

                // Calculate RMS (Root Mean Square) for a smoother reading
                let sum = 0;
                for (let i = 0; i < dataArray.length; i++) {
                    sum += dataArray[i] * dataArray[i];
                }
                const rms = Math.sqrt(sum / dataArray.length);
                const normalizedLevel = Math.min(1, rms / 128); // Normalize to 0-1

                setLevel(normalizedLevel);
                animationRef.current = requestAnimationFrame(update);
            };

            update();

        } catch (err) {
            console.error("VU Meter Error:", err);
        }

        return () => {
            cancelAnimationFrame(animationRef.current);
            // Note: We don't destroy the context here because it may be shared with EQ
        };
    }, [audioElement]);

    // Level indicator colors
    const getBarColor = (threshold: number) => {
        if (level >= threshold) {
            if (threshold >= 0.9) return 'bg-red-500';
            if (threshold >= 0.7) return 'bg-yellow-500';
            return 'bg-green-500';
        }
        return 'bg-gray-700';
    };

    const bars = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0];

    return (
        <div className="flex gap-0.5 h-4 items-end">
            {bars.map((threshold, i) => (
                <div
                    key={i}
                    className={`w-1, rounded-full transition-all duration-75 ${getBarColor(threshold)}`}
                    style={{ height: `${(i + 1) * 10}%` }}
                />
            ))}
        </div>
    );
};
