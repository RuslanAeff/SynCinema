import { describe, it, expect } from 'vitest';
import { parseSRT } from './srtParser';

describe('parseSRT', () => {
    it('parses a well-formed multi-cue block', () => {
        const srt = [
            '1',
            '00:00:01,000 --> 00:00:04,000',
            'Hello, this is the first subtitle.',
            '',
            '2',
            '00:00:05,500 --> 00:00:08,250',
            'Second cue.',
        ].join('\n');

        const cues = parseSRT(srt);

        expect(cues).toHaveLength(2);
        expect(cues[0]).toEqual({ id: '1', startTime: 1, endTime: 4, text: 'Hello, this is the first subtitle.' });
        expect(cues[1]).toEqual({ id: '2', startTime: 5.5, endTime: 8.25, text: 'Second cue.' });
    });

    it('parses a single-cue block', () => {
        const srt = ['1', '00:00:00,000 --> 00:00:02,000', 'Only cue.'].join('\n');
        const cues = parseSRT(srt);
        expect(cues).toHaveLength(1);
        expect(cues[0].text).toBe('Only cue.');
    });

    it('joins multi-line cue text with newlines preserved', () => {
        const srt = [
            '1',
            '00:00:05,500 --> 00:00:08,250',
            'This is a second cue',
            'with multiple lines of text.',
        ].join('\n');

        const cues = parseSRT(srt);
        expect(cues).toHaveLength(1);
        expect(cues[0].text).toBe('This is a second cue\nwith multiple lines of text.');
    });

    // Existing behavior: a block whose timestamp line doesn't match the
    // expected pattern is silently skipped, not thrown or reported. Asserted
    // here as current, regression-tested behavior -- not endorsed as ideal
    // UX (a real .srt file with one malformed cue would silently lose it
    // with no user-facing warning; worth flagging as a future finding, not
    // fixing here per Faz4.3's own scope).
    it('silently skips a block with a malformed timestamp', () => {
        const srt = [
            '1',
            'not a valid timestamp line',
            'This cue should be skipped.',
            '',
            '2',
            '00:00:05,000 --> 00:00:06,000',
            'This cue should be kept.',
        ].join('\n');

        const cues = parseSRT(srt);
        expect(cues).toHaveLength(1);
        expect(cues[0].text).toBe('This cue should be kept.');
    });

    // Existing behavior: a block with fewer than 3 lines (missing cue text
    // entirely) is silently skipped.
    it('silently skips a block with fewer than 3 lines', () => {
        const srt = [
            '1',
            '00:00:01,000 --> 00:00:02,000',
            // no text line at all -- only 2 lines in this block
            '',
            '2',
            '00:00:05,000 --> 00:00:06,000',
            'Valid cue.',
        ].join('\n');

        const cues = parseSRT(srt);
        expect(cues).toHaveLength(1);
        expect(cues[0].text).toBe('Valid cue.');
    });

    it('returns an empty array for an empty string input', () => {
        expect(parseSRT('')).toEqual([]);
    });
});
