/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Audio Graph Manager
 *  @author Ruslan Aliyev
 *  Web Audio API integration for EQ, Compressor, and Output Device routing
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useRef } from 'react';
import { applyCompressorBypass } from '../utils/compressorBypass';

interface AudioGraphManagerProps {
    audioElement: HTMLMediaElement | null;
    eqSettings?: { low: number; mid: number; high: number };
    deviceId: string;
    useCompressor?: boolean;
    gainBoost?: number; // 1.0 = normal, up to 3.0 = 3x amplification
}

export const AudioGraphManager: React.FC<AudioGraphManagerProps> = ({
    audioElement,
    eqSettings = { low: 0, mid: 0, high: 0 },
    deviceId,
    useCompressor = false,
    gainBoost = 1.0
}) => {
    const contextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const eqNodesRef = useRef<{ low: BiquadFilterNode; mid: BiquadFilterNode; high: BiquadFilterNode } | null>(null);
    const compressorRef = useRef<DynamicsCompressorNode | null>(null);
    const gainNodeRef = useRef<GainNode | null>(null);
    const isInitializedRef = useRef(false);

    // Store deviceId in ref so the init effect can use it without re-running
    const deviceIdRef = useRef(deviceId);
    useEffect(() => { deviceIdRef.current = deviceId; }, [deviceId]);

    // Initialize Audio Graph (runs ONCE per audioElement — never re-runs on deviceId change)
    useEffect(() => {
        if (!audioElement || sourceRef.current) return;

        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextClass) throw new Error('Web Audio API is not supported in this browser');
            const ctx = new AudioContextClass();
            contextRef.current = ctx;

            const source = ctx.createMediaElementSource(audioElement);
            sourceRef.current = source;

            // Create Filters
            const low = ctx.createBiquadFilter();
            low.type = 'lowshelf';
            low.frequency.value = 320;

            const mid = ctx.createBiquadFilter();
            mid.type = 'peaking';
            mid.frequency.value = 1000;
            mid.Q.value = 0.5;

            const high = ctx.createBiquadFilter();
            high.type = 'highshelf';
            high.frequency.value = 3200;

            // Create Compressor (initialized in DISABLED state)
            const compressor = ctx.createDynamicsCompressor();
            compressor.threshold.value = 0;
            compressor.knee.value = 0;
            compressor.ratio.value = 1;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;
            compressorRef.current = compressor;

            // Create Gain Node for boost (at end of chain, before destination)
            const gainNode = ctx.createGain();
            gainNode.gain.value = 1.0; // Will be updated by gainBoost effect
            gainNodeRef.current = gainNode;

            // Connect graph: Source -> Low -> Mid -> High -> GainNode -> Destination
            // Compressor is OFF by default — High connects to GainNode (not compressor)
            source.connect(low);
            low.connect(mid);
            mid.connect(high);
            high.connect(gainNode);
            gainNode.connect(ctx.destination);

            eqNodesRef.current = { low, mid, high };

            console.log('[AudioGraphManager] Audio graph initialized (compressor bypassed)');

            // Set the initial output device
            if (typeof ctx.setSinkId === 'function') {
                const targetId = deviceIdRef.current || '';
                ctx.setSinkId(targetId).then(() => {
                    console.log('[AudioGraphManager] Initial device set to:', targetId || 'default');
                    isInitializedRef.current = true;
                }).catch((err: Error) => {
                    console.error('[AudioGraphManager] Initial setSinkId failed:', err);
                });
            } else {
                isInitializedRef.current = true;
            }

        } catch (err) {
            console.error("[AudioGraphManager] Audio Graph Error:", err);
        }

        // Cleanup: close AudioContext on unmount to prevent memory leaks
        return () => {
            if (contextRef.current) {
                contextRef.current.close().catch(() => { });
                console.log('[AudioGraphManager] AudioContext closed');
            }
            contextRef.current = null;
            sourceRef.current = null;
            eqNodesRef.current = null;
            compressorRef.current = null;
            gainNodeRef.current = null;
            isInitializedRef.current = false;
        };
    }, [audioElement]);

    // Update EQ values
    useEffect(() => {
        if (eqNodesRef.current) {
            eqNodesRef.current.low.gain.value = eqSettings.low;
            eqNodesRef.current.mid.gain.value = eqSettings.mid;
            eqNodesRef.current.high.gain.value = eqSettings.high;
        }
    }, [eqSettings]);

    // Toggle Compressor: bypass by rewiring the graph
    useEffect(() => {
        const ctx = contextRef.current;
        const eq = eqNodesRef.current;
        const comp = compressorRef.current;
        const gain = gainNodeRef.current;
        if (!ctx || !eq || !comp || !gain) return;

        applyCompressorBypass({ highFilter: eq.high, compressor: comp, gain }, useCompressor);
        console.log(useCompressor ? '[AudioGraphManager] Compressor ENABLED' : '[AudioGraphManager] Compressor BYPASSED');
    }, [useCompressor]);

    // Update Gain Boost
    useEffect(() => {
        if (gainNodeRef.current) {
            gainNodeRef.current.gain.value = gainBoost;
        }
    }, [gainBoost]);

    // Handle Output Device Switching via AudioContext.setSinkId
    useEffect(() => {
        const ctx = contextRef.current;
        if (!ctx) return;

        const switchDevice = async () => {
            try {
                // Check if AudioContext supports setSinkId (Chrome 110+)
                if (typeof ctx.setSinkId === 'function') {
                    const targetId = deviceId || '';
                    console.log('[AudioGraphManager] Switching to device:', targetId || 'default');
                    await ctx.setSinkId(targetId);
                    console.log('[AudioGraphManager] Device switch successful');
                } else {
                    console.warn('[AudioGraphManager] AudioContext.setSinkId not supported in this browser');
                }
            } catch (err) {
                console.error('[AudioGraphManager] Failed to switch output device:', err);
            }
        };

        switchDevice();
    }, [deviceId]);

    return null;
};
