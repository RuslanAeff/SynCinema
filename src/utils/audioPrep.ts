/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Audio Preparation
 *  @author Ruslan Aliyev
 *
 *  Gemini accepts at most 30 minutes of audio per request while word-level
 *  timestamps are on. Anything longer is decoded to 16 kHz mono, cut at the
 *  quietest moment near each target boundary so no word is sliced in half, and
 *  uploaded as separate WAV chunks.
 *
 *  Short files are deliberately left untouched: on a phone, not decoding is by
 *  far the fastest path, and an mp3 is already small.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** Files at or under this length are uploaded exactly as they arrived. */
export const CHUNK_THRESHOLD_SECONDS = 25 * 60;

/** Chunk length aimed for, comfortably inside the API's 30-minute ceiling. */
export const TARGET_CHUNK_SECONDS = 20 * 60;

/** How far back we will hunt for silence before giving up and cutting on target. */
export const MAX_BACKTRACK_SECONDS = 120;

/** Speech recognition gains nothing above this, and it keeps uploads small. */
export const TARGET_SAMPLE_RATE = 16_000;

/** RMS at or below this counts as silence. */
export const SILENCE_RMS_THRESHOLD = 0.02;

export interface AudioChunk {
    blob: Blob;
    mimeType: string;
    /** Where this chunk begins in the original file, in seconds. */
    offsetSeconds: number;
}

/**
 * Read a file's duration from a media element.
 *
 * Deliberately not a full decode — that is slow and memory-hungry on a phone,
 * and all we need is the number that decides whether to chunk at all.
 */
export const probeDuration = (file: File): Promise<number> =>
    new Promise((resolve, reject) => {
        const element = document.createElement('audio');
        const url = URL.createObjectURL(file);

        const cleanup = () => {
            URL.revokeObjectURL(url);
            element.removeAttribute('src');
        };

        element.preload = 'metadata';

        element.onloadedmetadata = () => {
            const { duration } = element;
            cleanup();
            if (Number.isFinite(duration) && duration > 0) {
                resolve(duration);
            } else {
                reject(new Error('Could not read the media duration'));
            }
        };

        element.onerror = () => {
            cleanup();
            reject(new Error('Could not read the media file'));
        };

        element.src = url;
    });

/** Root mean square of one window of samples. */
export const windowRms = (samples: Float32Array, from: number, to: number): number => {
    const end = Math.min(to, samples.length);
    if (end <= from) return 0;

    let sum = 0;
    for (let i = from; i < end; i += 1) {
        sum += samples[i] * samples[i];
    }

    return Math.sqrt(sum / (end - from));
};

/**
 * Pick a cut point at the quietest moment at or before the target.
 *
 * Cutting mid-word costs both chunks the word, so we walk back up to
 * `maxBacktrackSamples` looking for something quiet enough to count as a pause.
 * If the audio is unbroken speech we cut on target rather than drift arbitrarily
 * far from the intended chunk length.
 */
export const findSilentSplit = (
    samples: Float32Array,
    targetSample: number,
    maxBacktrackSamples: number,
    windowSamples: number,
    silenceThreshold = SILENCE_RMS_THRESHOLD,
): number => {
    const target = Math.min(targetSample, samples.length);
    const earliest = Math.max(0, target - maxBacktrackSamples);
    if (windowSamples <= 0 || target <= earliest) return target;

    let quietestStart = -1;
    let quietestRms = Number.POSITIVE_INFINITY;

    for (let start = target - windowSamples; start >= earliest; start -= windowSamples) {
        const rms = windowRms(samples, start, start + windowSamples);
        if (rms < quietestRms) {
            quietestRms = rms;
            quietestStart = start;
        }
    }

    if (quietestStart < 0 || quietestRms > silenceThreshold) return target;

    return quietestStart + Math.floor(windowSamples / 2);
};

/**
 * Split points for a decoded track, in sample indices.
 *
 * Returns the boundaries between chunks — never 0 and never the track length.
 */
export const planSplitPoints = (
    totalSamples: number,
    sampleRate: number,
    samples?: Float32Array,
): number[] => {
    const targetSamples = Math.floor(TARGET_CHUNK_SECONDS * sampleRate);
    const backtrackSamples = Math.floor(MAX_BACKTRACK_SECONDS * sampleRate);
    const windowSamples = Math.max(1, Math.floor(sampleRate * 0.02));

    const points: number[] = [];
    let cursor = targetSamples;

    while (cursor < totalSamples) {
        const aligned = samples
            ? findSilentSplit(samples, cursor, backtrackSamples, windowSamples)
            : cursor;

        const previous = points.length > 0 ? points[points.length - 1] : 0;
        // A silence hunt that lands on or behind the previous cut would make an
        // empty chunk; fall back to the unaligned target in that case.
        points.push(aligned > previous ? aligned : cursor);

        cursor += targetSamples;
    }

    return points;
};

