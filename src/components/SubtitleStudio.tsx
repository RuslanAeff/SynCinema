/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Subtitle Studio
 *  @author Ruslan Aliyev
 *
 *  Web port of the AutoSRT desktop app: audio in, subtitles out, entirely in the
 *  browser. The audio goes straight from the device to Gemini — nothing passes
 *  through our own backend, and the API key never leaves this browser.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
    AlertCircle, Captions, Check, Copy, Download, ExternalLink, Eye, EyeOff,
    FileAudio, KeyRound, Loader2, RotateCcw, Share2, Upload, X,
} from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { en } from '../i18n/en';
import { useTranscription } from '../hooks/useTranscription';
import {
    CHUNK_THRESHOLD_SECONDS, canExtractVideoAudio, isVideoFile,
} from '../utils/audioPrep';
import {
    DEFAULT_SLICE_OPTIONS, FORMAT_EXTENSIONS, FORMAT_MIME_TYPES, SubtitleBlock,
    SubtitleFormat, buildSubtitleBlocks, formatTimestamp, renderSubtitles,
} from '../utils/subtitleBuilder';
import { TranscribeErrorCode } from '../lib/geminiTranscribe';

const API_KEY_STORAGE = 'syncinema.subtitleStudio.apiKey';
const SETTINGS_STORAGE = 'syncinema.subtitleStudio.settings';

const AI_STUDIO_URL = 'https://aistudio.google.com/app/apikey';

/** BCP-47 codes offered in the picker; an empty list means auto-detect. */
const LANGUAGE_OPTIONS: { code: string; label: string }[] = [
    { code: 'tr-TR', label: 'Türkçe' },
    { code: 'az-AZ', label: 'Azərbaycanca' },
    { code: 'en-US', label: 'English' },
    { code: 'de-DE', label: 'Deutsch' },
    { code: 'es-ES', label: 'Español' },
    { code: 'fr-FR', label: 'Français' },
    { code: 'it-IT', label: 'Italiano' },
    { code: 'ru-RU', label: 'Русский' },
    { code: 'pt-PT', label: 'Português' },
    { code: 'ar-SA', label: 'العربية' },
    { code: 'zh-CN', label: '中文' },
    { code: 'ja-JP', label: '日本語' },
    { code: 'ko-KR', label: '한국어' },
    { code: 'nl-NL', label: 'Nederlands' },
    { code: 'pl-PL', label: 'Polski' },
    { code: 'uk-UA', label: 'Українська' },
];

const ALL_FORMATS: SubtitleFormat[] = ['srt', 'vtt', 'txt', 'json'];

interface StudioSettings {
    language: string;
    vocabulary: string;
    maxChars: number;
    minDur: number;
    sentenceOnly: boolean;
    formats: SubtitleFormat[];
}

const DEFAULT_SETTINGS: StudioSettings = {
    language: 'auto',
    vocabulary: '',
    maxChars: DEFAULT_SLICE_OPTIONS.maxChars,
    minDur: DEFAULT_SLICE_OPTIONS.minDur,
    sentenceOnly: DEFAULT_SLICE_OPTIONS.sentenceOnly,
    formats: ['srt'],
};

const readSettings = (): StudioSettings => {
    try {
        const stored = window.localStorage.getItem(SETTINGS_STORAGE);
        if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) as Partial<StudioSettings> };
    } catch {
        // Corrupt or blocked storage falls back to defaults.
    }
    return DEFAULT_SETTINGS;
};

const readApiKey = (): string => {
    try {
        return window.localStorage.getItem(API_KEY_STORAGE) ?? '';
    } catch {
        return '';
    }
};

/** Fill {placeholders} in a translated string. */
const fill = (template: string, values: Record<string, string | number>): string =>
    template.replace(/\{(\w+)\}/g, (_, key: string) => String(values[key] ?? ''));

const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const rest = Math.round(seconds % 60);
    return `${minutes}:${String(rest).padStart(2, '0')}`;
};

interface SubtitleStudioProps {
    isOpen: boolean;
    onClose: () => void;
    /** Hand the finished subtitles to the player, when one is loaded. */
    onUseInPlayer?: (file: File) => void;
}

