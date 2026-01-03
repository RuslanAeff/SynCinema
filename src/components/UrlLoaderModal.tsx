/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - URL Loader Modal Component
 *  @author Ruslan Aliyev
 *  Load video and audio from URLs (direct links & Google Drive)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from 'react';
import { X, Link, Film, Music, AlertCircle, CheckCircle, Loader2, ExternalLink } from 'lucide-react';
import { useI18n } from '../context/I18nContext';

interface UrlLoaderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onVideoUrlLoad: (url: string, filename: string) => void;
    onAudioUrlLoad: (url: string, filename: string) => void;
}

interface UrlValidation {
    isValid: boolean;
    message: string;
    convertedUrl?: string;
}

// Convert Google Drive share link to streamable URL
// Google Drive has several methods - we try the most reliable ones
const convertGoogleDriveUrl = (url: string): UrlValidation => {
    try {
        // Pattern 1: https://drive.google.com/file/d/FILE_ID/view
        const pattern1 = /drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/;
        // Pattern 2: https://drive.google.com/open?id=FILE_ID
        const pattern2 = /drive\.google\.com\/open\?id=([a-zA-Z0-9_-]+)/;
        // Pattern 3: https://drive.google.com/uc?id=FILE_ID
        const pattern3 = /drive\.google\.com\/uc\?.*id=([a-zA-Z0-9_-]+)/;

        let fileId: string | null = null;

        const match1 = url.match(pattern1);
        const match2 = url.match(pattern2);
        const match3 = url.match(pattern3);

        if (match1) fileId = match1[1];
        else if (match2) fileId = match2[1];
        else if (match3) fileId = match3[1];

        if (fileId) {
            // Use Vercel serverless function to proxy Google Drive requests
            // This bypasses CORS and handles redirects server-side
            const directUrl = `/api/proxy?id=${fileId}`;
            return {
                isValid: true,
                message: 'Google Drive link detected ✓ (via server proxy)',
                convertedUrl: directUrl
            };
        }

        return {
            isValid: false,
            message: 'Invalid Google Drive link format'
        };
    } catch {
        return {
            isValid: false,
            message: 'Error parsing Google Drive URL'
        };
    }
};

// Validate and convert URL
const validateUrl = (url: string, type: 'video' | 'audio'): UrlValidation => {
    if (!url.trim()) {
        return { isValid: false, message: '' };
    }

    try {
        const urlObj = new URL(url);

        // Check if it's a Google Drive link
        if (urlObj.hostname.includes('drive.google.com')) {
            return convertGoogleDriveUrl(url);
        }

        // Check if it's a Dropbox link
        if (urlObj.hostname.includes('dropbox.com')) {
            // Convert Dropbox share link to direct download
            // Change ?dl=0 to ?dl=1 for direct download
            let directUrl = url.replace('?dl=0', '?dl=1');
            if (!directUrl.includes('?dl=1') && !directUrl.includes('&dl=1')) {
                directUrl += (directUrl.includes('?') ? '&' : '?') + 'dl=1';
            }
            return {
                isValid: true,
                message: 'Dropbox link detected ✓',
                convertedUrl: directUrl
            };
        }

        // Check if it's a YouTube link
        if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
            // Extract video ID from various YouTube URL formats
            let videoId: string | null = null;

            // Standard youtube.com/watch?v=VIDEO_ID (with optional extra params like &t=, &list=, etc.)
            const watchMatch = url.match(/youtube\.com\/watch\?.*v=([a-zA-Z0-9_-]{11})/);
            if (watchMatch) videoId = watchMatch[1];

            // youtu.be/VIDEO_ID (short URL)
            if (!videoId) {
                const shortMatch = url.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
                if (shortMatch) videoId = shortMatch[1];
            }

            // youtube.com/embed/VIDEO_ID
            if (!videoId) {
                const embedMatch = url.match(/youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/);
                if (embedMatch) videoId = embedMatch[1];
            }

            // youtube.com/v/VIDEO_ID
            if (!videoId) {
                const vMatch = url.match(/youtube\.com\/v\/([a-zA-Z0-9_-]{11})/);
                if (vMatch) videoId = vMatch[1];
            }

            // youtube.com/shorts/VIDEO_ID
            if (!videoId) {
                const shortsMatch = url.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
                if (shortsMatch) videoId = shortsMatch[1];
            }

            // youtube.com/live/VIDEO_ID
            if (!videoId) {
                const liveMatch = url.match(/youtube\.com\/live\/([a-zA-Z0-9_-]{11})/);
                if (liveMatch) videoId = liveMatch[1];
            }

            if (videoId) {
                return {
                    isValid: true,
                    message: 'YouTube link detected ✓ (limited features)',
                    convertedUrl: `youtube:${videoId}` // Special prefix for YouTube
                };
            }

            return {
                isValid: false,
                message: 'Invalid YouTube URL format'
            };
        }

        // Check if it's a direct media file
        const videoExtensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.m4v'];
        const audioExtensions = ['.mp3', '.wav', '.aac', '.ogg', '.flac', '.m4a'];
        const extensions = type === 'video' ? videoExtensions : audioExtensions;

        const pathname = urlObj.pathname.toLowerCase();
        const hasValidExtension = extensions.some(ext => pathname.endsWith(ext));

        if (hasValidExtension) {
            return {
                isValid: true,
                message: `Direct ${type} file detected ✓`,
                convertedUrl: url
            };
        }

        // Allow any HTTPS URL (might be a CDN or streaming server)
        if (urlObj.protocol === 'https:' || urlObj.protocol === 'http:') {
            return {
                isValid: true,
                message: 'URL format valid (will attempt to load)',
                convertedUrl: url
            };
        }

        return {
            isValid: false,
            message: 'Invalid URL format'
        };
    } catch {
        return {
            isValid: false,
            message: 'Please enter a valid URL'
        };
    }
};

