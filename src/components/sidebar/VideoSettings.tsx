import React, { useState, useEffect } from 'react';
import { Film, Upload, Link, Volume2, VolumeX, ChevronDown, Check } from 'lucide-react';
import { AudioDevice } from '../../types';
import { getDeviceIcon } from '../../utils/getDeviceIcon';
import { useI18n } from '../../context/I18nContext';

interface VideoSettingsProps {
    videoFile: File | null;
    audioDevices: AudioDevice[];
    videoVolume: number;
    videoMuted: boolean;
    onVideoVolumeChange: (volume: number) => void;
    onVideoMutedChange: (muted: boolean) => void;
    videoDeviceId: string;
    onVideoDeviceChange: (deviceId: string) => void;
    onUrlLoaderOpen: () => void;
    fileInputRef: React.RefObject<HTMLInputElement | null>;
    videoDeviceDropdownRef: React.RefObject<HTMLDivElement | null>;
    handleVideoChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

const VideoSettingsComponent: React.FC<VideoSettingsProps> = ({
    videoFile,
    audioDevices,
    videoVolume,
    videoMuted,
    onVideoVolumeChange,
    onVideoMutedChange,
    videoDeviceId,
    onVideoDeviceChange,
    onUrlLoaderOpen,
    fileInputRef,
    videoDeviceDropdownRef,
    handleVideoChange,
}) => {
    const { t } = useI18n();
    const [isVideoDeviceDropdownOpen, setIsVideoDeviceDropdownOpen] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (videoDeviceDropdownRef.current && !videoDeviceDropdownRef.current.contains(event.target as Node)) {
                setIsVideoDeviceDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [videoDeviceDropdownRef]);

    return (
        <div className="p-4 rounded-xl border border-dashed border-gray-700 bg-gray-800/30">
            <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><Film size={16} /> {t.sidebar.mainVideoSource}</h2>
            {videoFile ? (
                <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                    <span className="text-sm truncate max-w-[200px]">{videoFile.name}</span>
                    <div className="flex items-center gap-2">
                        <button onClick={onUrlLoaderOpen} className="text-xs text-primary-400 hover:text-primary-300">URL</button>
                        <button onClick={() => fileInputRef.current?.click()} className="text-xs text-primary-400 hover:text-primary-300">{t.sidebar.change}</button>
                    </div>
                </div>
            ) : (
                <div className="flex gap-2">
                    <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-6 flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors rounded-lg border-2 border-transparent hover:border-primary-500/30">
                        <Upload size={20} className="mb-1" />
                        <span className="text-xs">{t.sidebar.selectFile}</span>
                    </button>
                    <button onClick={onUrlLoaderOpen} className="flex-1 py-6 flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors rounded-lg border-2 border-transparent hover:border-secondary-500/30">
                        <Link size={20} className="mb-1" />
                        <span className="text-xs">{t.sidebar.loadUrl}</span>
                    </button>
                </div>
            )}
            <input type="file" accept="video/*, .mkv" className="hidden" ref={fileInputRef} onChange={handleVideoChange} />

            {/* Video Audio Control */}
            {videoFile && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-gray-500 flex items-center gap-1">
                            {videoMuted ? <VolumeX size={12} /> : <Volume2 size={12} />}
                            {t.sidebar.videoVolume}
                        </span>
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-mono text-primary-400">{Math.round(videoVolume * 100)}%</span>
                            <button
                                onClick={() => onVideoMutedChange(!videoMuted)}
                                className={`text-[10px] px-2 py-0.5 rounded ${videoMuted ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                            >
                                {videoMuted ? t.sidebar.muted : t.sidebar.mute}
                            </button>
                        </div>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={videoVolume}
                        onChange={(e) => onVideoVolumeChange(parseFloat(e.target.value))}
                        className={`w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500 ${videoMuted ? 'opacity-50' : ''}`}
                    />
                </div>
            )}

            {/* Video Output Device */}
            {videoFile && (
                <div className="mt-3 pt-3 border-t border-gray-700/50">
                    <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-2">
                        🔊 {t.sidebar.videoAudioOutput || 'Video Audio Output'}
                    </label>
                    <div className="relative" ref={videoDeviceDropdownRef}>
                        <button
                            onClick={() => setIsVideoDeviceDropdownOpen(!isVideoDeviceDropdownOpen)}
                            className={`w-full flex items-center gap-3 px-3 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 rounded-xl transition-all text-left ${isVideoDeviceDropdownOpen ? 'border-primary-500/50 ring-1 ring-primary-500/20' : ''}`}
                        >
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center bg-white dark:bg-gray-700 border border-gray-200 dark:border-transparent text-gray-500 dark:text-gray-300 shadow-sm dark:shadow-none">
                                {videoDeviceId ? getDeviceIcon(audioDevices.find(d => d.deviceId === videoDeviceId)?.label || '') : <Volume2 size={14} />}
                            </div>
                            <span className="flex-1 text-sm text-gray-700 dark:text-gray-200 truncate font-medium">
                                {videoDeviceId
                                    ? (audioDevices.find(d => d.deviceId === videoDeviceId)?.label || t.sidebar.unknownDevice).slice(0, 30)
                                    : t.sidebar.defaultOutput}
                            </span>
                            <ChevronDown size={14} className={`text-gray-400 transition-transform ${isVideoDeviceDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {/* Dropdown Menu - iOS Liquid Design */}
                        {isVideoDeviceDropdownOpen && (
                            <div className="absolute top-full left-0 right-0 mt-2 py-2 bg-white/80 dark:bg-gray-800/90 backdrop-blur-2xl border border-white/20 dark:border-gray-600/50 rounded-2xl shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.4)] z-[9999] max-h-56 overflow-y-auto">
                                {/* Default Option */}
                                <button
                                    onClick={() => {
                                        onVideoDeviceChange('');
                                        setIsVideoDeviceDropdownOpen(false);
                                    }}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 ${!videoDeviceId
                                        ? 'bg-primary-500/20 dark:bg-primary-500/30'
                                        : 'hover:bg-gray-100/80 dark:hover:bg-gray-700/50'
                                        }`}
                                >
                                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${!videoDeviceId
                                        ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                                        : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300'
                                        }`}>
                                        <Volume2 size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className={`text-sm font-semibold ${!videoDeviceId ? 'text-primary-600 dark:text-primary-300' : 'text-gray-700 dark:text-gray-200'}`}>
                                            {t.sidebar.defaultOutput}
                                        </div>
                                    </div>
                                    {!videoDeviceId && (
                                        <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center">
                                            <Check size={12} className="text-white" />
                                        </div>
                                    )}
                                </button>

                                {/* Divider */}
                                {audioDevices.length > 0 && (
                                    <div className="border-t border-gray-200/50 dark:border-gray-600/50 my-1 mx-3" />
                                )}

                                {/* Device Options */}
                                {audioDevices.map(device => (
                                    <button
                                        key={device.deviceId}
                                        onClick={() => {
                                            onVideoDeviceChange(device.deviceId);
                                            setIsVideoDeviceDropdownOpen(false);
                                        }}
                                        className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all duration-200 ${videoDeviceId === device.deviceId
                                            ? 'bg-primary-500/20 dark:bg-primary-500/30'
                                            : 'hover:bg-gray-100/80 dark:hover:bg-gray-700/50'
                                            }`}
                                    >
                                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all ${videoDeviceId === device.deviceId
                                            ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                                            : 'bg-gray-200 dark:bg-gray-600 text-gray-500 dark:text-gray-300'
                                            }`}>
                                            {getDeviceIcon(device.label || '')}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className={`text-sm font-medium truncate ${videoDeviceId === device.deviceId ? 'text-primary-600 dark:text-primary-300' : 'text-gray-700 dark:text-gray-200'}`}>
                                                {device.label || t.sidebar.unknownDevice}
                                            </div>
                                        </div>
                                        {videoDeviceId === device.deviceId && (
                                            <div className="w-5 h-5 rounded-full bg-primary-500 flex items-center justify-center flex-shrink-0">
                                                <Check size={12} className="text-white" />
                                            </div>
                                        )}
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Memoized: all props from Sidebar are referentially stable, so this section
// skips re-rendering on playback ticks that only move `currentTime`.
export const VideoSettings = React.memo(VideoSettingsComponent);
