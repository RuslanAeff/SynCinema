/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Audio Tracks Hook
 *  @author Ruslan Aliyev
 *  Multi-output audio management with Web Audio API integration
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { AudioTrack, AudioDevice } from '../types';
import { useToast } from '../components/Toast';
import { getAudioFingerprint } from '../utils/fileFingerprint';
import { sanitizeImportedTrackPref, sanitizeImportedAppSettings, hadInvalidKnownField } from '../utils/syncImportValidation';

export const useAudioTracks = () => {
    const [audioTracks, setAudioTracks] = useState<AudioTrack[]>([]);
    const [permissionsGranted, setPermissionsGranted] = useState(false);
    const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
    const [masterVolume, setMasterVolume] = useState(1);
    const { showToast } = useToast();

    const refreshDevices = useCallback(async () => {
        try {
            if (!permissionsGranted) {
                // Request microphone permission to enable full device enumeration with labels
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                // Stop the tracks immediately as we only needed permission
                stream.getTracks().forEach(t => t.stop());
                setPermissionsGranted(true);
                // Small delay to let the browser update its internal permission state
                // before enumerating devices — without this, some browsers return
                // devices without labels or incomplete lists
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            const devices = await navigator.mediaDevices.enumerateDevices();
            const outputs = devices.filter(d => d.kind === 'audiooutput');
            setAudioDevices(outputs);
        } catch (err) {
            console.error("Error fetching devices:", err);
        }
    }, [permissionsGranted]);

    useEffect(() => {
        // Do not call refreshDevices() here: it requests microphone permission
        // (getUserMedia), and doing that on mount shows the browser's permission
        // prompt before any user action. refreshDevices() is instead gesture-gated
        // — wired to the sidebar's explicit "Grant Permission" button. This listener
        // only reacts to devices already visible after permission is granted; it
        // does not itself trigger a prompt.
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
                useCompressor: saved.useCompressor || false,
                gainBoost: saved.gainBoost || 1,
                audioFingerprint: getAudioFingerprint(file, null)
            };
        });
        setAudioTracks(prev => [...prev, ...newTracks]);
    }, [getStoredPrefs]);

    // Add audio track from URL (Google Drive, direct links, etc.)
    const addAudioFromUrl = useCallback((url: string, filename: string) => {
        const prefs = getStoredPrefs();
        const saved = prefs[filename] || {};

        const newTrack: AudioTrack = {
            id: crypto.randomUUID(),
            name: filename,
            file: new File([], filename, { type: 'audio/mpeg' }), // Fake file for display
            objectUrl: url, // Use the URL directly
            offset: saved.offset || 0,
            playbackRate: saved.playbackRate || 1.0,
            deviceId: saved.deviceId || '',
            volume: 1,
            isMuted: false,
            eq: saved.eq || { low: 0, mid: 0, high: 0 },
            useCompressor: saved.useCompressor || false,
            gainBoost: saved.gainBoost || 1,
            audioFingerprint: getAudioFingerprint(null, url)
        };

        setAudioTracks(prev => [...prev, newTrack]);
        console.log('[Audio] Loading from URL:', url);
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
                    updates.useCompressor !== undefined ||
                    updates.gainBoost !== undefined
                ) {
                    saveTrackPref(t.name, {
                        offset: updated.offset,
                        playbackRate: updated.playbackRate,
                        deviceId: updated.deviceId,
                        eq: updated.eq,
                        useCompressor: updated.useCompressor,
                        gainBoost: updated.gainBoost
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
        const jsonString = JSON.stringify(fullExport, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        // Create and configure download link
        const fileName = `SynCinema_Project_${new Date().toISOString().slice(0, 10)}.sync`;
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.style.display = 'none';

        // Append to body, click, and remove (better browser compatibility)
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        // Cleanup
        setTimeout(() => URL.revokeObjectURL(url), 1000);

        // Show confirmation
        showToast(`Project saved as: ${fileName}`);
    }, [getStoredPrefs, masterVolume, showToast]);

    const importProject = useCallback((file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const json = e.target?.result as string;
                console.log("Importing Project JSON:", json);

                const data = JSON.parse(json);

                // Handle both old format (flat prefs) and new format (with version)
                const rawPrefs = data.trackPrefs || data;
                const rawAppSettings = data.appSettings;

                // Whitelist-sanitize before this data touches live state OR
                // localStorage: an unsanitized write to localStorage would let a
                // malformed field corrupt a track added later (addAudioTracks/
                // addAudioFromUrl read back from localStorage too), not just the
                // tracks currently loaded.
                let anyInvalidKnownField = false;
                const sanitizedPrefs: Record<string, Partial<AudioTrack>> = {};
                for (const name of Object.keys(rawPrefs)) {
                    const sanitized = sanitizeImportedTrackPref(rawPrefs[name]);
                    sanitizedPrefs[name] = sanitized;
                    if (hadInvalidKnownField(rawPrefs[name], sanitized)) anyInvalidKnownField = true;
                }

                localStorage.setItem('synCinema_trackPrefs', JSON.stringify(sanitizedPrefs));

                // Apply app settings if present
                const appSettings = sanitizeImportedAppSettings(rawAppSettings);
                if (rawAppSettings) {
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
                    const trackPrefs = sanitizedPrefs[t.name];
                    if (trackPrefs && Object.keys(trackPrefs).length > 0) {
                        console.log(`Matching settings found for track: ${t.name}`, trackPrefs);
                        matchCount++;
                        return { ...t, ...trackPrefs };
                    }
                    return t;
                }));

                const trackCount = Object.keys(rawPrefs).length;
                const settingsNote = rawAppSettings ? '\nApp settings restored. Refresh for theme change.' : '';
                const invalidNote = anyInvalidKnownField ? '\nSome settings were invalid and were skipped.' : '';
                showToast(`Project loaded! Found settings for ${trackCount} tracks.\n${matchCount} active tracks updated.${settingsNote}${invalidNote}`);
            } catch (err) {
                console.error("Failed to load project", err);
                showToast("Error parsing project file. Please check if it's a valid .sync or .json file.", 'error');
            }
        };
        reader.readAsText(file);
    }, [setMasterVolume, showToast]);

    return {
        audioTracks,
        audioDevices,
        permissionsGranted,
        masterVolume,
        setMasterVolume,
        refreshDevices,
        addAudioTracks,
        addAudioFromUrl,
        updateAudioTrack,
        deleteAudioTrack,
        exportProject,
        importProject
    };
};
