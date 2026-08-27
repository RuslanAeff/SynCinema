/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Transcription Pipeline
 *  @author Ruslan Aliyev
 *
 *  Drives file -> chunks -> upload -> Gemini -> word timings, and hands the raw
 *  words back. Slicing them into subtitle blocks happens separately so that
 *  changing the readability settings re-slices instantly instead of paying for
 *  another transcription.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useCallback, useRef, useState } from 'react';
import {
    TranscribeError,
    TranscribeErrorCode,
    TranscriptionConfig,
    deleteUploadedFile,
    enforceMonotonicWords,
    offsetWords,
    transcribeFile,
    uploadAudio,
} from '../lib/geminiTranscribe';
import { CHUNK_THRESHOLD_SECONDS, prepareAudioChunks, probeDuration } from '../utils/audioPrep';
import { Word, assignSegmentEnds } from '../utils/subtitleBuilder';

export type TranscriptionPhase = 'prepare' | 'upload' | 'transcribe';

export type TranscriptionStatus = 'idle' | 'running' | 'done' | 'error' | 'cancelled';

export interface TranscriptionState {
    status: TranscriptionStatus;
    phase: TranscriptionPhase | null;
    /** 0..1 across the whole run. */
    progress: number;
    chunkIndex: number;
    chunkCount: number;
    errorCode: TranscribeErrorCode | null;
    /** Set while waiting out a rate-limit backoff, so the UI can explain the pause. */
    retryingInSeconds: number | null;
    words: Word[];
    durationSeconds: number;
}

const INITIAL_STATE: TranscriptionState = {
    status: 'idle',
    phase: null,
    progress: 0,
    chunkIndex: 0,
    chunkCount: 0,
    errorCode: null,
    retryingInSeconds: null,
    words: [],
    durationSeconds: 0,
};

export const useTranscription = () => {
    const [state, setState] = useState<TranscriptionState>(INITIAL_STATE);
    const abortRef = useRef<AbortController | null>(null);
    /** Files already on Google's side, so a cancel or a crash still cleans them up. */
    const uploadedRef = useRef<{ apiKey: string; name: string }[]>([]);

    const cleanupUploads = useCallback(async () => {
        const pending = uploadedRef.current;
        uploadedRef.current = [];
        await Promise.all(pending.map((entry) => deleteUploadedFile(entry.apiKey, entry.name)));
    }, []);

    const cancel = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
        void cleanupUploads();
        setState((previous) => ({ ...previous, status: 'cancelled', phase: null, retryingInSeconds: null }));
    }, [cleanupUploads]);

    const reset = useCallback(() => {
        abortRef.current?.abort();
        abortRef.current = null;
        void cleanupUploads();
        setState(INITIAL_STATE);
    }, [cleanupUploads]);

    const start = useCallback(async (
        file: File,
        apiKey: string,
        config: TranscriptionConfig,
        /** Video needs decoding to strip the picture, however short it is. */
        forceDecode = false,
    ) => {
        const controller = new AbortController();
        abortRef.current = controller;
        uploadedRef.current = [];

        setState({ ...INITIAL_STATE, status: 'running', phase: 'prepare' });

        try {
            const durationSeconds = await probeDuration(file);
            setState((previous) => ({ ...previous, durationSeconds }));

            const chunks = await prepareAudioChunks(
                file,
                durationSeconds,
                // Decoding only happens for long files; short ones jump straight to 15%.
                (fraction) => setState((previous) => ({ ...previous, progress: fraction * 0.15 })),
                forceDecode,
            );

            if (controller.signal.aborted) throw new TranscribeError('cancelled');

            setState((previous) => ({ ...previous, chunkCount: chunks.length, progress: 0.15 }));

            const collected: Word[] = [];

            for (let index = 0; index < chunks.length; index += 1) {
                const chunk = chunks[index];
                // Each chunk owns a slice of the remaining 85% of the bar.
                const chunkShare = 0.85 / chunks.length;
                const chunkBase = 0.15 + chunkShare * index;

                setState((previous) => ({
                    ...previous,
                    phase: 'upload',
                    chunkIndex: index + 1,
                    progress: chunkBase,
                }));

                const uploaded = await uploadAudio(
                    apiKey,
                    chunk.blob,
                    chunk.mimeType,
                    `${file.name}${chunks.length > 1 ? ` (${index + 1}/${chunks.length})` : ''}`,
                    controller.signal,
                    (fraction) => setState((previous) => ({
                        ...previous,
                        progress: chunkBase + chunkShare * 0.4 * fraction,
                    })),
                );

                uploadedRef.current.push({ apiKey, name: uploaded.name });

                setState((previous) => ({
                    ...previous,
                    phase: 'transcribe',
                    progress: chunkBase + chunkShare * 0.45,
                }));

                const words = await transcribeFile(
                    apiKey,
                    uploaded,
                    config,
                    controller.signal,
                    (_attempt, waitMs) => {
                        setState((previous) => ({ ...previous, retryingInSeconds: Math.round(waitMs / 1000) }));
                    },
                );

                setState((previous) => ({ ...previous, retryingInSeconds: null }));

                collected.push(...offsetWords(words, chunk.offsetSeconds));

                await deleteUploadedFile(apiKey, uploaded.name);
                uploadedRef.current = uploadedRef.current.filter((entry) => entry.name !== uploaded.name);

                setState((previous) => ({ ...previous, progress: chunkBase + chunkShare }));
            }

            if (collected.length === 0) {
                throw new TranscribeError('unknown', 'No words were returned');
            }

            const words = assignSegmentEnds(enforceMonotonicWords(collected));

            abortRef.current = null;
            setState((previous) => ({
                ...previous,
                status: 'done',
                phase: null,
                progress: 1,
                words,
            }));
        } catch (error) {
            await cleanupUploads();
            abortRef.current = null;

            const code: TranscribeErrorCode = error instanceof TranscribeError
                ? error.code
                : 'unknown';

            setState((previous) => ({
                ...previous,
                status: code === 'cancelled' ? 'cancelled' : 'error',
                phase: null,
                retryingInSeconds: null,
                errorCode: code === 'cancelled' ? null : code,
            }));
        }
    }, [cleanupUploads]);

    return { state, start, cancel, reset, willChunk: (duration: number) => duration > CHUNK_THRESHOLD_SECONDS };
};
