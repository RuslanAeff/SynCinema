import { describe, it, expect } from 'vitest';
import {
    MAX_VOCABULARY_TERMS,
    TRANSCRIBE_MODEL,
    buildTranscriptionRequest,
    enforceMonotonicWords,
    extractWords,
    offsetWords,
    parseOffsetSeconds,
} from './geminiTranscribe';

/** Wrap annotations in the interaction envelope Gemini replies with. */
const interaction = (annotations: unknown[]) => ({
    steps: [{ content: [{ annotations }] }],
});

const wordInfo = (text: string, start: string, end: string) => ({
    type: 'word_info',
    text,
    start_offset: start,
    end_offset: end,
});

describe('parseOffsetSeconds', () => {
    it('strips the trailing s', () => {
        expect(parseOffsetSeconds('0.100s')).toBeCloseTo(0.1, 6);
        expect(parseOffsetSeconds('12.345s')).toBeCloseTo(12.345, 6);
    });

    it('handles whole-second and zero forms', () => {
        expect(parseOffsetSeconds('1s')).toBe(1);
        expect(parseOffsetSeconds('0s')).toBe(0);
    });

    it('accepts a plain number', () => {
        expect(parseOffsetSeconds(2.5)).toBe(2.5);
    });

    it('returns null for junk instead of NaN', () => {
        expect(parseOffsetSeconds('abc')).toBeNull();
        expect(parseOffsetSeconds('')).toBeNull();
        expect(parseOffsetSeconds(undefined)).toBeNull();
        expect(parseOffsetSeconds(null)).toBeNull();
        expect(parseOffsetSeconds(Number.NaN)).toBeNull();
    });
});

describe('extractWords', () => {
    it('gives every word a leading space', () => {
        const words = extractWords(interaction([
            wordInfo('Merhaba', '0s', '0.5s'),
            wordInfo('dünya', '0.5s', '1s'),
        ]));

        expect(words).toEqual([
            { word: ' Merhaba', start: 0, end: 0.5 },
            { word: ' dünya', start: 0.5, end: 1 },
        ]);
    });

    it('ignores annotations that are not word_info', () => {
        const words = extractWords(interaction([
            { type: 'speaker_info', text: 'S1' },
            wordInfo('tek', '0s', '1s'),
        ]));

        expect(words).toHaveLength(1);
        expect(words[0].word).toBe(' tek');
    });

    it('accepts camelCase offsets from the REST reply', () => {
        const words = extractWords(interaction([
            { type: 'wordInfo', text: 'test', startOffset: '1s', endOffset: '2s' },
        ]));

        expect(words).toEqual([{ word: ' test', start: 1, end: 2 }]);
    });

    it('skips a word whose offsets are unusable rather than emitting NaN', () => {
        const words = extractWords(interaction([
            wordInfo('iyi', '0s', '1s'),
            wordInfo('bozuk', 'x', 'y'),
        ]));

        expect(words).toHaveLength(1);
        expect(words[0].word).toBe(' iyi');
    });

    it('reads through an interaction or response wrapper', () => {
        const annotations = [wordInfo('bir', '0s', '1s')];

        expect(extractWords({ interaction: interaction(annotations) })).toHaveLength(1);
        expect(extractWords({ response: interaction(annotations) })).toHaveLength(1);
    });

    it('walks every step and content part', () => {
        const words = extractWords({
            steps: [
                { content: [{ annotations: [wordInfo('bir', '0s', '1s')] }] },
                { content: [{ annotations: [wordInfo('iki', '1s', '2s')] }] },
            ],
        });

        expect(words.map((word) => word.word)).toEqual([' bir', ' iki']);
    });

    it('returns nothing for a malformed or empty payload', () => {
        expect(extractWords(null)).toEqual([]);
        expect(extractWords({})).toEqual([]);
        expect(extractWords({ steps: 'nope' })).toEqual([]);
        expect(extractWords(interaction([]))).toEqual([]);
    });
});

describe('offsetWords', () => {
    it('shifts a chunk onto the full timeline', () => {
        const shifted = offsetWords([{ word: ' a', start: 1, end: 2 }], 600);
        expect(shifted).toEqual([{ word: ' a', start: 601, end: 602 }]);
    });
});

describe('enforceMonotonicWords', () => {
    it('pulls back an end that runs past the next start', () => {
        const words = enforceMonotonicWords([
            { word: ' a', start: 0, end: 5 },
            { word: ' b', start: 3, end: 4 },
        ]);

        expect(words[0].end).toBeCloseTo(2.999, 5);
    });

    it('leaves an already-ordered list untouched', () => {
        const input = [
            { word: ' a', start: 0, end: 1 },
            { word: ' b', start: 1, end: 2 },
        ];

        expect(enforceMonotonicWords(input)).toEqual(input);
    });
});

describe('buildTranscriptionRequest', () => {
    const file = { uri: 'files/abc', mimeType: 'audio/mp3', name: 'files/abc' };

    it('always asks for verbatim mode with word timestamps', () => {
        const body = buildTranscriptionRequest(file, { languageCodes: ['tr-TR'], customVocabulary: [] });
        const config = (body.generation_config as Record<string, Record<string, unknown>>).transcription_config;

        // Smart mode carries no granularities field, so it yields no word timings.
        expect(config.mode).toEqual({ type: 'verbatim', timestamp_granularities: ['word'] });
        expect(body.model).toBe(TRANSCRIBE_MODEL);
    });

    it('passes the uploaded file as audio input', () => {
        const body = buildTranscriptionRequest(file, { languageCodes: [], customVocabulary: [] });
        expect(body.input).toEqual([{ type: 'audio', uri: 'files/abc', mime_type: 'audio/mp3' }]);
    });

    it('sends an empty language list for auto-detect', () => {
        const body = buildTranscriptionRequest(file, { languageCodes: [], customVocabulary: [] });
        const config = (body.generation_config as Record<string, Record<string, unknown>>).transcription_config;

        expect(config.language_codes).toEqual([]);
    });

    it('caps the custom vocabulary at the API limit', () => {
        const terms = Array.from({ length: 150 }, (_, index) => `term${index}`);
        const body = buildTranscriptionRequest(file, { languageCodes: [], customVocabulary: terms });
        const config = (body.generation_config as Record<string, Record<string, unknown>>).transcription_config;

        expect(config.custom_vocabulary).toHaveLength(MAX_VOCABULARY_TERMS);
    });
});
