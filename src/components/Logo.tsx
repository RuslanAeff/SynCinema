import React, { useMemo, useState, useEffect } from 'react';

export const Logo: React.FC<{ size?: number, className?: string }> = ({ size = 32, className = '' }) => {
    // Check if we're in festive season (Dec 20 - Jan 10)
    const [isFestive, setIsFestive] = useState(false);

    useEffect(() => {
        const now = new Date();
        const month = now.getMonth();
        const day = now.getDate();

        const festive =
            (month === 11 && day >= 20) || // Dec 20-31
            (month === 0 && day <= 10);    // Jan 1-10

        setIsFestive(festive);
    }, []);

    // Generate jagged audio data for visualizer effect
    const outerBars = useMemo(() => {
        return Array.from({ length: 32 }).map((_, i) => {
            const angle = (i * 360) / 32;
            const height = 4 + Math.random() * 8; // Random height for "audio" look
            return { angle, height };
        });
    }, []);

    const innerBars = useMemo(() => {
        return Array.from({ length: 24 }).map((_, i) => {
            const angle = (i * 360) / 24;
            const height = 3 + Math.random() * 5;
            return { angle, height };
        });
    }, []);

    return (
        <svg
            width={size * (isFestive ? 1.3 : 1)}
            height={size * (isFestive ? 1.25 : 1)}
            viewBox={isFestive ? "-15 -25 130 125" : "0 0 100 100"}
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <filter id="neon-glow-strong" x="-100%" y="-100%" width="300%" height="300%">
                    <feGaussianBlur stdDeviation="2.5" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="coloredBlur" /> {/* Double blur for extra glow */}
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
                <linearGradient id="neon-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#6366f1', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#d946ef', stopOpacity: 1 }} />
                </linearGradient>
                {/* Santa hat gradient */}
                <linearGradient id="santa-red" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" style={{ stopColor: '#ef4444', stopOpacity: 1 }} />
                    <stop offset="100%" style={{ stopColor: '#b91c1c', stopOpacity: 1 }} />
                </linearGradient>
            </defs>

            {/* 🎅 Santa Hat - Only during festive season */}
            {isFestive && (
                <g>
                    {/* Hat white fur trim - bottom (centered on logo) */}
                    <ellipse cx="50" cy="8" rx="28" ry="6" fill="white" />

                    {/* Hat red cone (centered) */}
                    <path
                        d="M22 8 Q38 -18 50 -12 Q65 -8 78 8 Z"
                        fill="url(#santa-red)"
                    />

                    {/* Hat tip curve (extending to right) */}
                    <path
                        d="M50 -12 Q72 -8 85 2 Q95 12 100 8"
                        stroke="url(#santa-red)"
                        strokeWidth="9"
                        fill="none"
                        strokeLinecap="round"
                    />

                    {/* Pom-pom */}
                    <circle cx="100" cy="8" r="9" fill="white" />

                    {/* Pom-pom highlight */}
                    <circle cx="97" cy="4" r="2.5" fill="white" opacity="0.6" />
                </g>
            )}

            {/* Outer Audio Ring - Spiky Waveform */}
            <g style={{ filter: 'url(#neon-glow-strong)' }} stroke="url(#neon-grad)" strokeLinecap="round">
                {Array.from({ length: 60 }).map((_, i) => {
                    const angle = (i * 6) * (Math.PI / 180);
                    const rInner = 36;
                    // Create a "spiky" pattern: Alternating high/low to mimic the reference image zig-zag
                    const rOuter = 36 + (i % 2 === 0 ? 8 : 2) + Math.sin(i) * 2;

                    const x1 = 50 + rInner * Math.cos(angle);
                    const y1 = 50 + rInner * Math.sin(angle);
                    const x2 = 50 + rOuter * Math.cos(angle);
                    const y2 = 50 + rOuter * Math.sin(angle);

                    return <line key={`out-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="1.5" opacity="0.9" />;
                })}
            </g>

            {/* Inner Audio Ring - Smaller Spikes */}
            <g style={{ filter: 'url(#neon-glow-strong)' }} stroke="url(#neon-grad)" strokeLinecap="round">
                {Array.from({ length: 40 }).map((_, i) => {
                    const angle = (i * 9) * (Math.PI / 180);
                    const rInner = 24;
                    // Pattern for inner ring
                    const rOuter = 24 + (i % 3 === 0 ? 6 : 2);

                    const x1 = 50 + rInner * Math.cos(angle);
                    const y1 = 50 + rInner * Math.sin(angle);
                    const x2 = 50 + rOuter * Math.cos(angle);
                    const y2 = 50 + rOuter * Math.sin(angle);

                    return <line key={`in-${i}`} x1={x1} y1={y1} x2={x2} y2={y2} strokeWidth="1.2" opacity="0.8" />;
                })}
            </g>

            {/* Main Play Triangle - Thick and Glowing */}
            <path
                d="M42 34 L 66 50 L 42 66 Z"
                fill="white"
                stroke="#d946ef"
                strokeWidth="2.5"
                strokeLinejoin="round"
                style={{ filter: 'url(#neon-glow-strong)' }}
            />
        </svg>
    );
};
