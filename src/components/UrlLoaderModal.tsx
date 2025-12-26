/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - URL Loader Modal Component
 *  @author Ruslan Aliyev
 *  Load video and audio from URLs (direct links & Google Drive)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useCallback } from 'react';
import { X, Link, Film, Music, AlertCircle, CheckCircle, Loader2, ExternalLink } from 'lucide-react';

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
                className="absolute inset-0 bg-black/70 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-[90%] max-w-lg overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-gray-800">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <Link size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Load from URL</h2>
                                <p className="text-xs text-gray-500">Direct links or Google Drive</p>
                            </div>
                        </div>
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Tab Selector */}
                <div className="flex border-b border-gray-800">
                    <button
                        onClick={() => setActiveTab('video')}
                        className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${activeTab === 'video'
                            ? 'text-indigo-400 border-b-2 border-indigo-400 bg-indigo-500/10'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <Film size={16} />
                        Video URL
                    </button>
                    <button
                        onClick={() => setActiveTab('audio')}
                        className={`flex-1 py-3 px-4 flex items-center justify-center gap-2 text-sm font-medium transition-colors ${activeTab === 'audio'
                            ? 'text-purple-400 border-b-2 border-purple-400 bg-purple-500/10'
                            : 'text-gray-500 hover:text-gray-300'
                            }`}
                    >
                        <Music size={16} />
                        Audio URL
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {activeTab === 'video' ? (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Video URL
                                </label>
                                <input
                                    type="url"
                                    value={videoUrl}
                                    onChange={(e) => handleVideoUrlChange(e.target.value)}
                                    placeholder="https://example.com/video.mp4 or Google Drive link"
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                />
                                {videoValidation.message && (
                                    <div className={`mt-2 flex items-center gap-2 text-sm ${videoValidation.isValid ? 'text-green-400' : 'text-red-400'
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
                                className="w-full py-3 px-4 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <Film size={18} />
                                        Load Video
                                    </>
                                )}
                            </button>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-300 mb-2">
                                    Audio URL
                                </label>
                                <input
                                    type="url"
                                    value={audioUrl}
                                    onChange={(e) => handleAudioUrlChange(e.target.value)}
                                    placeholder="https://example.com/audio.mp3 or Google Drive link"
                                    className="w-full px-4 py-3 bg-gray-800 border border-gray-700 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                                />
                                {audioValidation.message && (
                                    <div className={`mt-2 flex items-center gap-2 text-sm ${audioValidation.isValid ? 'text-green-400' : 'text-red-400'
                                        }`}>
                                        {audioValidation.isValid ? (
                                            <CheckCircle size={14} />
                                        ) : (
                                            <AlertCircle size={14} />
                                        )}
                                        {audioValidation.message}
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={handleLoadAudio}
                                disabled={!audioValidation.isValid || isLoading}
                                className="w-full py-3 px-4 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 disabled:from-gray-700 disabled:to-gray-700 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <Loader2 size={18} className="animate-spin" />
                                        Loading...
                                    </>
                                ) : (
                                    <>
                                        <Music size={18} />
                                        Add Audio Track
                                    </>
                                )}
                            </button>
                        </div>
                    )}

                    {/* Help Text */}
                    <div className="mt-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700/50">
                        <h4 className="text-sm font-medium text-gray-300 mb-2 flex items-center gap-2">
                            <ExternalLink size={14} />
                            Supported Sources
                        </h4>
                        <ul className="text-xs text-gray-500 space-y-1">
                            <li>• <span className="text-green-400">Direct links</span> to MP4, WebM, MP3, WAV files</li>
                            <li>• <span className="text-purple-400">Dropbox</span> share links (recommended for large files)</li>
                            <li>• <span className="text-blue-400">Google Drive</span> public links <span className="text-yellow-500">(max ~50MB)</span></li>
                            <li>• Any <span className="text-yellow-400">HTTPS URL</span> that serves media files</li>
                        </ul>
                        <div className="mt-3 p-2 bg-yellow-900/20 border border-yellow-700/30 rounded-lg">
                            <p className="text-xs text-yellow-300 font-medium">⚠️ Limitations:</p>
                            <ul className="text-xs text-yellow-200/70 mt-1 space-y-0.5">
                                <li>• YouTube, Netflix, Vimeo are <span className="text-red-400">not supported</span> (DRM & legal)</li>
                                <li>• Google Drive files &gt;50MB may not load (use Dropbox instead)</li>
                            </ul>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