// Extract filename from URL
const extractFilename = (url: string, defaultName: string): string => {
    try {
        const urlObj = new URL(url);
        const pathname = urlObj.pathname;
        const segments = pathname.split('/');
        const lastSegment = segments[segments.length - 1];

        if (lastSegment && lastSegment.includes('.')) {
            return decodeURIComponent(lastSegment);
        }

        // For Google Drive, use a generic name
        if (url.includes('drive.google.com')) {
            return defaultName + '_from_drive';
        }

        return defaultName;
    } catch {
        return defaultName;
    }
};

export const UrlLoaderModal: React.FC<UrlLoaderModalProps> = ({
    isOpen,
    onClose,
    onVideoUrlLoad,
    onAudioUrlLoad
}) => {
    const { t } = useI18n();
    const [videoUrl, setVideoUrl] = useState('');
    const [audioUrl, setAudioUrl] = useState('');
    const [videoValidation, setVideoValidation] = useState<UrlValidation>({ isValid: false, message: '' });
    const [audioValidation, setAudioValidation] = useState<UrlValidation>({ isValid: false, message: '' });
    const [isLoading, setIsLoading] = useState(false);
    const [activeTab, setActiveTab] = useState<'video' | 'audio'>('video');

    const handleVideoUrlChange = useCallback((value: string) => {
        setVideoUrl(value);
        setVideoValidation(validateUrl(value, 'video'));
    }, []);

    const handleAudioUrlChange = useCallback((value: string) => {
        setAudioUrl(value);
        setAudioValidation(validateUrl(value, 'audio'));
    }, []);

    const handleLoadVideo = useCallback(async () => {
        if (!videoValidation.isValid || !videoValidation.convertedUrl) return;

        setIsLoading(true);
        try {
            const filename = extractFilename(videoUrl, 'video');
            onVideoUrlLoad(videoValidation.convertedUrl, filename);
            setVideoUrl('');
            setVideoValidation({ isValid: false, message: '' });
            onClose();
        } catch (error) {
            console.error('Error loading video URL:', error);
        } finally {
            setIsLoading(false);
        }
    }, [videoUrl, videoValidation, onVideoUrlLoad, onClose]);

    const handleLoadAudio = useCallback(async () => {
        if (!audioValidation.isValid || !audioValidation.convertedUrl) return;

        setIsLoading(true);
        try {
            const filename = extractFilename(audioUrl, 'audio');
            onAudioUrlLoad(audioValidation.convertedUrl, filename);
            setAudioUrl('');
            setAudioValidation({ isValid: false, message: '' });
            // Don't close modal after audio - user might want to add more
        } catch (error) {
            console.error('Error loading audio URL:', error);
        } finally {
            setIsLoading(false);
        }
    }, [audioUrl, audioValidation, onAudioUrlLoad]);

    const handleClose = useCallback(() => {
        setVideoUrl('');
        setAudioUrl('');
        setVideoValidation({ isValid: false, message: '' });
        setAudioValidation({ isValid: false, message: '' });
        onClose();
    }, [onClose]);

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-[90%] max-w-lg overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <Link size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t.urlLoader.title}</h2>
                                <p className="text-xs text-gray-500 dark:text-gray-500">{t.urlLoader.subtitle}</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                {t.urlLoader.label}
                            </label>
                            <input
                                type="url"
                                value={videoUrl}
                                onChange={(e) => handleVideoUrlChange(e.target.value)}
                                placeholder={t.urlLoader.placeholder}
                                className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            {videoValidation.message && (
                                <div className={`mt-2 flex items-center gap-2 text-sm ${videoValidation.isValid ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                                    }`}>
                                    {videoValidation.isValid ? (
                                        <CheckCircle size={14} />
                                    ) : (
                                        <AlertCircle size={14} />
                                    )}
                                    {videoValidation.message}
                                </div>
                            )}
                        </div>

                        <button
                            onClick={handleLoadVideo}
                            disabled={!videoValidation.isValid || isLoading}
                            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-gray-300 disabled:to-gray-300 dark:disabled:from-gray-700 dark:disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <Loader2 size={18} className="animate-spin" />
                                    Loading...
                                </>
                            ) : (
                                <>
                                    <Film size={18} />
                                    {t.urlLoader.loadBtn}
                                </>
                            )}
                        </button>
                    </div>

                    {/* Help Text */}
                    <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700/50">
                        <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center gap-2">
                            <ExternalLink size={14} />
                            {t.urlLoader.supportedSources.title}
                        </h4>
                        <ul className="text-xs text-gray-600 dark:text-gray-500 space-y-1">
                            <li>• {t.urlLoader.supportedSources.directLinks}</li>
                            <li>• {t.urlLoader.supportedSources.dropbox}</li>
                            <li>• {t.urlLoader.supportedSources.googleDrive}</li>
                            <li>• {t.urlLoader.supportedSources.youtube}</li>
                            <li>• {t.urlLoader.supportedSources.https}</li>
                        </ul>
                        <div className="mt-3 p-3 bg-amber-50 dark:bg-yellow-900/20 border border-amber-200 dark:border-yellow-700/30 rounded-lg">
                            <p className="text-xs text-amber-800 dark:text-yellow-300 font-medium">⚠️ {t.urlLoader.limitations.title}</p>
                            <ul className="text-xs text-amber-700 dark:text-yellow-200/70 mt-1 space-y-0.5">
                                <li>• {t.urlLoader.limitations.youtube}</li>
                                <li>• {t.urlLoader.limitations.googleDrive}</li>
                                <li>• {t.urlLoader.limitations.drm}</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
