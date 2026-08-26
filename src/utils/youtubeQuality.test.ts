import { describe, it, expect } from 'vitest';
import {
    formatQuality,
    pickBestQuality,
    qualityForPlayerSize,
    qualityRank,
    sortQualitiesDesc,
} from './youtubeQuality';

describe('formatQuality', () => {
    it('maps YouTube tokens to human resolutions', () => {
        expect(formatQuality('hd1080')).toBe('1080p');
        expect(formatQuality('tiny')).toBe('144p');
        expect(formatQuality('hd2160')).toBe('4K');
    });

    it('treats both auto spellings as Auto', () => {
        expect(formatQuality('auto')).toBe('Auto');
        expect(formatQuality('default')).toBe('Auto');
    });

    it('passes through a token it does not know', () => {
        expect(formatQuality('hd4320')).toBe('hd4320');
    });
});

describe('qualityRank', () => {
    it('ranks higher resolutions above lower ones', () => {
        expect(qualityRank('hd1080')).toBeGreaterThan(qualityRank('hd720'));
        expect(qualityRank('medium')).toBeGreaterThan(qualityRank('tiny'));
    });

    it('returns -1 for non-ladder tokens', () => {
        expect(qualityRank('auto')).toBe(-1);
        expect(qualityRank('default')).toBe(-1);
    });
});

describe('sortQualitiesDesc', () => {
    it('sorts best first', () => {
        expect(sortQualitiesDesc(['medium', 'hd1080', 'tiny', 'hd720']))
            .toEqual(['hd1080', 'hd720', 'medium', 'tiny']);
    });

    it('drops auto and unknown tokens', () => {
        expect(sortQualitiesDesc(['auto', 'hd720', 'default', 'wat'])).toEqual(['hd720']);
    });

    it('returns an empty list when YouTube has not reported levels yet', () => {
        expect(sortQualitiesDesc([])).toEqual([]);
    });
});

describe('pickBestQuality', () => {
    it('picks the top of the ladder', () => {
        expect(pickBestQuality(['medium', 'hd2160', 'hd720'])).toBe('hd2160');
    });

    it('is null when nothing usable is available', () => {
        expect(pickBestQuality(['auto', 'default'])).toBeNull();
        expect(pickBestQuality([])).toBeNull();
    });
});

describe('qualityForPlayerSize', () => {
    it('caps a default 640x360 embed around 360p', () => {
        expect(qualityForPlayerSize(640, 360)).toBe('medium');
    });

    it('allows 1080p for a full-HD player box', () => {
        expect(qualityForPlayerSize(1920, 1080)).toBe('hd1080');
    });

    it('lets a retina display unlock a higher tier at the same CSS size', () => {
        expect(qualityForPlayerSize(960, 540, 1)).toBe('hd720');
        expect(qualityForPlayerSize(960, 540, 2)).toBe('hd1080');
    });

    it('uses the narrower constraint on an ultra-wide box', () => {
        // 3440x600 letterboxes 16:9 content to ~600px tall, not 3440/16*9.
        expect(qualityForPlayerSize(3440, 600)).toBe('hd720');
    });

    it('never exceeds the top of the ladder', () => {
        expect(qualityForPlayerSize(7680, 4320, 2)).toBe('hd2160');
    });
});
