import { describe, it, expect } from 'vitest';
import {
    Word,
    applyMinimumDuration,
    assignSegmentEnds,
    buildSubtitleBlocks,
    formatTimestamp,
    renderSubtitles,
    sanitizeBlocks,
    sliceIntoBlocks,
    toJson,
    toSrt,
    toTxt,
    toVtt,
} from './subtitleBuilder';

/** Words as the Gemini adapter hands them over: each carrying its leading space. */
const w = (word: string, start: number, end: number, segEnd = false): Word =>
    ({ word, start, end, segEnd });

const options = (overrides: Partial<{ maxChars: number; minDur: number; sentenceOnly: boolean }> = {}) =>
    ({ maxChars: 45, minDur: 1, sentenceOnly: false, ...overrides });

describe('assignSegmentEnds', () => {
    it('marks the word before a pause of 0.8s or longer', () => {
        const words = [w(' bir', 0, 1), w(' iki', 2, 2.5), w(' üç', 2.6, 3)];
        const flagged = assignSegmentEnds(words);

        expect(flagged[0].segEnd).toBe(true);  // 1.0s gap
        expect(flagged[1].segEnd).toBe(false); // 0.1s gap
    });

    it('always ends the last word', () => {
        const flagged = assignSegmentEnds([w(' tek', 0, 1)]);
        expect(flagged[0].segEnd).toBe(true);
    });

    it('handles an empty transcript', () => {
        expect(assignSegmentEnds([])).toEqual([]);
    });
});

describe('sliceIntoBlocks', () => {
    it('joins words without inserting separators, relying on their leading spaces', () => {
        const blocks = sliceIntoBlocks([w(' Merhaba', 0, 0.5), w(' dünya', 0.5, 1)], options());
        expect(blocks).toEqual([{ start: 0, end: 1, text: 'Merhaba dünya' }]);
    });

    it('runs words together when the leading space is missing', () => {
        // Guards the contract: Gemini returns bare words, so the adapter must add
        // the space. Losing it produced "MerhabaDünya" in the desktop app.
        const blocks = sliceIntoBlocks([w('Merhaba', 0, 0.5), w('dünya', 0.5, 1)], options());
        expect(blocks[0].text).toBe('Merhabadünya');
    });

    it('flushes once the character budget is reached', () => {
        const blocks = sliceIntoBlocks(
            [w(' bir', 0, 1), w(' iki', 1, 2), w(' üç', 2, 3)],
            options({ maxChars: 10 }),
        );
        expect(blocks).toEqual([{ start: 0, end: 3, text: 'bir iki üç' }]);
    });

    it('breaks on punctuation before the budget is spent', () => {
        const blocks = sliceIntoBlocks([w(' Merhaba.', 0, 1), w(' Dünya', 1, 2)], options());
        expect(blocks).toHaveLength(2);
        expect(blocks[0].text).toBe('Merhaba.');
    });

    it('ignores commas and colons when sentenceOnly is set', () => {
        const words = [w(' bir,', 0, 1), w(' iki', 1, 2)];

        expect(sliceIntoBlocks(words, options())).toHaveLength(2);
        expect(sliceIntoBlocks(words, options({ sentenceOnly: true }))).toHaveLength(1);
    });

    it('breaks on a segment end when nothing else has triggered', () => {
        const blocks = sliceIntoBlocks([w(' bir', 0, 1, true), w(' iki', 2, 3)], options());
        expect(blocks).toHaveLength(2);
        expect(blocks[0]).toEqual({ start: 0, end: 1, text: 'bir' });
    });

    it('flushes whatever is left over at the end', () => {
        const blocks = sliceIntoBlocks([w(' son', 0, 1)], options());
        expect(blocks).toEqual([{ start: 0, end: 1, text: 'son' }]);
    });

    it('produces nothing for an empty transcript', () => {
        expect(sliceIntoBlocks([], options())).toEqual([]);
    });
});

describe('applyMinimumDuration', () => {
    it('stretches a block that is too short to read', () => {
        const [block] = applyMinimumDuration([{ start: 0, end: 0.2, text: 'a' }], 1);
        expect(block.end).toBe(1);
    });

    it('stops short of the next block rather than overlapping it', () => {
        const blocks = applyMinimumDuration(
            [{ start: 0, end: 0.2, text: 'a' }, { start: 1, end: 2, text: 'b' }],
            1,
        );
        expect(blocks[0].end).toBeCloseTo(0.95, 5);
    });

    it('never shortens a block that is already long enough', () => {
        const [block] = applyMinimumDuration([{ start: 0, end: 5, text: 'a' }], 1);
        expect(block.end).toBe(5);
    });
});

