/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Gemini Transcription Client
 *  @author Ruslan Aliyev
 *
 *  Talks to Gemini straight from the browser. Google echoes the CORS origin on
 *  both the interactions and the resumable upload endpoints, so audio never
 *  passes through our own backend — which it could not anyway, since Vercel
 *  functions cap bodies at 4.5 MB and run for at most 300 s.
 *
 *  The API key belongs to the viewer and lives only in their localStorage.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { Word } from '../utils/subtitleBuilder';

const API_ROOT = 'https://generativelanguage.googleapis.com';
const INTERACTIONS_URL = `${API_ROOT}/v1beta/interactions`;
const UPLOAD_URL = `${API_ROOT}/upload/v1beta/files`;

export const TRANSCRIBE_MODEL = 'gemini-3.5-transcribe';

/** Word-level timestamps cost head-room: 30 minutes per request instead of an hour. */
export const MAX_MINUTES_PER_REQUEST = 30;

/** custom_vocabulary is capped by the API. */
export const MAX_VOCABULARY_TERMS = 100;

const RETRY_DELAYS_MS = [2000, 4000, 8000];

export type TranscribeErrorCode =
    | 'invalidKey'
    | 'rateLimit'
    | 'quota'
    | 'server'
    | 'network'
    | 'cancelled'
    | 'unknown';

/** Carries a translatable code rather than a raw API message. */
export class TranscribeError extends Error {
    constructor(
        public readonly code: TranscribeErrorCode,
        public readonly detail?: string,
        public readonly status?: number,
    ) {
        super(detail ?? code);
        this.name = 'TranscribeError';
    }
}

export interface TranscriptionConfig {
    /** BCP-47 codes; an empty list asks Gemini to detect the language. */
    languageCodes: string[];
    /** Names and jargon to bias recognition towards. */
    customVocabulary: string[];
}

export interface UploadedFile {
    uri: string;
    mimeType: string;
    /** Resource name ("files/abc123"), needed to delete it afterwards. */
    name: string;
}

const isAbort = (error: unknown): boolean =>
    error instanceof DOMException && error.name === 'AbortError';

/** Map a failed response onto a code the UI can translate. */
const classifyResponse = (status: number, body: string): TranscribeError => {
    const lower = body.toLowerCase();

    if (status === 401 || status === 403 || lower.includes('api key not valid')) {
        return new TranscribeError('invalidKey', body, status);
    }
    if (status === 429) {
        const isQuota = lower.includes('quota') || lower.includes('billing');
        return new TranscribeError(isQuota ? 'quota' : 'rateLimit', body, status);
    }
    if (status >= 500) {
        return new TranscribeError('server', body, status);
    }
    return new TranscribeError('unknown', body, status);
};

const isRetryable = (error: TranscribeError): boolean =>
    error.code === 'rateLimit' || error.code === 'quota' || error.code === 'server' || error.code === 'network';

const delay = (ms: number, signal?: AbortSignal): Promise<void> =>
    new Promise((resolve, reject) => {
        const timer = setTimeout(resolve, ms);
        signal?.addEventListener('abort', () => {
            clearTimeout(timer);
            reject(new TranscribeError('cancelled'));
        }, { once: true });
    });

/** Run an API call, backing off on rate limits and server faults. */
const withRetry = async <T>(
    operation: () => Promise<T>,
    signal?: AbortSignal,
    onRetry?: (attempt: number, waitMs: number) => void,
): Promise<T> => {
    let lastError: TranscribeError = new TranscribeError('unknown');

    for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt += 1) {
        try {
            return await operation();
        } catch (error) {
            if (error instanceof TranscribeError && error.code === 'cancelled') throw error;
            if (isAbort(error)) throw new TranscribeError('cancelled');

            lastError = error instanceof TranscribeError
                ? error
                : new TranscribeError('network', error instanceof Error ? error.message : String(error));

            const canRetry = isRetryable(lastError) && attempt < RETRY_DELAYS_MS.length;
            if (!canRetry) throw lastError;

            const waitMs = RETRY_DELAYS_MS[attempt];
            onRetry?.(attempt + 1, waitMs);
            await delay(waitMs, signal);
        }
    }

    throw lastError;
};

/**
 * "12.345s" -> 12.345.
 *
 * Gemini sends offsets as strings with a trailing "s" ("0s", "1s", "0.100s").
 * Anything unparseable yields null so the caller can skip that word rather than
 * poison the timeline with NaN.
 */
