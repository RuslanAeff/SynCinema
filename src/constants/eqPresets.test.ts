import { describe, it, expect } from 'vitest';
import { eqPresets, getPresetById, getCurrentPresetId } from './eqPresets';

describe('getCurrentPresetId', () => {
    it.each(eqPresets)('matches the $id preset by its exact values', (preset) => {
        expect(getCurrentPresetId({ low: preset.low, mid: preset.mid, high: preset.high })).toBe(preset.id);
    });

    it('returns null for a non-matching EQ combination', () => {
        expect(getCurrentPresetId({ low: 10, mid: -10, high: 5 })).toBeNull();
    });
});

describe('getPresetById', () => {
    it.each(eqPresets)('retrieves the $id preset by id', (preset) => {
        expect(getPresetById(preset.id)).toEqual(preset);
    });

    it('returns undefined for an unknown id', () => {
        expect(getPresetById('does-not-exist')).toBeUndefined();
    });
});
