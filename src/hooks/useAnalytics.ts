/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - useAnalytics Hook
 *  @author Ruslan Aliyev
 *  Tracks and stores usage statistics in localStorage
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useEffect, useCallback, useRef } from 'react';

// Analytics data structure
export interface AnalyticsData {
    totalWatchTime: number; // in seconds
    sessionCount: number;
    videosLoaded: number;
    audioTracksAdded: number;
    projectsSaved: number;
    projectsLoaded: number;
    playPauseCount: number;
    seekCount: number;
    volumeAdjustments: number;
    eqAdjustments: number;
    subtitlesLoaded: number;
    markersAdded: number;
    fullscreenToggles: number;
    detachOpened: number;
    firstUsed: string; // ISO date string
    lastUsed: string; // ISO date string
}

const STORAGE_KEY = 'syncinema_analytics';

const getDefaultAnalytics = (): AnalyticsData => ({
    totalWatchTime: 0,
    sessionCount: 0,
    videosLoaded: 0,
    audioTracksAdded: 0,
    projectsSaved: 0,
    projectsLoaded: 0,
    playPauseCount: 0,
    seekCount: 0,
    volumeAdjustments: 0,
    eqAdjustments: 0,
    subtitlesLoaded: 0,
    markersAdded: 0,
    fullscreenToggles: 0,
    detachOpened: 0,
    firstUsed: new Date().toISOString(),
    lastUsed: new Date().toISOString(),
});

const loadAnalytics = (): AnalyticsData => {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            // Merge with defaults to handle new fields
            return { ...getDefaultAnalytics(), ...parsed };
        }
    } catch (e) {
        console.error('Failed to load analytics:', e);
    }
    return getDefaultAnalytics();
};

const saveAnalytics = (data: AnalyticsData): void => {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
        console.error('Failed to save analytics:', e);
    }
};

export interface UseAnalyticsReturn {
    analytics: AnalyticsData;
    trackEvent: (event: keyof Omit<AnalyticsData, 'totalWatchTime' | 'firstUsed' | 'lastUsed'>) => void;
    trackWatchTime: (seconds: number) => void;
    resetAnalytics: () => void;
    formatWatchTime: (seconds: number) => string;
}

export function useAnalytics(): UseAnalyticsReturn {
    const [analytics, setAnalytics] = useState<AnalyticsData>(() => loadAnalytics());
    const sessionCounted = useRef<boolean>(false);

    // Increment session count on first mount (only once per browser session)
    useEffect(() => {
        // Use sessionStorage to prevent double counting in React StrictMode
        const alreadyCounted = sessionStorage.getItem('syncinema_session_counted');

        if (!alreadyCounted && !sessionCounted.current) {
            sessionCounted.current = true;
            sessionStorage.setItem('syncinema_session_counted', 'true');

            setAnalytics(prev => {
                const updated = {
                    ...prev,
                    sessionCount: prev.sessionCount + 1,
                    lastUsed: new Date().toISOString(),
                };
                saveAnalytics(updated);
                return updated;
            });
        }
    }, []);

    // Periodically save analytics to localStorage (state is already updated by trackWatchTime)
    useEffect(() => {
        const interval = setInterval(() => {
            // Just save current state to localStorage periodically
            setAnalytics(prev => {
                saveAnalytics(prev);
                return prev;
            });
        }, 5000); // Save every 5 seconds

        return () => {
            clearInterval(interval);
            // Save on unmount
            const current = loadAnalytics();
            setAnalytics(prev => {
                saveAnalytics(prev);
                return prev;
            });
        };
    }, []);

    // Track a specific event
    const trackEvent = useCallback((event: keyof Omit<AnalyticsData, 'totalWatchTime' | 'firstUsed' | 'lastUsed'>) => {
        setAnalytics(prev => {
            const updated = {
                ...prev,
                [event]: (prev[event] as number) + 1,
                lastUsed: new Date().toISOString(),
            };
            // Save immediately for better responsiveness
            saveAnalytics(updated);
            return updated;
        });
    }, []);

    // Track watch time (called from video player) - updates state immediately for UI feedback
    const trackWatchTime = useCallback((seconds: number) => {
        // Update state immediately every second for UI feedback
        setAnalytics(prev => ({
            ...prev,
            totalWatchTime: prev.totalWatchTime + seconds,
        }));
    }, []);

    // Reset all analytics
    const resetAnalytics = useCallback(() => {
        const fresh = getDefaultAnalytics();
        setAnalytics(fresh);
        saveAnalytics(fresh);
    }, []);

    // Format watch time as "Xh Ym Zs"
    const formatWatchTime = useCallback((seconds: number): string => {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);

        if (hours > 0) {
            return `${hours}h ${minutes}m ${secs}s`;
        } else if (minutes > 0) {
            return `${minutes}m ${secs}s`;
        } else {
            return `${secs}s`;
        }
    }, []);

    return {
        analytics,
        trackEvent,
        trackWatchTime,
        resetAnalytics,
        formatWatchTime,
    };
}
