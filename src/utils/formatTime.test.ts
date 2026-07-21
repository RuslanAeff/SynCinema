import { describe, it, expect } from 'vitest';
import { formatTime } from './formatTime';

describe('formatTime', () => {
    it('formats a known input/output pair', () => {
        expect(formatTime(90)).toBe('1:30');
    });

    it('formats zero', () => {
        expect(formatTime(0)).toBe('0:00');
    });

    it('formats a sub-minute value with zero-padding', () => {
        expect(formatTime(5)).toBe('0:05');
    });

    it('formats the last second before a minute boundary', () => {
        expect(formatTime(59)).toBe('0:59');
    });

    it('formats an exact minute boundary', () => {
        expect(formatTime(60)).toBe('1:00');
    });

    it('formats single-digit seconds after a minute boundary with padding', () => {
        expect(formatTime(65)).toBe('1:05');
    });

    it('formats a multi-minute value with no hour-rollover (MM:SS only, not HH:MM:SS)', () => {
        expect(formatTime(3661)).toBe('61:01');
    });
});