export const SubtitleStudio: React.FC<SubtitleStudioProps> = ({ isOpen, onClose, onUseInPlayer }) => {
    const { t } = useI18n();
    // The section is optional in the Translations type, so English backs it up.
    const strings = t.subtitleStudio ?? en.subtitleStudio!;

    const { state, start, cancel, reset } = useTranscription();

    const [apiKey, setApiKey] = useState(readApiKey);
    const [showKey, setShowKey] = useState(false);
    const [settings, setSettings] = useState<StudioSettings>(readSettings);
    const [file, setFile] = useState<File | null>(null);
    const [fileDuration, setFileDuration] = useState<number | null>(null);
    const [localError, setLocalError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);
    const [copiedFormat, setCopiedFormat] = useState<SubtitleFormat | null>(null);
    const [editedBlocks, setEditedBlocks] = useState<SubtitleBlock[] | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        try {
            window.localStorage.setItem(API_KEY_STORAGE, apiKey);
        } catch {
            // Nothing to do — the key just will not persist.
        }
    }, [apiKey]);

    useEffect(() => {
        try {
            window.localStorage.setItem(SETTINGS_STORAGE, JSON.stringify(settings));
        } catch {
            // Same: settings simply will not persist.
        }
    }, [settings]);

    // Re-slicing is local and instant, so readability changes never re-transcribe.
    const derivedBlocks = useMemo(
        () => buildSubtitleBlocks(state.words, {
            maxChars: settings.maxChars,
            minDur: settings.minDur,
            sentenceOnly: settings.sentenceOnly,
        }),
        [state.words, settings.maxChars, settings.minDur, settings.sentenceOnly],
    );

    // Hand-edits belong to one slicing; changing the settings re-slices from scratch.
    useEffect(() => setEditedBlocks(null), [derivedBlocks]);

    const blocks = editedBlocks ?? derivedBlocks;

    const isVideo = file ? isVideoFile(file) : false;
    const videoTooBig = isVideo && file ? !canExtractVideoAudio(file) : false;
    const isLongFile = fileDuration !== null && fileDuration > CHUNK_THRESHOLD_SECONDS;
    const isRunning = state.status === 'running';
    const hasKey = apiKey.trim().length > 0;

    const baseName = useMemo(
        () => (file?.name ?? 'subtitles').replace(/\.[^./\\]+$/, ''),
        [file],
    );

    const acceptFile = useCallback(async (incoming: File) => {
        setLocalError(null);
        setFile(incoming);
        setFileDuration(null);
        reset();

        try {
            const { probeDuration } = await import('../utils/audioPrep');
            setFileDuration(await probeDuration(incoming));
        } catch {
            setLocalError(strings.errorNoAudio);
        }
    }, [reset, strings.errorNoAudio]);

    const handleDrop = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        setIsDragging(false);
        const dropped = event.dataTransfer.files?.[0];
        if (dropped) void acceptFile(dropped);
    }, [acceptFile]);

    const handleGenerate = useCallback(() => {
        if (!file || !hasKey || videoTooBig) return;

        void start(
            file,
            apiKey.trim(),
            {
                languageCodes: settings.language === 'auto' ? [] : [settings.language],
                customVocabulary: settings.vocabulary
                    .split(',')
                    .map((term) => term.trim())
                    .filter(Boolean),
            },
            isVideo,
        );
    }, [file, hasKey, videoTooBig, start, apiKey, settings.language, settings.vocabulary, isVideo]);

    const updateBlock = useCallback((index: number, patch: Partial<SubtitleBlock>) => {
        setEditedBlocks((previous) => {
            const source = previous ?? derivedBlocks;
            return source.map((block, i) => (i === index ? { ...block, ...patch } : block));
        });
    }, [derivedBlocks]);

    const buildFile = useCallback((format: SubtitleFormat): File =>
        new File(
            [renderSubtitles(blocks, format)],
            `${baseName}.${FORMAT_EXTENSIONS[format]}`,
            { type: FORMAT_MIME_TYPES[format] },
        ), [blocks, baseName]);

    const handleDownload = useCallback((format: SubtitleFormat) => {
        const url = URL.createObjectURL(buildFile(format));
        const link = document.createElement('a');
        link.href = url;
        link.download = `${baseName}.${FORMAT_EXTENSIONS[format]}`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        // Revoking immediately can cancel the download on some mobile browsers.
        window.setTimeout(() => URL.revokeObjectURL(url), 10_000);
    }, [buildFile, baseName]);

    const handleCopy = useCallback(async (format: SubtitleFormat) => {
        try {
            await navigator.clipboard.writeText(renderSubtitles(blocks, format));
            setCopiedFormat(format);
            window.setTimeout(() => setCopiedFormat(null), 2000);
        } catch {
            setLocalError(strings.errorUnknown);
        }
    }, [blocks, strings.errorUnknown]);

    const handleShare = useCallback(async (format: SubtitleFormat) => {
        const shareFile = buildFile(format);
        try {
            if (navigator.canShare?.({ files: [shareFile] })) {
                await navigator.share({ files: [shareFile], title: shareFile.name });
            }
        } catch {
            // A dismissed share sheet is not an error worth reporting.
        }
    }, [buildFile]);

    const canShare = typeof navigator !== 'undefined' && typeof navigator.canShare === 'function';

    const errorMessage = useMemo((): string | null => {
        if (localError) return localError;
        if (!state.errorCode) return null;

        const map: Record<TranscribeErrorCode, string> = {
            invalidKey: strings.errorInvalidKey,
            rateLimit: strings.errorRateLimit,
            quota: strings.errorQuota,
            server: strings.errorServer,
            network: strings.errorNetwork,
            cancelled: '',
            unknown: strings.errorUnknown,
        };
        return map[state.errorCode] || strings.errorUnknown;
    }, [localError, state.errorCode, strings]);

    const phaseLabel = state.phase === 'prepare' ? strings.phasePrepare
        : state.phase === 'upload' ? strings.phaseUpload
            : state.phase === 'transcribe' ? strings.phaseTranscribe : '';

    if (!isOpen) return null;

    const fieldClass = 'w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent';
    const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2';

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm" onClick={onClose} />

            <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 sm:rounded-2xl shadow-2xl w-full h-full sm:w-[92%] sm:max-w-2xl sm:h-auto sm:max-h-[92vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 sm:p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between gap-3 shrink-0">
                    <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center shrink-0">
                            <Captions size={20} className="text-white" />
                        </div>
                        <div className="min-w-0">
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white truncate">{strings.title}</h2>
                            <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{strings.subtitle}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors shrink-0"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                    {/* API key */}
                    <div>
                        <label className={labelClass}>
                            <span className="inline-flex items-center gap-2"><KeyRound size={14} />{strings.apiKeyLabel}</span>
                        </label>
                        <div className="relative">
                            <input
                                type={showKey ? 'text' : 'password'}
                                value={apiKey}
                                onChange={(event) => setApiKey(event.target.value)}
                                placeholder={strings.apiKeyPlaceholder}
                                autoComplete="off"
                                spellCheck={false}
                                className={`${fieldClass} pr-12`}
                            />
                            <button
                                type="button"
                                onClick={() => setShowKey((visible) => !visible)}
                                title={showKey ? strings.apiKeyHide : strings.apiKeyShow}
                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                            >
                                {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">{strings.apiKeyHelp}</p>
                        {!hasKey && (
                            <a
                                href={AI_STUDIO_URL}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-primary-600 dark:text-primary-400 hover:underline"
                            >
                                {strings.apiKeyGet}<ExternalLink size={12} />
                            </a>
                        )}
                    </div>

                    {!hasKey ? (
                        <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                            <AlertCircle size={18} className="text-amber-500 shrink-0 mt-0.5" />
                            <p className="text-sm text-amber-800 dark:text-amber-200">{strings.apiKeyMissing}</p>
                        </div>
                    ) : (
                        <>
                            {/* File picker */}
                            <div
                                onDragOver={(event) => { event.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`rounded-xl border-2 border-dashed p-6 text-center cursor-pointer transition-colors ${isDragging
                                    ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                                    : 'border-gray-300 dark:border-gray-700 hover:border-primary-400 dark:hover:border-primary-600'
                                    }`}
                            >
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="audio/*,video/*"
                                    className="hidden"
                                    onChange={(event) => {
                                        const picked = event.target.files?.[0];
                                        if (picked) void acceptFile(picked);
                                        event.target.value = '';
                                    }}
                                />
                                {file ? (
                                    <div className="flex items-center justify-center gap-3 text-left">
                                        <FileAudio size={24} className="text-primary-500 shrink-0" />
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">{file.name}</p>
                                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                                {fileDuration !== null
                                                    ? `${strings.fileDuration}: ${formatDuration(fileDuration)}`
                                                    : `${(file.size / 1024 / 1024).toFixed(1)} MB`}
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={24} className="mx-auto mb-2 text-gray-400" />
                                        <p className="text-sm text-gray-600 dark:text-gray-300">{strings.fileDrop}</p>
                                        <p className="text-xs text-gray-400 mt-1">{strings.fileBrowse}</p>
                                    </>
                                )}
                            </div>

                            {videoTooBig && (
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-red-700 dark:text-red-300">{strings.fileVideoTooBig}</p>
                                </div>
                            )}
                            {isVideo && !videoTooBig && (
                                <p className="text-xs text-gray-500 dark:text-gray-400">{strings.fileVideoHint}</p>
                            )}
                            {isLongFile && (
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                                    <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                                    <p className="text-xs text-amber-700 dark:text-amber-300">{strings.longFileWarning}</p>
                                </div>
                            )}

                            {/* Language + vocabulary */}
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div>
                                    <label className={labelClass}>{strings.languageLabel}</label>
                                    <select
                                        value={settings.language}
                                        onChange={(event) => setSettings((s) => ({ ...s, language: event.target.value }))}
                                        className={fieldClass}
                                    >
                                        <option value="auto">{strings.languageAuto}</option>
                                        {LANGUAGE_OPTIONS.map((option) => (
                                            <option key={option.code} value={option.code}>{option.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelClass}>{strings.vocabularyLabel}</label>
                                    <input
                                        type="text"
                                        value={settings.vocabulary}
                                        onChange={(event) => setSettings((s) => ({ ...s, vocabulary: event.target.value }))}
                                        placeholder={strings.vocabularyPlaceholder}
                                        className={fieldClass}
                                    />
                                    <p className="mt-1.5 text-xs text-gray-500 dark:text-gray-400">{strings.vocabularyHelp}</p>
                                </div>
                            </div>

                            {/* Readability */}
                            <div className="rounded-xl border border-gray-200 dark:border-gray-800 p-4 space-y-4">
                                <p className="text-sm font-semibold text-gray-900 dark:text-white">{strings.readabilityTitle}</p>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm text-gray-700 dark:text-gray-300">{strings.maxCharsLabel}</label>
                                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{settings.maxChars}</span>
                                    </div>
                                    <input
                                        type="range" min={20} max={90} step={1}
                                        value={settings.maxChars}
                                        onChange={(event) => setSettings((s) => ({ ...s, maxChars: Number(event.target.value) }))}
                                        className="w-full cursor-pointer accent-primary-500"
                                    />
                                </div>

                                <div>
                                    <div className="flex items-center justify-between mb-2">
                                        <label className="text-sm text-gray-700 dark:text-gray-300">{strings.minDurLabel}</label>
                                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{settings.minDur.toFixed(1)}s</span>
                                    </div>
                                    <input
                                        type="range" min={0} max={2} step={0.1}
                                        value={settings.minDur}
                                        onChange={(event) => setSettings((s) => ({ ...s, minDur: Number(event.target.value) }))}
                                        className="w-full cursor-pointer accent-primary-500"
                                    />
                                </div>

                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={settings.sentenceOnly}
                                        onChange={(event) => setSettings((s) => ({ ...s, sentenceOnly: event.target.checked }))}
                                        className="w-4 h-4 rounded accent-primary-500"
                                    />
                                    <span className="text-sm text-gray-700 dark:text-gray-300">{strings.sentenceOnlyLabel}</span>
                                </label>
                            </div>

                            {/* Formats */}
                            <div>
                                <label className={labelClass}>{strings.formatsTitle}</label>
                                <div className="flex flex-wrap gap-2">
                                    {ALL_FORMATS.map((format) => {
                                        const selected = settings.formats.includes(format);
                                        return (
                                            <button
                                                key={format}
                                                onClick={() => setSettings((s) => ({
                                                    ...s,
                                                    // Never let the last format be turned off.
                                                    formats: selected
                                                        ? (s.formats.length > 1 ? s.formats.filter((f) => f !== format) : s.formats)
                                                        : [...s.formats, format],
                                                }))}
                                                className={`px-4 py-2 rounded-lg text-sm font-medium uppercase transition-colors ${selected
                                                    ? 'bg-primary-600 text-white'
                                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                                                    }`}
                                            >
                                                {format}
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Progress */}
                            {isRunning && (
                                <div className="rounded-xl border border-primary-200 dark:border-primary-800 bg-primary-50 dark:bg-primary-900/20 p-4 space-y-3">
                                    <div className="flex items-center gap-3">
                                        <Loader2 size={18} className="text-primary-500 animate-spin shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium text-gray-900 dark:text-white">{phaseLabel}</p>
                                            {state.chunkCount > 1 && (
                                                <p className="text-xs text-gray-500 dark:text-gray-400">
                                                    {fill(strings.chunkProgress, { current: state.chunkIndex, total: state.chunkCount })}
                                                </p>
                                            )}
                                            {state.retryingInSeconds !== null && (
                                                <p className="text-xs text-amber-600 dark:text-amber-400">
                                                    {fill(strings.retrying, { seconds: state.retryingInSeconds })}
                                                </p>
                                            )}
                                        </div>
                                        <span className="text-xs font-mono text-gray-500 dark:text-gray-400">
                                            {Math.round(state.progress * 100)}%
                                        </span>
                                    </div>
                                    <div className="h-2 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                        <div
                                            className="h-full bg-primary-500 transition-[width] duration-300"
                                            style={{ width: `${Math.round(state.progress * 100)}%` }}
                                        />
                                    </div>
                                </div>
                            )}

                            {errorMessage && (
                                <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                                    <AlertCircle size={16} className="text-red-500 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700 dark:text-red-300">{errorMessage}</p>
                                </div>
                            )}

                            {/* Result */}
                            {state.status === 'done' && (
                                <div className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{strings.resultTitle}</p>
                                        <span className="text-xs text-gray-500 dark:text-gray-400">
                                            {fill(strings.resultBlocks, { count: blocks.length })}
                                        </span>
                                    </div>

                                    {blocks.length === 0 ? (
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{strings.resultEmpty}</p>
                                    ) : (
                                        <div className="max-h-72 overflow-y-auto rounded-xl border border-gray-200 dark:border-gray-800 divide-y divide-gray-200 dark:divide-gray-800">
                                            {blocks.map((block, index) => (
                                                <div key={index} className="p-3 space-y-2">
                                                    <div className="flex items-center gap-2 text-xs font-mono text-gray-500 dark:text-gray-400">
                                                        <span className="w-6 shrink-0">{index + 1}</span>
                                                        <input
                                                            type="number" step={0.1} min={0}
                                                            value={block.start}
                                                            onChange={(event) => updateBlock(index, { start: Number(event.target.value) })}
                                                            className="w-24 px-2 py-1 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                                                        />
                                                        <span>→</span>
                                                        <input
                                                            type="number" step={0.1} min={0}
                                                            value={block.end}
                                                            onChange={(event) => updateBlock(index, { end: Number(event.target.value) })}
                                                            className="w-24 px-2 py-1 rounded bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                                                        />
                                                        <span className="hidden sm:inline text-gray-400">
                                                            {formatTimestamp(block.start)}
                                                        </span>
                                                    </div>
                                                    <textarea
                                                        value={block.text}
                                                        rows={2}
                                                        onChange={(event) => updateBlock(index, { text: event.target.value })}
                                                        className="w-full px-3 py-2 text-sm rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white resize-y"
                                                    />
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {blocks.length > 0 && (
                                        <div className="space-y-2">
                                            {settings.formats.map((format) => (
                                                <div key={format} className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleDownload(format)}
                                                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-primary-600 hover:bg-primary-500 text-white text-sm font-medium transition-colors"
                                                    >
                                                        <Download size={16} />
                                                        {strings.download} .{FORMAT_EXTENSIONS[format]}
                                                    </button>
                                                    <button
                                                        onClick={() => void handleCopy(format)}
                                                        title={strings.copy}
                                                        className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                                                    >
                                                        {copiedFormat === format ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
                                                    </button>
                                                    {canShare && (
                                                        <button
                                                            onClick={() => void handleShare(format)}
                                                            title={strings.share}
                                                            className="p-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                                                        >
                                                            <Share2 size={16} />
                                                        </button>
                                                    )}
                                                </div>
                                            ))}

                                            {onUseInPlayer && (
                                                <button
                                                    onClick={() => { onUseInPlayer(buildFile('srt')); onClose(); }}
                                                    className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-sm font-medium transition-colors"
                                                >
                                                    <Captions size={16} />{strings.useInPlayer}
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}
                </div>

                {/* Footer actions */}
                {hasKey && (
                    <div className="p-4 sm:p-6 border-t border-gray-200 dark:border-gray-800 shrink-0 flex items-center gap-3">
                        {isRunning ? (
                            <button
                                onClick={cancel}
                                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-600 hover:bg-red-500 text-white font-medium transition-colors"
                            >
                                <X size={18} />{strings.cancel}
                            </button>
                        ) : (
                            <>
                                {state.status === 'done' && (
                                    <button
                                        onClick={() => { reset(); setFile(null); setFileDuration(null); }}
                                        title={strings.startOver}
                                        className="p-3 rounded-xl bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-colors"
                                    >
                                        <RotateCcw size={18} />
                                    </button>
                                )}
                                <button
                                    onClick={handleGenerate}
                                    disabled={!file || videoTooBig}
                                    className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-medium transition-colors"
                                >
                                    <Captions size={18} />{strings.generate}
                                </button>
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
