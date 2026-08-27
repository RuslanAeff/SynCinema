/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Subtitle Builder
 *  @author Ruslan Aliyev
 *  Word timings -> subtitle blocks -> SRT / VTT / TXT / JSON.
 *
 *  Ported verbatim from the AutoSRT desktop app. The slicing order (character
 *  limit and punctuation first, segment boundary second) is load-bearing: it is
 *  what keeps blocks from splitting mid-sentence, and it is not to be "tidied".
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * One recognised word.
 *
 * `word` carries its own leading space — Gemini returns bare words and the
 * slicer joins with '', so the space has to already be there.
 */
export interface Word {
    word: string;
    start: number;
    end: number;
    /** Marks the last word before a pause long enough to end a subtitle block. */
    segEnd?: boolean;
}

export interface SubtitleBlock {
    start: number;
    end: number;
    text: string;
}

export interface SliceOptions {
    /** Character budget per block; a block flushes once it is reached. */
    maxChars: number;
    /** Blocks shorter than this get stretched, never past the next block. */
    minDur: number;
    /** Break only on sentence enders rather than on every comma or colon. */
    sentenceOnly: boolean;
}

export const DEFAULT_SLICE_OPTIONS: SliceOptions = {
    maxChars: 45,
    minDur: 1,
    sentenceOnly: false,
};

/** Pause, in seconds, that ends a block regardless of punctuation. */
export const SEGMENT_GAP_SECONDS = 0.8;

const SENTENCE_PUNCTUATION = ['.', '?', '!'];
const ALL_PUNCTUATION = ['.', ',', '?', '!', ':', ';'];

/**
 * Flag the last word before each long pause, plus the final word.
 *
 * Gemini reports word timings but no segments, so the pauses between words are
 * the only structure available.
 */
export const assignSegmentEnds = (words: Word[], gapSeconds = SEGMENT_GAP_SECONDS): Word[] => {
    const flagged = words.map((word) => ({ ...word, segEnd: false }));

    for (let i = 0; i < flagged.length - 1; i += 1) {
        if (flagged[i + 1].start - flagged[i].end >= gapSeconds) {
            flagged[i].segEnd = true;
        }
    }

    if (flagged.length > 0) {
        flagged[flagged.length - 1].segEnd = true;
    }

    return flagged;
};

/** Group words into blocks. Character limit and punctuation win over segment ends. */
export const sliceIntoBlocks = (words: Word[], options: SliceOptions): SubtitleBlock[] => {
    const punctuation = options.sentenceOnly ? SENTENCE_PUNCTUATION : ALL_PUNCTUATION;
    const blocks: SubtitleBlock[] = [];

    let current: Word[] = [];
    let chunkStart: number | null = null;

    const flush = (end: number) => {
        const text = current.map((word) => word.word).join('').trim();
        if (chunkStart !== null && text.length > 0) {
            blocks.push({ start: chunkStart, end, text });
        }
        current = [];
        chunkStart = null;
    };

    for (const word of words) {
        if (chunkStart === null) chunkStart = word.start;
        current.push(word);

        const text = current.map((entry) => entry.word).join('').trim();
        const endsWithPunctuation = punctuation.some((mark) => word.word.trim().endsWith(mark));

        if (text.length >= options.maxChars || endsWithPunctuation) {
            flush(word.end);
        } else if (word.segEnd) {
            flush(word.end);
        }
    }

    if (current.length > 0) {
        flush(current[current.length - 1].end);
    }

    return blocks;
};

/** Stretch blocks that are too short to read, never into the following block. */
export const applyMinimumDuration = (blocks: SubtitleBlock[], minDur: number): SubtitleBlock[] => {
    const adjusted = blocks.map((block) => ({ ...block }));

    for (let i = 0; i < adjusted.length; i += 1) {
        const block = adjusted[i];
        if (block.end - block.start >= minDur) continue;

        let newEnd = block.start + minDur;
        if (i + 1 < adjusted.length) {
            newEnd = Math.min(newEnd, adjusted[i + 1].start - 0.05);
        }
        if (newEnd > block.end) {
            block.end = newEnd;
        }
    }

    return adjusted;
};