export const parseOffsetSeconds = (value: unknown): number | null => {
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (typeof value !== 'string') return null;

    const trimmed = value.trim();
    if (trimmed.length === 0) return null;

    const parsed = Number.parseFloat(trimmed.endsWith('s') ? trimmed.slice(0, -1) : trimmed);
    return Number.isFinite(parsed) ? parsed : null;
};

interface RawAnnotation {
    type?: string;
    text?: string;
    start_offset?: unknown;
    end_offset?: unknown;
    startOffset?: unknown;
    endOffset?: unknown;
}

const isWordInfo = (annotation: RawAnnotation): boolean =>
    annotation.type === 'word_info' || annotation.type === 'wordInfo';

/**
 * Pull word timings out of an interaction response.
 *
 * Path is interaction.steps[].content[].annotations[] where type is "word_info".
 * REST replies may camelCase the offset fields even though the request uses
 * snake_case, so both spellings are accepted. Each word gets a leading space:
 * Gemini returns bare words and the slicer joins with '', so without it the whole
 * subtitle comes out as "MerhabaDünyaNasılsın".
 */
export const extractWords = (payload: unknown): Word[] => {
    const root = payload as Record<string, unknown> | null;
    if (!root || typeof root !== 'object') return [];

    const interaction = (root.interaction ?? root.response ?? root) as Record<string, unknown>;
    const steps = interaction?.steps;
    if (!Array.isArray(steps)) return [];

    const words: Word[] = [];

    for (const step of steps) {
        const content = (step as Record<string, unknown>)?.content;
        if (!Array.isArray(content)) continue;

        for (const part of content) {
            const annotations = (part as Record<string, unknown>)?.annotations;
            if (!Array.isArray(annotations)) continue;

            for (const annotation of annotations as RawAnnotation[]) {
                if (!isWordInfo(annotation)) continue;
                if (typeof annotation.text !== 'string' || annotation.text.length === 0) continue;

                const start = parseOffsetSeconds(annotation.start_offset ?? annotation.startOffset);
                const end = parseOffsetSeconds(annotation.end_offset ?? annotation.endOffset);
                if (start === null || end === null) continue;

                words.push({ word: ` ${annotation.text}`, start, end });
            }
        }
    }

    return words;
};

/** Shift a chunk's timings onto the full-file timeline. */
export const offsetWords = (words: Word[], offsetSeconds: number): Word[] =>
    words.map((word) => ({
        ...word,
        start: word.start + offsetSeconds,
        end: word.end + offsetSeconds,
    }));

/**
 * Force a merged word list to run forwards.
 *
 * Chunk boundaries can leave a word starting before its predecessor ended, which
 * downstream turns into overlapping blocks.
 */
export const enforceMonotonicWords = (words: Word[]): Word[] => {
    const ordered = words.map((word) => ({ ...word }));

    for (let i = 1; i < ordered.length; i += 1) {
        if (ordered[i].start < ordered[i - 1].end) {
            ordered[i - 1].end = ordered[i].start - 0.001;
        }
    }

    return ordered;
};

const readErrorBody = async (response: Response): Promise<string> => {
    try {
        return (await response.text()).slice(0, 500);
    } catch {
        return `HTTP ${response.status}`;
    }
};

/**
 * Start a resumable upload and push the bytes.
 *
 * XHR rather than fetch for the byte transfer: it is the only way to report
 * upload progress, which matters when the file is a podcast over a phone link.
 */