/** 16-bit PCM WAV. Gemini accepts it and it needs no encoder library. */
export const encodeWav16 = (samples: Float32Array, sampleRate: number): Blob => {
    const bytesPerSample = 2;
    const buffer = new ArrayBuffer(44 + samples.length * bytesPerSample);
    const view = new DataView(buffer);

    const writeAscii = (offset: number, text: string) => {
        for (let i = 0; i < text.length; i += 1) {
            view.setUint8(offset + i, text.charCodeAt(i));
        }
    };

    const dataBytes = samples.length * bytesPerSample;

    writeAscii(0, 'RIFF');
    view.setUint32(4, 36 + dataBytes, true);
    writeAscii(8, 'WAVE');
    writeAscii(12, 'fmt ');
    view.setUint32(16, 16, true);           // PCM header size
    view.setUint16(20, 1, true);            // PCM format
    view.setUint16(22, 1, true);            // mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * bytesPerSample, true); // byte rate
    view.setUint16(32, bytesPerSample, true);              // block align
    view.setUint16(34, 16, true);           // bits per sample
    writeAscii(36, 'data');
    view.setUint32(40, dataBytes, true);

    for (let i = 0; i < samples.length; i += 1) {
        const clamped = Math.max(-1, Math.min(1, samples[i]));
        view.setInt16(44 + i * bytesPerSample, Math.round(clamped * 32767), true);
    }

    return new Blob([buffer], { type: 'audio/wav' });
};

/**
 * Decode to 16 kHz mono.
 *
 * Rendering straight at the target rate is one step, but some browsers refuse an
 * OfflineAudioContext below their supported range — so we fall back to rendering
 * at the source rate and decimating by hand.
 */
export const decodeToMono16k = async (file: File): Promise<Float32Array> => {
    const arrayBuffer = await file.arrayBuffer();

    const DecodeContext: typeof AudioContext =
        window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;

    const decodeContext = new DecodeContext();
    let decoded: AudioBuffer;
    try {
        decoded = await decodeContext.decodeAudioData(arrayBuffer);
    } finally {
        await decodeContext.close();
    }

    try {
        const offline = new OfflineAudioContext(
            1,
            Math.ceil(decoded.duration * TARGET_SAMPLE_RATE),
            TARGET_SAMPLE_RATE,
        );
        const source = offline.createBufferSource();
        source.buffer = decoded;
        source.connect(offline.destination);
        source.start();
        const rendered = await offline.startRendering();
        return rendered.getChannelData(0);
    } catch {
        return decimateToMono16k(decoded);
    }
};

/** Mix to mono and drop samples to reach 16 kHz, for browsers that reject the fast path. */
const decimateToMono16k = (decoded: AudioBuffer): Float32Array => {
    const ratio = decoded.sampleRate / TARGET_SAMPLE_RATE;
    const outputLength = Math.floor(decoded.length / ratio);
    const output = new Float32Array(outputLength);
    const channels = Array.from(
        { length: decoded.numberOfChannels },
        (_, index) => decoded.getChannelData(index),
    );

    for (let i = 0; i < outputLength; i += 1) {
        const sourceIndex = Math.floor(i * ratio);
        let sum = 0;
        for (const channel of channels) {
            sum += channel[sourceIndex] ?? 0;
        }
        output[i] = sum / channels.length;
    }

    return output;
};

/**
 * Turn a long file into upload-ready chunks.
 *
 * Short files skip decoding entirely and are returned as a single chunk holding
 * the original blob.
 */
export const prepareAudioChunks = async (
    file: File,
    durationSeconds: number,
    onProgress?: (fraction: number) => void,
    /** Decode even when short — video has to be stripped down to its audio track. */
    forceDecode = false,
): Promise<AudioChunk[]> => {
    if (!forceDecode && durationSeconds <= CHUNK_THRESHOLD_SECONDS) {
        return [{
            blob: file,
            mimeType: file.type || 'audio/mpeg',
            offsetSeconds: 0,
        }];
    }

    onProgress?.(0);
    const samples = await decodeToMono16k(file);
    onProgress?.(0.5);

    const splitPoints = planSplitPoints(samples.length, TARGET_SAMPLE_RATE, samples);
    const boundaries = [0, ...splitPoints, samples.length];
    const chunks: AudioChunk[] = [];

    for (let i = 0; i < boundaries.length - 1; i += 1) {
        const from = boundaries[i];
        const to = boundaries[i + 1];
        if (to <= from) continue;

        chunks.push({
            blob: encodeWav16(samples.subarray(from, to), TARGET_SAMPLE_RATE),
            mimeType: 'audio/wav',
            offsetSeconds: from / TARGET_SAMPLE_RATE,
        });

        onProgress?.(0.5 + (0.5 * (i + 1)) / (boundaries.length - 1));
    }

    return chunks;
};

const VIDEO_EXTRACT_LIMIT_BYTES = 150 * 1024 * 1024;

export const isVideoFile = (file: File): boolean =>
    file.type.startsWith('video/') || /\.(mp4|mkv|mov|webm|avi)$/i.test(file.name);

/** Whether extracting audio from this video is worth attempting in a browser tab. */
export const canExtractVideoAudio = (file: File): boolean =>
    file.size <= VIDEO_EXTRACT_LIMIT_BYTES;
