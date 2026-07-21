import { describe, it, expect } from 'vitest';
import { computeDriftCorrection } from './driftCorrection';

describe('computeDriftCorrection', () => {
    it('does not resync when audio is well within the threshold', () => {
        // video at 10s, offset 0 -> target 10s, audio at 10.1s, threshold 0.3
        const result = computeDriftCorrection(10, 0, 10.1, 0.3);
        expect(result.shouldResync).toBe(false);
        expect(result.targetTime).toBe(10);
    });

    it('does not resync exactly at the threshold boundary (strictly greater-than)', () => {
        // Uses 0.5 (an exact binary fraction), not the real 0.3 default: 10.3 - 10
        // is NOT exactly 0.3 in IEEE 754 (it's 0.30000000000000004), which made an
        // earlier version of this test assert the wrong thing. 0.5 = 2^-1 has an
        // exact float representation, so this boundary is genuinely exact.
        // diff === syncThreshold exactly; source uses `diff > syncThreshold`, not `>=`
        const result = computeDriftCorrection(10, 0, 10.5, 0.5);
        expect(result.shouldResync).toBe(false);
    });

    it('resyncs when drift is just over the threshold', () => {
        const result = computeDriftCorrection(10, 0, 10.31, 0.3);
        expect(result.shouldResync).toBe(true);
        expect(result.targetTime).toBe(10);
    });

    it('handles a negative offset (audio starts later than video)', () => {
        // offset -2 -> target = videoCurrentTime - (-2) = videoCurrentTime + 2
        const result = computeDriftCorrection(10, -2, 12, 0.3);
        expect(result.targetTime).toBe(12);
        expect(result.shouldResync).toBe(false);
    });

    it('handles a positive offset (audio starts earlier than video)', () => {
        const result = computeDriftCorrection(10, 3, 7, 0.3);
        expect(result.targetTime).toBe(7);
        expect(result.shouldResync).toBe(false);
    });

    it('floors targetTime at 0 when offset would push it negative', () => {
        const result = computeDriftCorrection(1, 5, 0, 0.3);
        expect(result.targetTime).toBe(0);
        // audioTime 0, targetTime 0 -> diff 0, no resync
        expect(result.shouldResync).toBe(false);
    });

    it('resyncs against the floored (0) targetTime, not a negative one', () => {
        const result = computeDriftCorrection(1, 5, 2, 0.3);
        // targetTime floored to 0; diff = |2 - 0| = 2 > 0.3
        expect(result.targetTime).toBe(0);
        expect(result.shouldResync).toBe(true);
    });
});
