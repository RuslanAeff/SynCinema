/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Google Drive Proxy API (Enhanced)
 *  @author Ruslan Aliyev
 *  Serverless function to proxy Google Drive requests with virus scan bypass
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

// ═══════════════════════════════════════════════════════════════════════════
//  Security: Allowed origins for CORS & Referer checks
// ═══════════════════════════════════════════════════════════════════════════
const ALLOWED_ORIGINS = [
    'https://syncinema.vercel.app',
    'https://www.syncinema.vercel.app',
    'http://localhost:5173',    // Vite dev server
    'http://localhost:4173',    // Vite preview
    'http://localhost:3000',
];

// ═══════════════════════════════════════════════════════════════════════════
//  Security: Rate limiting (in-memory, per serverless instance)
// ═══════════════════════════════════════════════════════════════════════════
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 10;     // max 10 requests per IP per minute

const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

function isRateLimited(ip: string): boolean {
    const now = Date.now();
    const entry = rateLimitMap.get(ip);

    if (!entry || now > entry.resetTime) {
        rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }

    entry.count++;
    if (entry.count > RATE_LIMIT_MAX_REQUESTS) {
        return true;
    }

    return false;
}

// Cleanup stale entries periodically (prevent memory leak)
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of rateLimitMap.entries()) {
        if (now > entry.resetTime) {
            rateLimitMap.delete(ip);
        }
    }
}, 5 * 60 * 1000); // Clean every 5 minutes

// ═══════════════════════════════════════════════════════════════════════════
//  Security: Google Drive file ID validation
//  Valid IDs: 28-44 characters, alphanumeric + hyphens + underscores
// ═══════════════════════════════════════════════════════════════════════════
const GDRIVE_ID_REGEX = /^[a-zA-Z0-9_-]{28,44}$/;

function isValidGDriveId(id: string): boolean {
    return GDRIVE_ID_REGEX.test(id);
}

// ═══════════════════════════════════════════════════════════════════════════
//  Security: Origin / Referer validation
// ═══════════════════════════════════════════════════════════════════════════
function isAllowedOrigin(req: VercelRequest): boolean {
    const origin = req.headers.origin;
    const referer = req.headers.referer;

    // Check Origin header first
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        return true;
    }

    // Fallback to Referer header
    if (referer) {
        return ALLOWED_ORIGINS.some(allowed => referer.startsWith(allowed));
    }

    // No origin/referer = likely direct browser navigation or curl
    // Deny by default for security
    return false;
}

function getAllowedOriginForResponse(req: VercelRequest): string {
    const origin = req.headers.origin;
    if (origin && ALLOWED_ORIGINS.includes(origin)) {
        return origin;
    }
    return ALLOWED_ORIGINS[0]; // Default to production domain
}

// Extract confirmation token from Google's virus scan page
function extractConfirmToken(html: string): string | null {
    // Look for the confirmation link in the HTML
    // Pattern: /uc?export=download&amp;confirm=XXXXX&amp;id=
    const patterns = [
        /confirm=([a-zA-Z0-9_-]+)&/,
        /confirm=([a-zA-Z0-9_-]+)"/,
        /download_warning[^"]*confirm=([^&"]+)/,
        /id="download-form"[^>]*action="[^"]*confirm=([^&"]+)/
    ];

    for (const pattern of patterns) {
        const match = html.match(pattern);
        if (match && match[1]) {
            return match[1];
        }
    }

    // Also try to find the uuid token
    const uuidMatch = html.match(/name="uuid" value="([^"]+)"/);
    if (uuidMatch) {
        return uuidMatch[1];
    }

    return null;
}

