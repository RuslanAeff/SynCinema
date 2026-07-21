/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - .sync Project Import Validation
 *  Whitelist-based sanitization for untrusted .sync/.json import files
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { AudioTrack } from '../types';

// These bounds mirror the sliders/inputs already enforced in AudioTrackRow.tsx
// and MasterVolume.tsx. `offset` has no bound here on purpose — the offset
// number input has no min/max, since the app supports arbitrary ± offsets.
const PLAYBACK_RATE_MIN = 0.5;
const PLAYBACK_RATE_MAX = 2.0;
const GAIN_BOOST_MIN = 1;
const GAIN_BOOST_MAX = 3;
// No UI slider currently exposes free-form EQ band editing (only presets,
// which range -3..6), and AudioGraphManager.tsx applies eq values directly
// to a BiquadFilterNode's gain with no clamping. This bound exists purely as
// a defensive ceiling against an absurd/malicious value reaching the audio
// graph, not as a reflection of a UI-enforced range.
const EQ_BAND_MIN = -24;
const EQ_BAND_MAX = 24;

function isFiniteNumberInRange(value: unknown, min: number, max: number): value is number {
    return typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
}

/**
 * Whitelist-sanitizes a single track's imported preferences before they are
 * spread onto live AudioTrack state. Only the exact fields saveTrackPref()
 * persists are considered; anything else (id, objectUrl, file, ...) is never
 * inspected, so it cannot be reintroduced here even by omission.
 */
export function sanitizeImportedTrackPref(raw: unknown): Partial<AudioTrack> {
    if (typeof raw !== 'object' || raw === null) return {};
    const src = raw as Record<string, unknown>;
    const sanitized: Partial<AudioTrack> = {};

    if (typeof src.offset === 'number' && Number.isFinite(src.offset)) {
        sanitized.offset = src.offset;
    }
    if (isFiniteNumberInRange(src.playbackRate, PLAYBACK_RATE_MIN, PLAYBACK_RATE_MAX)) {
        sanitized.playbackRate = src.playbackRate;
    }
    if (typeof src.deviceId === 'string') {
        sanitized.deviceId = src.deviceId;
    }
    if (typeof src.eq === 'object' && src.eq !== null) {
        const eqSrc = src.eq as Record<string, unknown>;
        if (
            isFiniteNumberInRange(eqSrc.low, EQ_BAND_MIN, EQ_BAND_MAX) &&
            isFiniteNumberInRange(eqSrc.mid, EQ_BAND_MIN, EQ_BAND_MAX) &&
            isFiniteNumberInRange(eqSrc.high, EQ_BAND_MIN, EQ_BAND_MAX)
        ) {
            sanitized.eq = { low: eqSrc.low, mid: eqSrc.mid, high: eqSrc.high };
        }
    }
    if (typeof src.useCompressor === 'boolean') {
        sanitized.useCompressor = src.useCompressor;
    }
    if (isFiniteNumberInRange(src.gainBoost, GAIN_BOOST_MIN, GAIN_BOOST_MAX)) {
        sanitized.gainBoost = src.gainBoost;
    }

    return sanitized;
}

const KNOWN_TRACK_PREF_KEYS = ['offset', 'playbackRate', 'deviceId', 'eq', 'useCompressor', 'gainBoost'] as const;

/**
 * True when the raw import explicitly set one of the known fields but that
 * value was rejected (wrong type or out of range) by sanitizeImportedTrackPref.
 * Extra/unknown fields (id, objectUrl, file, ...) are expected and never
 * flagged here -- only a malformed *known* field is worth surfacing to the user.
 */
export function hadInvalidKnownField(raw: unknown, sanitized: Partial<AudioTrack>): boolean {
    if (typeof raw !== 'object' || raw === null) return false;
    const src = raw as Record<string, unknown>;
    return KNOWN_TRACK_PREF_KEYS.some(key => src[key] !== undefined && !(key in sanitized));
}

export interface SanitizedAppSettings {
    masterVolume?: number;
    theme?: 'dark' | 'light';
}

/** Whitelist-sanitizes the imported top-level appSettings block. */
export function sanitizeImportedAppSettings(raw: unknown): SanitizedAppSettings {
    if (typeof raw !== 'object' || raw === null) return {};
    const src = raw as Record<string, unknown>;
    const sanitized: SanitizedAppSettings = {};

    if (isFiniteNumberInRange(src.masterVolume, 0, 1)) {
        sanitized.masterVolume = src.masterVolume;
    }
    if (src.theme === 'dark' || src.theme === 'light') {
        sanitized.theme = src.theme;
    }

    return sanitized;
}
