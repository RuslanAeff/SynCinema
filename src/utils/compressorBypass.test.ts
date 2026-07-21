import { describe, it, expect, vi } from 'vitest';
import { applyCompressorBypass } from './compressorBypass';

// Coverage boundary (Faz4.4-06): this file tests ONLY the compressor
// bypass/enable graph rewire, scoped narrowly per the sub-plan's own
// instruction. The rest of AudioGraphManager.tsx remains untested by Phase
// 4: full graph initialization (createMediaElementSource, the 3 BiquadFilter
// nodes, createDynamicsCompressor, createGain, the initial connect chain),
// EQ filter parameter application, gain-boost application, output-device
// routing via AudioContext.setSinkId, and AudioContext lifecycle/cleanup are
// all still uncovered. Do not read this file's passing tests as proof the
// whole audio graph is regression-safe -- only the bypass invariant is.

function makeMockNodes() {
    return {
        highFilter: { connect: vi.fn(), disconnect: vi.fn() },
        compressor: {
            connect: vi.fn(),
            disconnect: vi.fn(),
            threshold: { value: 0 },
            knee: { value: 0 },
            ratio: { value: 1 },
        },
        gain: { connect: vi.fn(), disconnect: vi.fn() } as unknown as AudioNode,
    };
}

describe('applyCompressorBypass', () => {
    it('wires highFilter -> compressor -> gain when enabling the compressor (graph rewire, not a parameter trick)', () => {
        const nodes = makeMockNodes();

        applyCompressorBypass(nodes, true);

        // Always disconnects both nodes' existing routing first, regardless of direction.
        expect(nodes.highFilter.disconnect).toHaveBeenCalledTimes(1);
        expect(nodes.compressor.disconnect).toHaveBeenCalledTimes(1);

        // The actual rewire: high -> compressor -> gain.
        expect(nodes.highFilter.connect).toHaveBeenCalledExactlyOnceWith(nodes.compressor);
        expect(nodes.compressor.connect).toHaveBeenCalledExactlyOnceWith(nodes.gain);
        // Compressor is not wired directly to gain from highFilter -- it must go through the compressor.
        expect(nodes.highFilter.connect).not.toHaveBeenCalledWith(nodes.gain);
    });

    it('sets the documented compressor parameters when enabling', () => {
        const nodes = makeMockNodes();
        applyCompressorBypass(nodes, true);
        expect(nodes.compressor.threshold.value).toBe(-24);
        expect(nodes.compressor.knee.value).toBe(30);
        expect(nodes.compressor.ratio.value).toBe(12);
    });

    it('wires highFilter -> gain directly when disabling the compressor (bypassed, not routed through it)', () => {
        const nodes = makeMockNodes();

        applyCompressorBypass(nodes, false);

        expect(nodes.highFilter.disconnect).toHaveBeenCalledTimes(1);
        expect(nodes.compressor.disconnect).toHaveBeenCalledTimes(1);

        // The actual bypass: high -> gain, skipping the compressor entirely.
        expect(nodes.highFilter.connect).toHaveBeenCalledExactlyOnceWith(nodes.gain);
        expect(nodes.compressor.connect).not.toHaveBeenCalled();
    });

    it('re-disconnects both nodes on every toggle, even when switching enabled -> enabled again', () => {
        const nodes = makeMockNodes();
        applyCompressorBypass(nodes, true);
        applyCompressorBypass(nodes, true);
        expect(nodes.highFilter.disconnect).toHaveBeenCalledTimes(2);
        expect(nodes.compressor.disconnect).toHaveBeenCalledTimes(2);
    });
});