// Fetch with proper headers.
// `range` is forwarded verbatim when present: a <video> element seeks by asking for
// byte ranges, so dropping the header forces every scrub to re-download from zero.
async function fetchGoogleDrive(url: string, range?: string): Promise<Response> {
    const headers: Record<string, string> = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Accept-Encoding': 'identity', // Don't compress for streaming
        'Referer': 'https://drive.google.com/',
        'Connection': 'keep-alive',
    };

    if (range) headers['Range'] = range;

    return fetch(url, { headers, redirect: 'follow' });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    const corsOrigin = getAllowedOriginForResponse(req);

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', corsOrigin);
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
        res.setHeader('Access-Control-Max-Age', '86400');
        return res.status(200).end();
    }

    // Set CORS headers (specific origin, not wildcard)
    res.setHeader('Access-Control-Allow-Origin', corsOrigin);
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

    // ── Security Layer 1: Origin/Referer Check ──
    if (!isAllowedOrigin(req)) {
        console.warn(`[Proxy] Blocked request from unauthorized origin: ${req.headers.origin || req.headers.referer || 'none'}`);
        return res.status(403).json({ error: 'Forbidden: unauthorized origin' });
    }

    // ── Security Layer 2: Rate Limiting ──
    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim()
        || req.socket?.remoteAddress
        || 'unknown';

    if (isRateLimited(clientIp)) {
        console.warn(`[Proxy] Rate limited IP: ${clientIp}`);
        res.setHeader('Retry-After', '60');
        return res.status(429).json({ error: 'Too many requests. Please try again later.' });
    }

    try {
        const { id } = req.query;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Missing file ID' });
        }

        // ── Security Layer 3: File ID Validation ──
        if (!isValidGDriveId(id)) {
            console.warn(`[Proxy] Invalid file ID format: ${id}`);
            return res.status(400).json({ error: 'Invalid file ID format' });
        }

        console.log(`[Proxy] Request for file: ${id}`);

        // Forwarded to Google on every attempt so seeking works on large files
        const rangeHeader = typeof req.headers.range === 'string' ? req.headers.range : undefined;

        // First attempt: Try direct download with confirm=t
        let gdriveUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${id}`;

        let response = await fetchGoogleDrive(gdriveUrl, rangeHeader);
        let contentType = response.headers.get('content-type') || '';

        // Check if we got HTML (virus scan page)
        if (contentType.includes('text/html')) {
            console.log('[Proxy] Got HTML, checking for virus scan page...');

            const html = await response.text();

            // Try to extract confirmation token
            const confirmToken = extractConfirmToken(html);

            if (confirmToken) {
                console.log(`[Proxy] Found confirm token: ${confirmToken}`);

                // Retry with the confirmation token
                gdriveUrl = `https://drive.google.com/uc?export=download&confirm=${confirmToken}&id=${id}`;
                response = await fetchGoogleDrive(gdriveUrl, rangeHeader);
                contentType = response.headers.get('content-type') || '';

                // Still HTML? Try one more method
                if (contentType.includes('text/html')) {
                    console.log('[Proxy] Still HTML after confirm, trying alternative...');

                    // Try the direct download link format
                    gdriveUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=${confirmToken}`;
                    response = await fetchGoogleDrive(gdriveUrl, rangeHeader);
                    contentType = response.headers.get('content-type') || '';
                }
            } else {
                console.log('[Proxy] No confirm token found in HTML');

                // Try alternative URL format
                gdriveUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download`;
                response = await fetchGoogleDrive(gdriveUrl, rangeHeader);
                contentType = response.headers.get('content-type') || '';
            }
        }

        // Final check - if still HTML, we failed
        if (contentType.includes('text/html')) {
            console.error('[Proxy] Failed - still receiving HTML');
            return res.status(403).json({
                error: 'Could not access file',
                hint: 'The file may require authentication, be too large, or not be shared publicly'
            });
        }

        if (!response.ok) {
            console.error(`[Proxy] Google Drive returned ${response.status}`);
            return res.status(response.status).json({
                error: 'Failed to fetch from Google Drive',
                status: response.status
            });
        }

        console.log(`[Proxy] Success! Content-Type: ${contentType}`);

        // Set response headers
        res.setHeader('Content-Type', contentType);
        res.setHeader('Accept-Ranges', 'bytes');
        res.setHeader('Cache-Control', 'public, max-age=3600');

        const contentLength = response.headers.get('content-length');
        if (contentLength) {
            res.setHeader('Content-Length', contentLength);
        }

        // Mirror a partial response back to the player. Answering a Range request with
        // a bare 200 makes the browser treat the stream as non-seekable, so this is
        // what actually enables scrubbing on large files.
        const contentRange = response.headers.get('content-range');
        if (response.status === 206 && contentRange) {
            res.setHeader('Content-Range', contentRange);
            res.status(206);
        }

        // Stream the response
        if (response.body) {
            const reader = response.body.getReader();

            try {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    res.write(Buffer.from(value));
                }
            } catch (streamError) {
                console.error('[Proxy] Stream error:', streamError);
            }

            res.end();
        } else {
            // Fallback for environments without streaming
            const buffer = await response.arrayBuffer();
            res.send(Buffer.from(buffer));
        }

    } catch (error) {
        console.error('[Proxy] Error:', error);
        res.status(500).json({
            error: 'Proxy error',
            message: error instanceof Error ? error.message : 'Unknown error'
        });
    }
}
