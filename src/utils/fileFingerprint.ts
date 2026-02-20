/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - File Fingerprinting
 *  @author Ruslan Aliyev
 *  Generates unique IDs for media to match community sync presets
 * ═══════════════════════════════════════════════════════════════════════════
 */

/**
 * Simple hash function to create a compact fingerprint from a string.
 * Uses DJB2 algorithm - fast and produces good distribution.
 */
const simpleHash = (str: string): string => {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
};

/**
 * Creates a unique fingerprint for a local file using name, size, and modification time.
 */
const getLocalFileFingerprint = (file: File): string => {
    const raw = `${file.name}_${file.size}_${file.lastModified}`;
    return `local_${file.size}_${simpleHash(raw)}`;
};

/**
 * Extracts a unique ID for a video source.
 * - Local files: "local_<size>_<hash>"
 * - YouTube: "yt_<videoId>"
 * - Google Drive: "gdrive_<fileId>"
 * - Other URLs: "url_<hash_or_clean_url>"
 */
export const getVideoFingerprint = (file: File | null, objectUrl: string | null): string | null => {
    if (file) {
        return getLocalFileFingerprint(file);
    }

    if (objectUrl) {
        // Handle YouTube URLs (our URL loader prefixes them with 'youtube:')
        if (objectUrl.startsWith('youtube:')) {
            const videoId = objectUrl.split(':')[1];
            return `yt_${videoId}`;
        }

        // Handle Google Drive proxy URLs
        if (objectUrl.includes('/api/proxy?id=')) {
            try {
                const url = new URL(objectUrl, window.location.origin);
                const id = url.searchParams.get('id');
                if (id) return `gdrive_${id}`;
            } catch {
                // Ignore parse errors
            }
        }

        // Handle direct URLs (remove query params to be safe, unless it's youtube/gdrive)
        try {
            const url = new URL(objectUrl);
            const safeStr = `${url.hostname}${url.pathname}`.substring(0, 200);
            // encodeURIComponent prevents btoa crashes with non-Latin1 chars
            return `url_${btoa(encodeURIComponent(safeStr)).replace(/=/g, '').substring(0, 250)}`;
        } catch {
            const safeObjUrl = String(objectUrl).substring(0, 200);
            return `url_${btoa(encodeURIComponent(safeObjUrl)).replace(/=/g, '').substring(0, 250)}`;
        }
    }

    return null;
};

/**
 * Extracts a unique ID for an audio source.
 * Usually just the exact byte size of the local file.
 */
export const getAudioFingerprint = (file: File | null, url: string | null): string | null => {
    if (file) {
        return getLocalFileFingerprint(file);
    }

    if (url) {
        // Handle Google Drive proxy URLs
        if (url.includes('/api/proxy?id=')) {
            try {
                const urlObj = new URL(url, window.location.origin);
                const id = urlObj.searchParams.get('id');
                if (id) return `gdrive_${id}`;
            } catch {
                // Ignore parse errors
            }
        }

        try {
            const urlObj = new URL(url);
            const safeStr = `${urlObj.hostname}${urlObj.pathname}`.substring(0, 200);
            return `url_${btoa(encodeURIComponent(safeStr)).replace(/=/g, '').substring(0, 250)}`;
        } catch {
            const safeUrl = String(url).substring(0, 200);
            return `url_${btoa(encodeURIComponent(safeUrl)).replace(/=/g, '').substring(0, 250)}`;
        }
    }

    return null;
};
