/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Sidebar Component
 *  @author Ruslan Aliyev
 *  Control panel for audio tracks, project management, and settings
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useRef, useState } from 'react';
import { RotateCcw, AlertCircle, Film, Upload, Sun, Moon, Volume2, VolumeX, ChevronDown, Link } from 'lucide-react';
import { Button } from './Button';
import { AudioTrackRow } from './AudioTrackRow';
import { Logo } from './Logo';
import { InfoButton } from './HelpPanel';
import { AudioTrack, AudioDevice } from '../types';

interface SidebarProps {
    videoFile: File | null;
    audioTracks: AudioTrack[];
    audioDevices: AudioDevice[];
    permissionsGranted: boolean;
    videoCurrentTime: number;
    isVideoPlaying: boolean;
    onRefreshDevices: () => Promise<void>;
    onVideoUpload: (file: File) => void;
    onAudioUpload: (files: FileList | null) => void;
    onTrackUpdate: (id: string, updates: Partial<AudioTrack>) => void;
    onTrackDelete: (id: string) => void;
    onSaveProject: () => void;
    onLoadProject: (file: File) => void;
    onSubtitleUpload: (file: File) => void;
    subtitleOffset: number;
    onSubtitleOffsetChange: (offset: number) => void;
    hasSubtitles: boolean;
    masterVolume: number;
    onMasterVolumeChange: (volume: number) => void;
    theme: 'dark' | 'light';
    onThemeToggle: () => void;
    videoVolume: number;
    videoMuted: boolean;
    onVideoVolumeChange: (volume: number) => void;
    onVideoMutedChange: (muted: boolean) => void;
    markers: { id: string; time: number; label: string }[];
    onAddMarker: () => void;
    onDeleteMarker: (id: string) => void;
    onSeekToMarker: (time: number) => void;
    videoDeviceId: string;
    onVideoDeviceChange: (deviceId: string) => void;
    isHelpOpen: boolean;
    onHelpOpen: () => void;
    onHelpClose: () => void;
    onUrlLoaderOpen: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
    videoFile,
    audioTracks,
    audioDevices,
    permissionsGranted,
    videoCurrentTime,
    isVideoPlaying,
    onRefreshDevices,
    onVideoUpload,
    onAudioUpload,
    onTrackUpdate,
    onTrackDelete,
    onSaveProject,
    onLoadProject,
    onSubtitleUpload,
    subtitleOffset,
    onSubtitleOffsetChange,
    hasSubtitles,
    masterVolume,
    onMasterVolumeChange,
    theme,
    onThemeToggle,
    videoVolume,
    videoMuted,
    onVideoVolumeChange,
    onVideoMutedChange,
    markers,
    onAddMarker,
    onDeleteMarker,
    onSeekToMarker,
    videoDeviceId,
    onVideoDeviceChange,
    isHelpOpen,
    onHelpOpen,
    onHelpClose,
    onUrlLoaderOpen
}) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const projectInputRef = useRef<HTMLInputElement>(null);
    const subtitleInputRef = useRef<HTMLInputElement>(null);

    // Collapsible sections state
    const [isMarkersCollapsed, setIsMarkersCollapsed] = useState(false);
    const [isAudioTracksCollapsed, setIsAudioTracksCollapsed] = useState(false);
    const [isMasterVolumeCollapsed, setIsMasterVolumeCollapsed] = useState(false);

    const handleSubtitleLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onSubtitleUpload(file);
        if (subtitleInputRef.current) subtitleInputRef.current.value = '';
    };

    const handleProjectLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onLoadProject(file);
        if (projectInputRef.current) projectInputRef.current.value = '';
    };

    const handleVideoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onVideoUpload(file);
    };

    const handleAudioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onAudioUpload(e.target.files);
        if (audioInputRef.current) audioInputRef.current.value = '';
    };

    return (
        <div data-tour="sidebar" className="w-full md:w-[450px] flex-shrink-0 bg-gray-50 dark:bg-gray-900 border-r border-gray-200 dark:border-gray-800 flex flex-col h-full z-10 shadow-2xl transition-colors duration-300">
            <div className="p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors duration-300">
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                        <Logo size={48} className="drop-shadow-[0_0_15px_rgba(99,102,241,0.6)]" />
                        <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">SynCinema</h1>
                    </div>
                    <div className="flex items-center gap-2">
                        <InfoButton onClick={onHelpOpen} />
                        <button
                            onClick={onThemeToggle}
                            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                            title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
                        >
                            {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-indigo-600" />}
                        </button>
                    </div>
                </div>
                <p className="text-xs font-bold tracking-wide text-gray-800 dark:text-gray-400 uppercase opacity-100">Multi-output synchronized player</p>
                <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="secondary" onClick={onSaveProject}>Save Project</Button>
                    <Button size="sm" variant="secondary" onClick={() => projectInputRef.current?.click()}>Load Project</Button>
                    <input type="file" accept=".sync,.json" className="hidden" ref={projectInputRef} onChange={handleProjectLoad} />
                </div>
                {!permissionsGranted && (
                    <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg flex items-start gap-3">
                        <AlertCircle className="text-yellow-500 shrink-0 mt-0.5" size={16} />
                        <div>
                            <p className="text-xs text-yellow-200 mb-2">Microphone permission is required to list audio device names.</p>
                            <Button size="sm" variant="secondary" onClick={onRefreshDevices}>Grant Permission</Button>
                        </div>
                    </div>
                )}
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <div className="p-4 rounded-xl border border-dashed border-gray-700 bg-gray-800/30">
                    <h2 className="text-sm font-semibold text-gray-400 mb-3 flex items-center gap-2"><Film size={16} /> Main Video Source</h2>
                    {videoFile ? (
                        <div className="flex items-center justify-between bg-gray-800 p-3 rounded-lg">
                            <span className="text-sm truncate max-w-[200px]">{videoFile.name}</span>
                            <div className="flex items-center gap-2">
                                <button onClick={onUrlLoaderOpen} className="text-xs text-purple-400 hover:text-purple-300">URL</button>
                                <button onClick={() => fileInputRef.current?.click()} className="text-xs text-indigo-400 hover:text-indigo-300">Change</button>
                            </div>
                        </div>
                    ) : (
                        <div className="flex gap-2">
                            <button onClick={() => fileInputRef.current?.click()} className="flex-1 py-6 flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors rounded-lg border-2 border-transparent hover:border-indigo-500/30">
                                <Upload size={20} className="mb-1" />
                                <span className="text-xs">Select File</span>
                            </button>
                            <button onClick={onUrlLoaderOpen} className="flex-1 py-6 flex flex-col items-center justify-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors rounded-lg border-2 border-transparent hover:border-purple-500/30">
                                <Link size={20} className="mb-1" />
                                <span className="text-xs">Load URL</span>
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
                                    Video Audio
                                </span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-indigo-400">{Math.round(videoVolume * 100)}%</span>
                                    <button
                                        onClick={() => onVideoMutedChange(!videoMuted)}
                                        className={`text-[10px] px-2 py-0.5 rounded ${videoMuted ? 'bg-red-500/20 text-red-400' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                                    >
                                        {videoMuted ? 'Muted' : 'Mute'}
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
                                className={`w-full h-1.5 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500 ${videoMuted ? 'opacity-50' : ''}`}
                            />
                        </div>
                    )}

                    {/* Video Output Device */}
                    {videoFile && (
                        <div className="mt-3 pt-3 border-t border-gray-700/50">
                            <label className="text-xs font-medium text-gray-500 flex items-center gap-1 mb-2">
                                🔊 Video Audio Output
                            </label>
                            <select
                                value={videoDeviceId}
                                onChange={(e) => onVideoDeviceChange(e.target.value)}
                                className="w-full bg-gray-900 border border-gray-700 text-gray-300 text-sm rounded-lg focus:ring-indigo-500 focus:border-indigo-500 block p-2"
                            >
                                <option value="">Default System Output</option>
                                {audioDevices.map(device => (
                                    <option key={device.deviceId} value={device.deviceId}>
                                        {device.label || `Unknown Device (${device.deviceId.slice(0, 5)}...)`}
                                    </option>
                                ))}
                            </select>
                        </div>
                    )}

                    {/* Subtitles */}
                    <div className="mt-3 pt-3 border-t border-gray-700/50">
                        <div className="flex items-center justify-between">
                            <span className="text-xs font-medium text-gray-500">Subtitles (.srt)</span>
                            {!hasSubtitles ? (
                                <button onClick={() => subtitleInputRef.current?.click()} className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                                    <Upload size={12} /> Load
                                </button>
                            ) : (
                                <div className="flex items-center gap-3">
                                    <span className="text-xs text-green-500">Active</span>
                                    <div className="flex items-center gap-1">
                                        <span className="text-[10px] text-gray-500">Offset</span>
                                        <input
                                            type="number"
                                            step="0.1"
                                            value={subtitleOffset}
                                            onChange={(e) => onSubtitleOffsetChange(parseFloat(e.target.value) || 0)}
                                            className="w-14 bg-gray-900 border border-gray-700 rounded text-xs p-0.5 text-center focus:ring-1 focus:ring-indigo-500"
                                        />
                                    </div>
                                    <button onClick={() => subtitleInputRef.current?.click()} className="text-[10px] text-gray-400 hover:text-white">Replace</button>
                                </div>
                            )}
                        </div>
                        <input type="file" accept=".srt" className="hidden" ref={subtitleInputRef} onChange={handleSubtitleLoad} />
                    </div>
                </div>

                {/* Markers - Collapsible */}
                {videoFile && (
                    <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/30 overflow-hidden">
                        {/* Collapsible Header */}
                        <button
                            onClick={() => setIsMarkersCollapsed(!isMarkersCollapsed)}
                            className="w-full p-4 flex items-center justify-between hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition-colors"
                        >
                            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                🔖 Markers
                                <span className="text-xs font-normal text-gray-500 dark:text-gray-500">({markers.length})</span>
                            </h2>
                            <div className="flex items-center gap-2">
                                <span
                                    onClick={(e) => { e.stopPropagation(); onAddMarker(); }}
                                    className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded transition-colors"
                                >
                                    + Add
                                </span>
                                <ChevronDown
                                    size={16}
                                    className={`text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isMarkersCollapsed ? '-rotate-90' : 'rotate-0'}`}
                                />
                            </div>
                        </button>

                        {/* Collapsible Content */}
                        <div
                            className={`transition-all duration-300 ease-in-out overflow-hidden ${isMarkersCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'}`}
                        >
                            <div className="px-4 pb-4">
                                {markers.length === 0 ? (
                                    <p className="text-xs text-gray-500 dark:text-gray-500 text-center py-2">No markers added yet.</p>
                                ) : (
                                    <div className="space-y-1 max-h-32 overflow-y-auto">
                                        {markers.map((marker) => {
                                            const time = marker.time || 0;
                                            const minutes = Math.floor(time / 60);
                                            const seconds = Math.floor(time % 60);
                                            const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                                            return (
                                                <div key={marker.id} className="flex items-center justify-between bg-gray-900/50 rounded p-2 group">
                                                    <button
                                                        onClick={() => onSeekToMarker(marker.time)}
                                                        className="flex items-center gap-2 text-left hover:text-indigo-400 transition-colors flex-1"
                                                    >
                                                        <span className="text-xs font-mono text-indigo-400">{timeStr}</span>
                                                        <span className="text-xs text-gray-300 truncate">{marker.label}</span>
                                                    </button>
                                                    <button
                                                        onClick={() => onDeleteMarker(marker.id)}
                                                        className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* Audio Tracks - Collapsible */}
                <div data-tour="audio-tracks" className="rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/20 overflow-hidden">
                    {/* Collapsible Header */}
                    <button
                        onClick={() => setIsAudioTracksCollapsed(!isAudioTracksCollapsed)}
                        className="w-full p-4 flex items-center justify-between hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-300 dark:border-gray-800"
                    >
                        <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                            🎵 Audio Tracks
                            <span className="text-xs font-normal text-gray-500 dark:text-gray-500">({audioTracks.length})</span>
                        </h2>
                        <div className="flex items-center gap-2">
                            <span
                                onClick={(e) => { e.stopPropagation(); audioInputRef.current?.click(); }}
                                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2 py-1 rounded transition-colors flex items-center gap-1 shadow-sm"
                            >
                                <Upload size={12} /> Add
                            </span>
                            <ChevronDown
                                size={16}
                                className={`text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isAudioTracksCollapsed ? '-rotate-90' : 'rotate-0'}`}
                            />
                        </div>
                    </button>
                    <input type="file" accept="audio/*" multiple className="hidden" ref={audioInputRef} onChange={handleAudioChange} />

                    {/* Collapsible Content */}
                    <div
                        className={`transition-all duration-300 ease-in-out overflow-hidden ${isAudioTracksCollapsed ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`}
                    >
                        {/* Master Volume - Collapsible */}
                        <div className="p-3 m-3 rounded-lg bg-gradient-to-r from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 overflow-hidden">
                            <button
                                onClick={() => setIsMasterVolumeCollapsed(!isMasterVolumeCollapsed)}
                                className="w-full flex items-center justify-between"
                            >
                                <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">🎚️ Master Volume</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-mono text-indigo-400">{Math.round(masterVolume * 100)}%</span>
                                    <ChevronDown
                                        size={14}
                                        className={`text-indigo-400 transition-transform duration-300 ${isMasterVolumeCollapsed ? '-rotate-90' : 'rotate-0'}`}
                                    />
                                </div>
                            </button>
                            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isMasterVolumeCollapsed ? 'max-h-0 opacity-0 mt-0' : 'max-h-20 opacity-100 mt-2'}`}>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.01"
                                    value={masterVolume}
                                    onChange={(e) => onMasterVolumeChange(parseFloat(e.target.value))}
                                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                />
                            </div>
                        </div>

                        <div className="space-y-4 px-3 pb-4">
                            {audioTracks.length === 0 ? (
                                <div className="text-center py-6 text-gray-600"><p>No external audio tracks added.</p></div>
                            ) : (
                                audioTracks.map(track => (
                                    <AudioTrackRow
                                        key={track.id}
                                        track={track}
                                        availableDevices={audioDevices}
                                        videoCurrentTime={videoCurrentTime}
                                        isVideoPlaying={isVideoPlaying}
                                        onUpdate={onTrackUpdate}
                                        onDelete={onTrackDelete}
                                        syncThreshold={0.2}
                                        masterVolume={masterVolume}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Designer Signature Footer */}
            <div className="p-4 border-t border-gray-800/50 bg-gradient-to-r from-gray-900 to-gray-900/80">
                <div className="flex items-center justify-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
                    <div className="flex items-center gap-2 px-3">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500">Designed by</span>
                        <span className="text-xs font-semibold bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
                            Ruslan Aliyev
                        </span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent"></div>
                </div>
                <div className="text-center mt-1">
                    <span className="text-[9px] text-gray-600">© 2025 • SynCinema v1.0</span>
                </div>
            </div>
        </div>
    );
};
