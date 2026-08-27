/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Sidebar Component
 *  @author Ruslan Aliyev
 *  Control panel for audio tracks, project management, and settings
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useRef, useCallback } from 'react';
import { SidebarHeader } from './sidebar/SidebarHeader';
import { VideoSettings } from './sidebar/VideoSettings';
import { SubtitleSettings } from './sidebar/SubtitleSettings';
import { MarkerSection } from './sidebar/MarkerSection';
import { AudioSection } from './sidebar/AudioSection';
import { MasterVolume } from './sidebar/MasterVolume';
import { LanguageSelector } from './LanguageSelector';
import { AudioTrack, AudioDevice, SubtitleStyle } from '../types';
import { useI18n } from '../context/I18nContext';

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
    subtitleStyle: SubtitleStyle;
    onSubtitleStyleChange: (style: SubtitleStyle) => void;
    hasSubtitles: boolean;
    masterVolume: number;
    onMasterVolumeChange: (volume: number) => void;
    theme: 'dark' | 'light';
    accentTheme: 'green' | 'purple';
    onThemeToggle: () => void;
    onAccentThemeToggle: () => void;
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
    onAudioUrlLoad: (url: string, filename: string) => void;
    onStatisticsOpen: () => void;
    /** Opens the Subtitle Studio from the subtitle section. */
    onSubtitleStudioOpen?: () => void;
    onTrackEvent?: (event: string) => void;
    onShareSync?: (trackId: string, offset: number) => void;
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
    subtitleStyle,
    onSubtitleStyleChange,
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
    onHelpOpen,
    onUrlLoaderOpen,
    onAudioUrlLoad,
    onStatisticsOpen,
    onSubtitleStudioOpen,
    onTrackEvent,
    onShareSync,
}) => {
    const { t } = useI18n();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const audioInputRef = useRef<HTMLInputElement>(null);
    const projectInputRef = useRef<HTMLInputElement>(null);
    const subtitleInputRef = useRef<HTMLInputElement>(null);
    const videoDeviceDropdownRef = useRef<HTMLDivElement>(null);

    // Kept referentially stable so the memoized sections below actually skip
    // re-rendering on playback ticks.
    const handleVideoChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onVideoUpload(file);
    }, [onVideoUpload]);

    const handleAudioChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        onAudioUpload(e.target.files);
        if (audioInputRef.current) audioInputRef.current.value = '';
    }, [onAudioUpload]);

    const handleSubtitleLoad = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onSubtitleUpload(file);
        if (subtitleInputRef.current) subtitleInputRef.current.value = '';
    }, [onSubtitleUpload]);

    return (
        <div data-tour="sidebar" className="w-full lg:w-[450px] flex-shrink-0 bg-gray-50 dark:bg-gray-900 lg:border-r border-t lg:border-t-0 border-gray-200 dark:border-gray-800 flex flex-col h-auto lg:h-full z-10 shadow-2xl transition-colors duration-300">
            <SidebarHeader
                theme={theme}
                onThemeToggle={onThemeToggle}
                onHelpOpen={onHelpOpen}
                onStatisticsOpen={onStatisticsOpen}
                onSaveProject={onSaveProject}
                onLoadProject={onLoadProject}
                permissionsGranted={permissionsGranted}
                onRefreshDevices={onRefreshDevices}
                projectInputRef={projectInputRef}
            />

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {/* Composite block for Video Settings + Subtitles */}
                <div className="space-y-3 p-4 rounded-xl border border-dashed border-gray-700 bg-gray-800/30">
                    <VideoSettings
                        videoFile={videoFile}
                        audioDevices={audioDevices}
                        videoVolume={videoVolume}
                        videoMuted={videoMuted}
                        onVideoVolumeChange={onVideoVolumeChange}
                        onVideoMutedChange={onVideoMutedChange}
                        videoDeviceId={videoDeviceId}
                        onVideoDeviceChange={onVideoDeviceChange}
                        onUrlLoaderOpen={onUrlLoaderOpen}
                        fileInputRef={fileInputRef}
                        videoDeviceDropdownRef={videoDeviceDropdownRef}
                        handleVideoChange={handleVideoChange}
                    />
                    <SubtitleSettings
                        hasSubtitles={hasSubtitles}
                        subtitleOffset={subtitleOffset}
                        onSubtitleOffsetChange={onSubtitleOffsetChange}
                        subtitleStyle={subtitleStyle}
                        onSubtitleStyleChange={onSubtitleStyleChange}
                        subtitleInputRef={subtitleInputRef}
                        handleSubtitleLoad={handleSubtitleLoad}
                        onGenerateSubtitles={onSubtitleStudioOpen}
                    />
                </div>

                <MarkerSection
                    videoFile={videoFile}
                    markers={markers}
                    onAddMarker={onAddMarker}
                    onDeleteMarker={onDeleteMarker}
                    onSeekToMarker={onSeekToMarker}
                />

                <AudioSection
                    audioTracks={audioTracks}
                    audioDevices={audioDevices}
                    videoCurrentTime={videoCurrentTime}
                    isVideoPlaying={isVideoPlaying}
                    masterVolume={masterVolume}
                    onTrackUpdate={onTrackUpdate}
                    onTrackDelete={onTrackDelete}
                    onAudioUrlLoad={onAudioUrlLoad}
                    audioInputRef={audioInputRef}
                    handleAudioChange={handleAudioChange}
                    onTrackEvent={onTrackEvent}
                    onShareSync={onShareSync}
                >
                    <MasterVolume
                        masterVolume={masterVolume}
                        onMasterVolumeChange={onMasterVolumeChange}
                    />
                </AudioSection>
            </div>

            {/* Language Selector */}
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-800/50">
                <LanguageSelector compact />
            </div>

            {/* Designer Signature Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-800/50 bg-gradient-to-r from-gray-100 dark:from-gray-900 to-gray-100/80 dark:to-gray-900/80">
                <div className="flex items-center justify-center gap-2 opacity-70 hover:opacity-100 transition-opacity">
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary-500/30 to-transparent"></div>
                    <div className="flex items-center gap-2 px-3">
                        <span className="text-[10px] uppercase tracking-[0.2em] text-gray-500">{t.app.createdBy}</span>
                        <span className="text-xs font-semibold bg-gradient-to-r from-primary-400 via-secondary-400 to-tertiary-400 bg-clip-text text-transparent">
                            Ruslan Aliyev
                        </span>
                    </div>
                    <div className="h-px flex-1 bg-gradient-to-r from-transparent via-primary-500/30 to-transparent"></div>
                </div>
                <div className="text-center mt-1">
                    <span className="text-[9px] text-gray-600">© 2025-2026 • SynCinema v2.0.1</span>
                </div>
            </div>
        </div>
    );
};
