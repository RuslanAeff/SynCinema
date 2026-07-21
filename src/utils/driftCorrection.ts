/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Drift Correction
 *  Pure decision logic for whether an audio track needs resyncing against
 *  the video clock, and to what target time.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface DriftCorrectionResult {
    shouldResync: boolean;
    targetTime: number;
}

/**
 * Decides whether an audio track has drifted enough from the video clock to
 * need resyncing. `targetTime` is floored at 0 (audio never seeks negative,
 * even when a positive offset would otherwise push it below zero).
 */
export const computeDriftCorrection = (
    videoCurrentTime: number,
    offset: number,
    audioTime: number,
    syncThreshold: number
): DriftCorrectionResult => {
    const targetTime = Math.max(0, videoCurrentTime - offset);
    const diff = Math.abs(audioTime - targetTime);
    return { shouldResync: diff > syncThreshold, targetTime };
};