export const uploadAudio = async (
    apiKey: string,
    blob: Blob,
    mimeType: string,
    displayName: string,
    signal?: AbortSignal,
    onProgress?: (fraction: number) => void,
): Promise<UploadedFile> => {
    const startResponse = await fetch(UPLOAD_URL, {
        method: 'POST',
        headers: {
            'x-goog-api-key': apiKey,
            'x-goog-upload-protocol': 'resumable',
            'x-goog-upload-command': 'start',
            'x-goog-upload-header-content-length': String(blob.size),
            'x-goog-upload-header-content-type': mimeType,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ file: { display_name: displayName } }),
        signal,
    });

    if (!startResponse.ok) {
        throw classifyResponse(startResponse.status, await readErrorBody(startResponse));
    }

    const uploadUrl = startResponse.headers.get('x-goog-upload-url');
    if (!uploadUrl) {
        throw new TranscribeError('unknown', 'Upload session URL missing from response');
    }

    const uploaded = await new Promise<Record<string, unknown>>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', uploadUrl, true);
        xhr.setRequestHeader('x-goog-api-key', apiKey);
        xhr.setRequestHeader('x-goog-upload-offset', '0');
        xhr.setRequestHeader('x-goog-upload-command', 'upload, finalize');

        xhr.upload.onprogress = (event) => {
            if (event.lengthComputable && onProgress) {
                onProgress(event.loaded / event.total);
            }
        };

        xhr.onload = () => {
            if (xhr.status < 200 || xhr.status >= 300) {
                reject(classifyResponse(xhr.status, xhr.responseText?.slice(0, 500) ?? ''));
                return;
            }
            try {
                resolve(JSON.parse(xhr.responseText));
            } catch {
                reject(new TranscribeError('unknown', 'Upload response was not JSON'));
            }
        };

        xhr.onerror = () => reject(new TranscribeError('network', 'Upload failed'));
        xhr.ontimeout = () => reject(new TranscribeError('network', 'Upload timed out'));
        xhr.onabort = () => reject(new TranscribeError('cancelled'));

        signal?.addEventListener('abort', () => xhr.abort(), { once: true });
        xhr.send(blob);
    });

    const file = (uploaded.file ?? uploaded) as Record<string, unknown>;
    const uri = typeof file.uri === 'string' ? file.uri : null;
    const name = typeof file.name === 'string' ? file.name : null;
    const returnedMime = typeof file.mimeType === 'string'
        ? file.mimeType
        : (typeof file.mime_type === 'string' ? file.mime_type : mimeType);

    if (!uri || !name) {
        throw new TranscribeError('unknown', 'Upload response did not contain a file URI');
    }

    await waitUntilActive(apiKey, name, file.state, signal);

    return { uri, mimeType: returnedMime, name };
};

/**
 * Block until the Files API finishes processing.
 *
 * Transcribing a file still in PROCESSING fails, and the state field is absent
 * on some responses — in which case there is nothing to wait for.
 */
const waitUntilActive = async (
    apiKey: string,
    name: string,
    initialState: unknown,
    signal?: AbortSignal,
    timeoutMs = 120_000,
): Promise<void> => {
    if (typeof initialState !== 'string' || initialState === 'ACTIVE') return;

    const deadline = Date.now() + timeoutMs;

    while (Date.now() < deadline) {
        await delay(1500, signal);

        const response = await fetch(`${API_ROOT}/v1beta/${name}`, {
            headers: { 'x-goog-api-key': apiKey },
            signal,
        });

        if (!response.ok) {
            throw classifyResponse(response.status, await readErrorBody(response));
        }

        const file = await response.json() as Record<string, unknown>;
        if (file.state === 'ACTIVE') return;
        if (file.state === 'FAILED') {
            throw new TranscribeError('server', 'Gemini could not process the audio file');
        }
    }

    throw new TranscribeError('server', 'Timed out waiting for the upload to become available');
};

/** Best-effort cleanup; a leftover file is not worth failing the run over. */
export const deleteUploadedFile = async (apiKey: string, name: string): Promise<void> => {
    try {
        await fetch(`${API_ROOT}/v1beta/${name}`, {
            method: 'DELETE',
            headers: { 'x-goog-api-key': apiKey },
        });
    } catch {
        // The file expires on its own within 48 hours.
    }
};

/** Build the interactions request body. Exported so tests can pin the shape. */
export const buildTranscriptionRequest = (
    file: UploadedFile,
    config: TranscriptionConfig,
): Record<string, unknown> => ({
    model: TRANSCRIBE_MODEL,
    input: [{ type: 'audio', uri: file.uri, mime_type: file.mimeType }],
    generation_config: {
        transcription_config: {
            language_codes: config.languageCodes,
            custom_vocabulary: config.customVocabulary.slice(0, MAX_VOCABULARY_TERMS),
            // "verbatim" is mandatory: the smart mode carries no
            // timestamp_granularities field, so it yields no word timings at all
            // and there is nothing to build subtitles from.
            mode: { type: 'verbatim', timestamp_granularities: ['word'] },
        },
    },
});

/** Transcribe one already-uploaded file into word timings. */
export const transcribeFile = async (
    apiKey: string,
    file: UploadedFile,
    config: TranscriptionConfig,
    signal?: AbortSignal,
    onRetry?: (attempt: number, waitMs: number) => void,
): Promise<Word[]> => {
    const payload = await withRetry(async () => {
        const response = await fetch(INTERACTIONS_URL, {
            method: 'POST',
            headers: {
                'x-goog-api-key': apiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(buildTranscriptionRequest(file, config)),
            signal,
        });

        if (!response.ok) {
            throw classifyResponse(response.status, await readErrorBody(response));
        }

        return response.json() as Promise<unknown>;
    }, signal, onRetry);

    return extractWords(payload);
};
