/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Audio Graph Manager
 *  @author Ruslan Aliyev
 *  Web Audio API integration for EQ, Compressor, and Output Device routing
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useEffect, useRef } from 'react';

interface AudioGraphManagerProps {
    audioElement: HTMLMediaElement | null;
    eqSettings?: { low: number; mid: number; high: number };
    deviceId: string;
    useCompressor?: boolean;
}

export const AudioGraphManager: React.FC<AudioGraphManagerProps> = ({
    audioElement,
    eqSettings = { low: 0, mid: 0, high: 0 },
    deviceId,
    useCompressor = false
}) => {
    const contextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const eqNodesRef = useRef<{ low: BiquadFilterNode; mid: BiquadFilterNode; high: BiquadFilterNode } | null>(null);
    const compressorRef = useRef<DynamicsCompressorNode | null>(null);
    const isInitializedRef = useRef(false);

    // Initialize Audio Graph
    useEffect(() => {
        if (!audioElement || sourceRef.current) return;

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
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

            // Create Compressor
            const compressor = ctx.createDynamicsCompressor();
            compressor.threshold.value = -24;
            compressor.knee.value = 30;
            compressor.ratio.value = 12;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;
            compressorRef.current = compressor;

            // Connect graph
            // Source -> Low -> Mid -> High -> Compressor -> Destination
            source.connect(low);
            low.connect(mid);
            mid.connect(high);
            high.connect(compressor);
            compressor.connect(ctx.destination);

            eqNodesRef.current = { low, mid, high };

            console.log('[AudioGraphManager] Audio graph initialized');

            // Immediately set the output device after graph creation
            if ('setSinkId' in ctx && typeof (ctx as any).setSinkId === 'function') {
                const targetId = deviceId || '';
                (ctx as any).setSinkId(targetId).then(() => {
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
    }, [audioElement, deviceId]);

    // Update EQ values
    useEffect(() => {
        if (eqNodesRef.current) {
            eqNodesRef.current.low.gain.value = eqSettings.low;
            eqNodesRef.current.mid.gain.value = eqSettings.mid;
            eqNodesRef.current.high.gain.value = eqSettings.high;
        }
    }, [eqSettings]);

    // Update Compressor state
    useEffect(() => {
        if (!compressorRef.current || !contextRef.current) return;
        if (useCompressor) {
            compressorRef.current.threshold.value = -24;
            compressorRef.current.ratio.value = 12;
        } else {
            compressorRef.current.threshold.value = 0; // Disable (mostly)
            compressorRef.current.ratio.value = 1;
        }
    }, [useCompressor]);

    // Handle Output Device Switching via AudioContext.setSinkId
    useEffect(() => {
        const ctx = contextRef.current;
        if (!ctx) return;

        const switchDevice = async () => {
            try {
                // Check if AudioContext supports setSinkId (Chrome 110+)
                if ('setSinkId' in ctx && typeof (ctx as any).setSinkId === 'function') {
                    const targetId = deviceId || '';
                    console.log('[AudioGraphManager] Switching to device:', targetId || 'default');
                    await (ctx as any).setSinkId(targetId);
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
