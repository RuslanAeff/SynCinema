import { describe, it, expect } from 'vitest';
import {
    MAX_BACKTRACK_SECONDS,
    TARGET_CHUNK_SECONDS,
    canExtractVideoAudio,
    encodeWav16,
    findSilentSplit,
    isVideoFile,
    planSplitPoints,
    windowRms,
} from './audioPrep';

/** Loud track with an optional silent stretch, for split-point tests. */
const trackWithSilence = (length: number, silentFrom?: number, silentTo?: number): Float32Array => {
    const samples = new Float32Array(length).fill(0.5);
    if (silentFrom !== undefined && silentTo !== undefined) {
        samples.fill(0, silentFrom, silentTo);
    }
    return samples;
};

describe('windowRms', () => {
    it('is zero for silence', () => {
        expect(windowRms(new Float32Array(100), 0, 100)).toBe(0);
    });

    it('equals the amplitude of a constant signal', () => {
        expect(windowRms(new Float32Array(100).fill(0.5), 0, 100)).toBeCloseTo(0.5, 6);
    });

    it('clamps the range to the buffer and returns zero for an empty span', () => {
        const samples = new Float32Array(10).fill(1);
        expect(windowRms(samples, 0, 999)).toBeCloseTo(1, 6);
        expect(windowRms(samples, 5, 5)).toBe(0);
    });
});

describe('findSilentSplit', () => {
    it('moves the cut into a nearby silence', () => {
        const samples = trackWithSilence(300, 140, 160);
        const split = findSilentSplit(samples, 200, 100, 10);

        expect(split).toBeGreaterThanOrEqual(140);
        expect(split).toBeLessThanOrEqual(160);
    });

    it('cuts on target when the speech never pauses', () => {
        expect(findSilentSplit(trackWithSilence(300), 200, 100, 10)).toBe(200);
    });

    it('cuts on target when there is no room to look back', () => {
        expect(findSilentSplit(trackWithSilence(300), 200, 0, 10)).toBe(200);
    });

    it('ignores silence that lies outside the backtrack window', () => {
        // Quiet at 0-20, but the search only reaches back to 190.
        const samples = trackWithSilence(300, 0, 20);
        expect(findSilentSplit(samples, 200, 10, 10)).toBe(200);
    });

    it('never returns past the end of the track', () => {
        const samples = trackWithSilence(50);
        expect(findSilentSplit(samples, 999, 100, 10)).toBeLessThanOrEqual(50);
    });
});

describe('planSplitPoints', () => {
    const sampleRate = 16_000;
    const minutes = (count: number) => count * 60 * sampleRate;

    it('leaves a short track in one piece', () => {
        expect(planSplitPoints(minutes(10), sampleRate)).toEqual([]);
    });

    it('cuts a long track on the target interval', () => {
        const points = planSplitPoints(minutes(45), sampleRate);

        expect(points).toHaveLength(2);
        expect(points[0]).toBe(TARGET_CHUNK_SECONDS * sampleRate);
        expect(points[1]).toBe(2 * TARGET_CHUNK_SECONDS * sampleRate);
    });

    it('produces strictly increasing boundaries when aligning to silence', () => {
        const total = minutes(45);
        const samples = new Float32Array(total).fill(0.5);
        const points = planSplitPoints(total, sampleRate, samples);

        for (let i = 1; i < points.length; i += 1) {
            expect(points[i]).toBeGreaterThan(points[i - 1]);
        }
        expect(points[0]).toBeGreaterThan(0);
        expect(points[points.length - 1]).toBeLessThan(total);
    });

    it('keeps every chunk inside the API ceiling', () => {
        const points = planSplitPoints(minutes(90), sampleRate);
        const boundaries = [0, ...points, minutes(90)];

        for (let i = 0; i < boundaries.length - 1; i += 1) {
            const chunkSeconds = (boundaries[i + 1] - boundaries[i]) / sampleRate;
            // 30 minutes is the hard limit while word timestamps are enabled.
            expect(chunkSeconds).toBeLessThanOrEqual(30 * 60);
        }
    });

    it('never backtracks further than the documented window', () => {
        expect(MAX_BACKTRACK_SECONDS).toBe(120);
        expect(TARGET_CHUNK_SECONDS + MAX_BACKTRACK_SECONDS).toBeLessThan(30 * 60);
    });
});

describe('encodeWav16', () => {
    const readHeader = async (blob: Blob) => new DataView(await blob.arrayBuffer());
    const ascii = (view: DataView, offset: number, length: number) =>
        Array.from({ length }, (_, i) => String.fromCharCode(view.getUint8(offset + i))).join('');

    it('writes a mono 16-bit PCM header', async () => {
        const view = await readHeader(encodeWav16(new Float32Array(4), 16_000));

        expect(ascii(view, 0, 4)).toBe('RIFF');
        expect(ascii(view, 8, 4)).toBe('WAVE');
        expect(ascii(view, 12, 4)).toBe('fmt ');
        expect(view.getUint16(20, true)).toBe(1);      // PCM
        expect(view.getUint16(22, true)).toBe(1);      // mono
        expect(view.getUint32(24, true)).toBe(16_000); // sample rate
        expect(view.getUint16(34, true)).toBe(16);     // bits per sample
        expect(ascii(view, 36, 4)).toBe('data');
    });

    it('sizes the file and the data chunk from the sample count', async () => {
        const blob = encodeWav16(new Float32Array(10), 16_000);
        const view = await readHeader(blob);

        expect(blob.size).toBe(44 + 20);
        expect(view.getUint32(40, true)).toBe(20);
        expect(view.getUint32(4, true)).toBe(36 + 20);
    });

    it('scales samples to the 16-bit range and clamps overshoot', async () => {
        const view = await readHeader(encodeWav16(new Float32Array([0, 1, -1, 2, -2]), 16_000));

        expect(view.getInt16(44, true)).toBe(0);
        expect(view.getInt16(46, true)).toBe(32767);
        expect(view.getInt16(48, true)).toBe(-32767);
        expect(view.getInt16(50, true)).toBe(32767);  // clamped
        expect(view.getInt16(52, true)).toBe(-32767); // clamped
    });
});

describe('file classification', () => {
    const file = (name: string, type: string, size = 1024): File => {
        const created = new File([new Uint8Array(1)], name, { type });
        Object.defineProperty(created, 'size', { value: size });
        return created;
    };

    it('recognises video by MIME type and by extension', () => {
        expect(isVideoFile(file('a.mp4', 'video/mp4'))).toBe(true);
        expect(isVideoFile(file('a.mkv', ''))).toBe(true);
        expect(isVideoFile(file('a.mp3', 'audio/mpeg'))).toBe(false);
    });

    it('only offers extraction for videos small enough to hold in a tab', () => {
        expect(canExtractVideoAudio(file('small.mp4', 'video/mp4', 10 * 1024 * 1024))).toBe(true);
        expect(canExtractVideoAudio(file('huge.mp4', 'video/mp4', 900 * 1024 * 1024))).toBe(false);
    });
});
