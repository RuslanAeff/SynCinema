/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Compressor Bypass
 *  Applies the compressor enable/bypass graph rewire. This is a true graph
 *  rewire (disconnect/connect around the compressor node), not a parameter
 *  trick -- see Project-Ontology.md Section 7's invariant.
 * ═══════════════════════════════════════════════════════════════════════════
 */

interface ConnectableNode {
    connect(destination: AudioNode): AudioNode;
    disconnect(): void;
}

interface CompressorLikeNode extends ConnectableNode {
    threshold: { value: number };
    knee: { value: number };
    ratio: { value: number };
}

export interface CompressorBypassNodes {
    highFilter: ConnectableNode;
    compressor: CompressorLikeNode;
    gain: AudioNode;
}

/**
 * Rewires the graph around the compressor node based on `useCompressor`:
 * - true:  highFilter -> compressor -> gain
 * - false: highFilter -> gain (compressor skipped entirely)
 */
export const applyCompressorBypass = (nodes: CompressorBypassNodes, useCompressor: boolean): void => {
    const { highFilter, compressor, gain } = nodes;

    highFilter.disconnect();
    compressor.disconnect();

    if (useCompressor) {
        compressor.threshold.value = -24;
        compressor.knee.value = 30;
        compressor.ratio.value = 12;
        highFilter.connect(compressor as unknown as AudioNode);
        compressor.connect(gain);
    } else {
        highFilter.connect(gain);
    }
};
