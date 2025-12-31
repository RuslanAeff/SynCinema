/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Snowfall Component
 *  @author Ruslan Aliyev
 *  Festive snowfall animation for New Year celebration
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useState, useMemo } from 'react';

interface Snowflake {
    id: number;
    x: number;
    size: number;
    duration: number;
    delay: number;
    opacity: number;
}

export const Snowfall: React.FC<{ intensity?: 'light' | 'medium' | 'heavy' }> = ({
    intensity = 'medium'
}) => {
    const [isVisible, setIsVisible] = useState(true);

    const snowflakeCount = useMemo(() => {
        switch (intensity) {
            case 'light': return 30;
            case 'medium': return 50;
            case 'heavy': return 80;
            default: return 50;
        }
    }, [intensity]);

    const snowflakes: Snowflake[] = useMemo(() => {
        return Array.from({ length: snowflakeCount }, (_, i) => ({
            id: i,
            x: Math.random() * 100,
            size: Math.random() * 4 + 2,
            duration: Math.random() * 5 + 8,
            delay: Math.random() * 10,
            opacity: Math.random() * 0.6 + 0.3,
        }));
    }, [snowflakeCount]);

    // Check if we're still in festive season (Dec 20 - Jan 10)
    useEffect(() => {
        const now = new Date();
        const month = now.getMonth();
        const day = now.getDate();

        const isFestiveSeason =
            (month === 11 && day >= 20) || // Dec 20-31
            (month === 0 && day <= 10);    // Jan 1-10

        setIsVisible(isFestiveSeason);
    }, []);

    if (!isVisible) return null;

    return (
        <div
            className="fixed inset-0 pointer-events-none z-50 overflow-hidden"
            aria-hidden="true"
        >
            <style>{`
                @keyframes snowfall {
                    0% {
                        transform: translateY(-10vh) rotate(0deg);
                    }
                    100% {
                        transform: translateY(110vh) rotate(360deg);
                    }
                }
                @keyframes sway {
                    0%, 100% {
                        transform: translateX(0);
                    }
                    50% {
                        transform: translateX(20px);
                    }
                }
                .snowflake {
                    position: absolute;
                    top: -20px;
                    color: white;
                    text-shadow: 0 0 5px rgba(255, 255, 255, 0.8);
                    animation: snowfall linear infinite;
                }
                .snowflake::before {
                    content: '❄';
                    display: block;
                    animation: sway 3s ease-in-out infinite;
                }
            `}</style>

            {snowflakes.map((flake) => (
                <div
                    key={flake.id}
                    className="snowflake"
                    style={{
                        left: `${flake.x}%`,
                        fontSize: `${flake.size}px`,
                        opacity: flake.opacity,
                        animationDuration: `${flake.duration}s`,
                        animationDelay: `${flake.delay}s`,
                    }}
                />
            ))}
        </div>
    );
};
