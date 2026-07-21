import { describe, it, expect, beforeAll } from 'vitest';
import { getVideoFingerprint, getAudioFingerprint } from './fileFingerprint';

// The gdrive_ branch resolves a relative proxy URL ("/api/proxy?id=...")
// against window.location.origin, which only exists in a browser. Vitest's
// default `node` test environment has no window global -- without this stub,
// the ReferenceError is silently swallowed by the function's own try/catch
// and the branch falls through to url_ instead of gdrive_ (confirmed by
// reproducing this directly in plain Node before writing this file). This
// stubs only the one property actually read, so the real branch logic can be
// exercised faithfully without introducing a full jsdom environment.
beforeAll(() => {
    if (typeof window === 'undefined') {
        (globalThis as unknown as { window: unknown }).window = {
            location: { origin: 'http://localhost:3000' },
        };
    }
});

function makeFile(name: string, content: string, lastModified = 1700000000000): File {
    return new File([content], name, { type: 'video/mp4', lastModified });
}

describe('getVideoFingerprint', () => {
    it('returns null when both file and objectUrl are null', () => {
        expect(getVideoFingerprint(null, null)).toBeNull();
    });

    it('returns a local_<size>_<hash> fingerprint for a local file', () => {
        const file = makeFile('movie.mp4', 'abc');
        const fp = getVideoFingerprint(file, null);
        expect(fp).toMatch(/^local_3_[a-z0-9]+$/);
    });

    it('is deterministic for the same local file across repeated calls', () => {
        const file = makeFile('movie.mp4', 'abc');
        expect(getVideoFingerprint(file, null)).toBe(getVideoFingerprint(file, null));
    });

    it('produces different fingerprints for meaningfully different local files', () => {
        const a = getVideoFingerprint(makeFile('a.mp4', 'abc'), null);
        const b = getVideoFingerprint(makeFile('b.mp4', 'xyz'), null);
        expect(a).not.toBe(b);
    });

    it('returns a yt_<id> fingerprint for a youtube: prefixed URL', () => {
        expect(getVideoFingerprint(null, 'youtube:dQw4w9WgXcQ')).toBe('yt_dQw4w9WgXcQ');
    });

    it('returns a gdrive_<id> fingerprint for a Google Drive proxy URL', () => {
        expect(getVideoFingerprint(null, '/api/proxy?id=1AbCdEfGhIjKlMnOpQrStUvWxYz1234567')).toBe(
            'gdrive_1AbCdEfGhIjKlMnOpQrStUvWxYz1234567'
        );
    });

    it('returns a url_<hash> fingerprint for a generic HTTPS URL', () => {
        const fp = getVideoFingerprint(null, 'https://example.com/videos/clip.mp4');
        expect(fp).toMatch(/^url_/);
    });

    it('is deterministic for the same generic URL across repeated calls', () => {
        const url = 'https://example.com/videos/clip.mp4';
        expect(getVideoFingerprint(null, url)).toBe(getVideoFingerprint(null, url));
    });

    it('does not crash on a URL with non-Latin1 characters (documented btoa guard)', () => {
        expect(() => getVideoFingerprint(null, 'https://example.com/vidéos/日本語.mp4')).not.toThrow();
        const fp = getVideoFingerprint(null, 'https://example.com/vidéos/日本語.mp4');
        expect(fp).toMatch(/^url_/);
    });
});

describe('getAudioFingerprint', () => {
    it('returns null when both file and url are null', () => {
        expect(getAudioFingerprint(null, null)).toBeNull();
    });

    it('returns a local_<size>_<hash> fingerprint for a local file, matching the video branch format', () => {
        const file = makeFile('track.mp3', 'abc');
        const fp = getAudioFingerprint(file, null);
        expect(fp).toMatch(/^local_3_[a-z0-9]+$/);
    });

    it('is deterministic for the same local file across repeated calls', () => {
        const file = makeFile('track.mp3', 'abc');
        expect(getAudioFingerprint(file, null)).toBe(getAudioFingerprint(file, null));
    });

    it('returns a gdrive_<id> fingerprint for a Google Drive proxy URL', () => {
        expect(getAudioFingerprint(null, '/api/proxy?id=1AbCdEfGhIjKlMnOpQrStUvWxYz1234567')).toBe(
            'gdrive_1AbCdEfGhIjKlMnOpQrStUvWxYz1234567'
        );
    });

    it('returns a url_<hash> fingerprint for a generic HTTPS URL', () => {
        const fp = getAudioFingerprint(null, 'https://example.com/audio/track.mp3');
        expect(fp).toMatch(/^url_/);
    });

    // getAudioFingerprint has no yt_ branch at all (audio tracks are never
    // loaded from YouTube) -- unlike getVideoFingerprint, a 'youtube:'-scheme
    // input here falls through to the generic-URL branch. This is real,
    // current behavior (confirmed by reading the source, not assumed from
    // getVideoFingerprint's shape), and is exactly the kind of divergence the
    // sub-plan calls out as needing independent confirmation.
    it('does NOT produce a yt_ prefix for a youtube:-scheme URL (no YouTube branch for audio)', () => {
        const fp = getAudioFingerprint(null, 'youtube:dQw4w9WgXcQ');
        expect(fp).not.toMatch(/^yt_/);
        expect(fp).toMatch(/^url_/);
    });
});