/** Drop empty blocks, order them, and pull overlapping ends back apart. */
export const sanitizeBlocks = (blocks: SubtitleBlock[]): SubtitleBlock[] => {
    const cleaned = blocks
        .filter((block) => block.end - block.start > 0)
        .map((block) => ({ ...block }))
        .sort((a, b) => a.start - b.start);

    for (let i = 0; i < cleaned.length - 1; i += 1) {
        if (cleaned[i].end > cleaned[i + 1].start) {
            cleaned[i].end = Math.max(cleaned[i].start + 0.001, cleaned[i + 1].start - 0.001);
        }
    }

    return cleaned;
};

/** Words in, ready-to-write blocks out. */
export const buildSubtitleBlocks = (words: Word[], options: SliceOptions): SubtitleBlock[] =>
    sanitizeBlocks(applyMinimumDuration(sliceIntoBlocks(words, options), options.minDur));

/**
 * SRT/VTT timestamp: HH:MM:SS,mmm (or '.' for VTT).
 *
 * Rounding can carry a value like 1.9996 up to a full 1000 ms, which would emit
 * an invalid ",1000" — so the carry is folded into the seconds instead.
 */
export const formatTimestamp = (seconds: number, separator: ',' | '.' = ','): string => {
    const total = Number.isFinite(seconds) && seconds > 0 ? seconds : 0;

    let whole = Math.floor(total);
    let milliseconds = Math.round((total - whole) * 1000);
    if (milliseconds === 1000) {
        whole += 1;
        milliseconds = 0;
    }

    const hours = Math.floor(whole / 3600);
    const minutes = Math.floor((whole % 3600) / 60);
    const secs = whole % 60;

    const pad = (value: number, size = 2) => String(value).padStart(size, '0');

    return `${pad(hours)}:${pad(minutes)}:${pad(secs)}${separator}${pad(milliseconds, 3)}`;
};

export const toSrt = (blocks: SubtitleBlock[]): string =>
    blocks
        .map((block, index) =>
            `${index + 1}\n${formatTimestamp(block.start)} --> ${formatTimestamp(block.end)}\n${block.text}\n\n`)
        .join('');

export const toVtt = (blocks: SubtitleBlock[]): string =>
    `WEBVTT\n\n${blocks
        .map((block, index) =>
            `${index + 1}\n${formatTimestamp(block.start, '.')} --> ${formatTimestamp(block.end, '.')}\n${block.text}\n\n`)
        .join('')}`;

export const toTxt = (blocks: SubtitleBlock[]): string =>
    blocks.map((block) => block.text).join('\n');

const round3 = (value: number): number => Math.round(value * 1000) / 1000;

export const toJson = (blocks: SubtitleBlock[]): string =>
    JSON.stringify(
        blocks.map((block, index) => ({
            index: index + 1,
            start: round3(block.start),
            end: round3(block.end),
            text: block.text,
        })),
        null,
        2,
    );

export type SubtitleFormat = 'srt' | 'vtt' | 'txt' | 'json';

export const FORMAT_EXTENSIONS: Record<SubtitleFormat, string> = {
    srt: 'srt',
    vtt: 'vtt',
    txt: 'txt',
    json: 'json',
};

export const FORMAT_MIME_TYPES: Record<SubtitleFormat, string> = {
    srt: 'application/x-subrip',
    vtt: 'text/vtt',
    txt: 'text/plain',
    json: 'application/json',
};

export const renderSubtitles = (blocks: SubtitleBlock[], format: SubtitleFormat): string => {
    switch (format) {
        case 'srt': return toSrt(blocks);
        case 'vtt': return toVtt(blocks);
        case 'txt': return toTxt(blocks);
        case 'json': return toJson(blocks);
    }
};
