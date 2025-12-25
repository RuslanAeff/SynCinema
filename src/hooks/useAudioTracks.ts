/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Audio Tracks Hook
 *  @author Ruslan Aliyev
 *  Multi-output audio management with Web Audio API integration
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioTrack, AudioDevice } from '../types';

export const useAudioTracks = () => {
    const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
    const [permissionsGranted, setPermissionsGranted] = useState(false);
    const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
    const [masterVolume, setMasterVolume] = useState(1);

    const refreshDevices = useCallback(async () => {
        try {
            if (!permissionsGranted) {
                // We only request permission if not already granted to avoid annoying popups on every refresh if denied
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                // Stop the tracks immediately as we only needed permission
                stream.getTracks().forEach(t => t.stop());
                setPermissionsGranted(true);
            }
            const devices = await navigator.mediaDevices.enumerateDevices();
            const outputs = devices.filter(d => d.kind === 'audiooutput');
            setAudioDevices(outputs);
        } catch (err) {
            console.error("Error fetching devices:", err);
        }
    }, [permissionsGranted]);

    useEffect(() => {
        refreshDevices();
        navigator.mediaDevices.addEventListener('devicechange', refreshDevices);
        return () => navigator.mediaDevices.removeEventListener('devicechange', refreshDevices);
    }, [refreshDevices]);

    // Load preferences from local storage
    const getStoredPrefs = useCallback(() => {
        try {
            return JSON.parse(localStorage.getItem('synCinema_trackPrefs') || '{}');
        } catch { return {}; }
    }, []);

    const saveTrackPref = useCallback((name: string, pref: Partial<AudioTrack>) => {
        const prefs = getStoredPrefs();
        prefs[name] = { ...prefs[name], ...pref };
        localStorage.setItem('synCinema_trackPrefs', JSON.stringify(prefs));
    }, [getStoredPrefs]);

    const addAudioTracks = useCallback((files: FileList | null) => {
        if (!files) return;

        const prefs = getStoredPrefs();

        const newTracks: AudioTrack[] = Array.from(files).map(file => {
            const saved = prefs[file.name] || {};
            return {
                id: crypto.randomUUID(),
                name: file.name,
                file: file,
                objectUrl: URL.createObjectURL(file),
                offset: saved.offset || 0,
                playbackRate: saved.playbackRate || 1.0,
                deviceId: saved.deviceId || '',
                volume: 1,
                isMuted: false,
                eq: saved.eq || { low: 0, mid: 0, high: 0 },
                useCompressor: saved.useCompressor || false
            };
        });
        setAudioTracks(prev => [...prev, ...newTracks]);
    }, [getStoredPrefs]);

    const updateAudioTrack = useCallback((id: string, updates: Partial<AudioTrack>) => {
        setAudioTracks(prev => prev.map(t => {
            if (t.id === id) {
                const updated = { ...t, ...updates };
                // Save important metrics to persistence
                if (
                    updates.offset !== undefined ||
                    updates.playbackRate !== undefined ||
                    updates.deviceId !== undefined ||
                    updates.eq !== undefined ||
                    updates.useCompressor !== undefined
                ) {
                    saveTrackPref(t.name, {
                        offset: updated.offset,
                        playbackRate: updated.playbackRate,
                        deviceId: updated.deviceId,
                        eq: updated.eq,
                        useCompressor: updated.useCompressor
                    });
                }
                return updated;
            }
            return t;
        }));
    }, [saveTrackPref]);

    const deleteAudioTrack = useCallback((id: string) => {
        setAudioTracks(prev => {
            const track = prev.find(t => t.id === id);
            if (track) URL.revokeObjectURL(track.objectUrl);
            return prev.filter(t => t.id !== id);
        });
    }, []);

    const exportProject = useCallback(() => {
        const prefs = getStoredPrefs();
        // Include all app settings
        const fullExport = {
            version: '1.0',
            exportDate: new Date().toISOString(),
            trackPrefs: prefs,
            appSettings: {
                masterVolume: masterVolume,
                theme: localStorage.getItem('synCinema_theme') || 'dark'
            }
        };
        // Create a blob and trigger download
        const blob = new Blob([JSON.stringify(fullExport, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `syncinema_project_${new Date().toISOString().slice(0, 10)}.sync`;
        a.click();
        URL.revokeObjectURL(url);
    }, [getStoredPrefs, masterVolume]);

    const importProject = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = e.target?.result as string;
                console.log("Importing Project JSON:", json);

                const data = JSON.parse(json);

                // Handle both old format (flat prefs) and new format (with version)
                const prefs = data.trackPrefs || data;
                const appSettings = data.appSettings;

                localStorage.setItem('synCinema_trackPrefs', JSON.stringify(prefs));

                // Apply app settings if present
                if (appSettings) {
                    if (appSettings.masterVolume !== undefined) {
                        setMasterVolume(appSettings.masterVolume);
                    }
                    if (appSettings.theme) {
                        localStorage.setItem('synCinema_theme', appSettings.theme);
                    }
                }

                // Update currently loaded tracks if they match
                let matchCount = 0;
                setAudioTracks(prev => prev.map(t => {
                    if (prefs[t.name]) {
                        console.log(`Matching settings found for track: ${t.name}`, prefs[t.name]);
                        matchCount++;
                        return {
                            ...t,
                            ...prefs[t.name],
                            eq: prefs[t.name].eq || t.eq,
                            useCompressor: prefs[t.name].useCompressor ?? t.useCompressor
                        };
                    }
                    return t;
                }));

                const trackCount = Object.keys(prefs).length;
                alert(`Project loaded! Found settings for ${trackCount} tracks.\n${matchCount} active tracks updated.\n\n${appSettings ? 'App settings restored. Refresh for theme change.' : ''}`);
            } catch (err) {
                console.error("Failed to load project", err);
                alert("Error parsing project file. Please check if it's a valid .sync or .json file.");
            }
        };
        reader.readAsText(file);
    }, [setMasterVolume]);

    return {
        audioTracks,
        audioDevices,
        permissionsGranted,
        masterVolume,
        setMasterVolume,
        refreshDevices,
        addAudioTracks,
        updateAudioTrack,
        deleteAudioTrack,
        exportProject,
        importProject
    };
};
