/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Google Drive Proxy API (Enhanced)
 *  @author Ruslan Aliyev
 *  Serverless function to proxy Google Drive requests with virus scan bypass
 * ═══════════════════════════════════════════════════════════════════════════
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';

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

// Fetch with proper headers
async function fetchGoogleDrive(url: string): Promise<Response> {
    return fetch(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'identity', // Don't compress for streaming
            'Referer': 'https://drive.google.com/',
            'Connection': 'keep-alive',
        },
        redirect: 'follow'
    });
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
        res.setHeader('Access-Control-Max-Age', '86400');
        return res.status(200).end();
    }

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Length, Content-Range, Accept-Ranges');

    try {
        const { id } = req.query;

        if (!id || typeof id !== 'string') {
            return res.status(400).json({ error: 'Missing file ID' });
        }

        console.log(`[Proxy] Request for file: ${id}`);

        // First attempt: Try direct download with confirm=t
        let gdriveUrl = `https://drive.google.com/uc?export=download&confirm=t&id=${id}`;

        let response = await fetchGoogleDrive(gdriveUrl);
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
                response = await fetchGoogleDrive(gdriveUrl);
                contentType = response.headers.get('content-type') || '';

                // Still HTML? Try one more method
                if (contentType.includes('text/html')) {
                    console.log('[Proxy] Still HTML after confirm, trying alternative...');

                    // Try the direct download link format
                    gdriveUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download&confirm=${confirmToken}`;
                    response = await fetchGoogleDrive(gdriveUrl);
                    contentType = response.headers.get('content-type') || '';
                }
            } else {
                console.log('[Proxy] No confirm token found in HTML');

                // Try alternative URL format
                gdriveUrl = `https://drive.usercontent.google.com/download?id=${id}&export=download`;
                response = await fetchGoogleDrive(gdriveUrl);
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