describe('sanitizeBlocks', () => {
    it('drops zero and negative length blocks', () => {
        const blocks = sanitizeBlocks([
            { start: 1, end: 1, text: 'zero' },
            { start: 3, end: 2, text: 'negative' },
            { start: 0, end: 1, text: 'keep' },
        ]);
        expect(blocks).toEqual([{ start: 0, end: 1, text: 'keep' }]);
    });

    it('orders blocks by start time', () => {
        const blocks = sanitizeBlocks([
            { start: 5, end: 6, text: 'second' },
            { start: 0, end: 1, text: 'first' },
        ]);
        expect(blocks.map((block) => block.text)).toEqual(['first', 'second']);
    });

    it('pulls an overlapping end back behind the next start', () => {
        const blocks = sanitizeBlocks([
            { start: 0, end: 5, text: 'a' },
            { start: 3, end: 6, text: 'b' },
        ]);
        expect(blocks[0].end).toBeCloseTo(2.999, 5);
    });
});

describe('buildSubtitleBlocks', () => {
    it('carries a transcript through slicing, stretching and cleanup', () => {
        const words = assignSegmentEnds([
            w(' Merhaba', 0, 0.4),
            w(' dünya.', 0.4, 0.8),
            w(' Nasılsın', 3, 3.4),
            w(' bugün?', 3.4, 3.8),
        ]);

        const blocks = buildSubtitleBlocks(words, options());

        expect(blocks).toHaveLength(2);
        expect(blocks[0].text).toBe('Merhaba dünya.');
        expect(blocks[1].text).toBe('Nasılsın bugün?');
        // Stretched to the 1s minimum without reaching the next block.
        expect(blocks[0].end).toBeCloseTo(1, 5);
        expect(blocks[0].end).toBeLessThan(blocks[1].start);
    });
});

describe('formatTimestamp', () => {
    it('pads every field', () => {
        expect(formatTimestamp(0)).toBe('00:00:00,000');
        expect(formatTimestamp(3661.5)).toBe('01:01:01,500');
    });

    it('uses a dot for VTT', () => {
        expect(formatTimestamp(3661.5, '.')).toBe('01:01:01.500');
    });

    it('carries instead of emitting an invalid 1000ms', () => {
        expect(formatTimestamp(1.9996)).toBe('00:00:02,000');
    });

    it('clamps negative and non-finite input to zero', () => {
        expect(formatTimestamp(-5)).toBe('00:00:00,000');
        expect(formatTimestamp(Number.NaN)).toBe('00:00:00,000');
    });
});

describe('output formats', () => {
    const blocks = [
        { start: 0, end: 1.5, text: 'Merhaba dünya.' },
        { start: 2, end: 3.25, text: 'Nasılsın?' },
    ];

    it('writes SRT with 1-based indices and comma timestamps', () => {
        expect(toSrt(blocks)).toBe(
            '1\n00:00:00,000 --> 00:00:01,500\nMerhaba dünya.\n\n'
            + '2\n00:00:02,000 --> 00:00:03,250\nNasılsın?\n\n',
        );
    });

    it('writes VTT with the header and dot timestamps', () => {
        const vtt = toVtt(blocks);
        expect(vtt.startsWith('WEBVTT\n\n')).toBe(true);
        expect(vtt).toContain('00:00:00.000 --> 00:00:01.500');
        expect(vtt).not.toContain(',');
    });

    it('writes one line of text per block', () => {
        expect(toTxt(blocks)).toBe('Merhaba dünya.\nNasılsın?');
    });

    it('writes JSON rounded to milliseconds', () => {
        expect(JSON.parse(toJson(blocks))).toEqual([
            { index: 1, start: 0, end: 1.5, text: 'Merhaba dünya.' },
            { index: 2, start: 2, end: 3.25, text: 'Nasılsın?' },
        ]);
    });

    it('dispatches on the requested format', () => {
        expect(renderSubtitles(blocks, 'srt')).toBe(toSrt(blocks));
        expect(renderSubtitles(blocks, 'vtt')).toBe(toVtt(blocks));
        expect(renderSubtitles(blocks, 'txt')).toBe(toTxt(blocks));
        expect(renderSubtitles(blocks, 'json')).toBe(toJson(blocks));
    });

    it('produces an empty document for no blocks', () => {
        expect(toSrt([])).toBe('');
        expect(toVtt([])).toBe('WEBVTT\n\n');
    });
});
