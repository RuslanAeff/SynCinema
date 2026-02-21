import React, { useState } from 'react';
import { Upload, Link, ChevronDown } from 'lucide-react';
import { AudioTrack, AudioDevice } from '../../types';
import { useI18n } from '../../context/I18nContext';
import { AudioTrackRow } from '../AudioTrackRow';

interface AudioSectionProps {
    audioTracks: AudioTrack[];
    audioDevices: AudioDevice[];
    videoCurrentTime: number;
    isVideoPlaying: boolean;
    masterVolume: number;
    onTrackUpdate: (id: string, updates: Partial<AudioTrack>) => void;
    onTrackDelete: (id: string) => void;
    onAudioUrlLoad: (url: string, filename: string) => void;
    audioInputRef: React.RefObject<HTMLInputElement | null>;
    handleAudioChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onTrackEvent?: (event: string) => void;
    onShareSync?: (trackId: string, offset: number) => void;
    children?: React.ReactNode; // For inserting MasterVolume inside
}

export const AudioSection: React.FC<AudioSectionProps> = ({
    audioTracks,
    audioDevices,
    videoCurrentTime,
    isVideoPlaying,
    masterVolume,
    onTrackUpdate,
    onTrackDelete,
    onAudioUrlLoad,
    audioInputRef,
    handleAudioChange,
    onTrackEvent,
    onShareSync,
    children,
}) => {
    const { t } = useI18n();
    const [isAudioTracksCollapsed, setIsAudioTracksCollapsed] = useState(false);
    const [showAudioUrlInput, setShowAudioUrlInput] = useState(false);
    const [audioUrlInput, setAudioUrlInput] = useState('');

    return (
        <div data-tour="audio-tracks" className="rounded-xl border border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/20 overflow-hidden">
            {/* Collapsible Header */}
            <button
                onClick={() => setIsAudioTracksCollapsed(!isAudioTracksCollapsed)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition-colors border-b border-gray-300 dark:border-gray-800"
            >
                <h2 className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider flex items-center gap-2">
                    🎵 {t.sidebar.audioTracks}
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-500">({audioTracks.length})</span>
                </h2>
                <div className="flex items-center gap-1.5">
                    <span
                        onClick={(e) => { e.stopPropagation(); audioInputRef.current?.click(); }}
                        className="text-xs bg-primary-500 hover:bg-primary-600 dark:bg-primary-600 dark:hover:bg-primary-700 text-white px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer border border-primary-600 dark:border-transparent"
                        title={t.sidebar.addFromFile}
                    >
                        <Upload size={12} />
                    </span>
                    <span
                        onClick={(e) => { e.stopPropagation(); setShowAudioUrlInput(!showAudioUrlInput); setIsAudioTracksCollapsed(false); }}
                        className="text-xs bg-secondary-500 hover:bg-secondary-600 dark:bg-secondary-600 dark:hover:bg-secondary-700 text-white px-2.5 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm cursor-pointer border border-secondary-600 dark:border-transparent"
                        title={t.sidebar.addFromUrl}
                    >
                        <Link size={12} />
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
                {/* Audio URL Input */}
                {showAudioUrlInput && (
                    <div className="p-3 m-3 rounded-lg bg-gray-100 dark:bg-gray-800/80 border border-gray-200 dark:border-primary-500/30 shadow-inner dark:shadow-none">
                        <div className="flex flex-col gap-2">
                            <label className="text-xs font-semibold text-primary-700 dark:text-primary-400 uppercase tracking-wider flex items-center gap-1">
                                <Link size={12} /> {t.sidebar.audioUrlLabel}
                            </label>
                            <input
                                type="url"
                                value={audioUrlInput}
                                onChange={(e) => setAudioUrlInput(e.target.value)}
                                placeholder={t.sidebar.audioUrlPlaceholder}
                                className="w-full px-3 py-2 bg-white dark:bg-gray-900/50 border border-gray-300 dark:border-gray-600 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                            />
                            <div className="flex gap-2">
                                <button
                                    onClick={() => {
                                        if (audioUrlInput.trim()) {
                                            const urlParts = audioUrlInput.split('/');
                                            const filename = urlParts[urlParts.length - 1]?.split('?')[0] || 'audio_track.mp3';
                                            onAudioUrlLoad(audioUrlInput, filename);
                                            setAudioUrlInput('');
                                            setShowAudioUrlInput(false);
                                        }
                                    }}
                                    disabled={!audioUrlInput.trim()}
                                    className="flex-1 py-2 px-3 bg-primary-600 hover:bg-primary-500 disabled:bg-gray-300 dark:disabled:bg-gray-800 disabled:text-gray-500 disabled:cursor-not-allowed text-white text-xs font-medium rounded-lg transition-colors"
                                >
                                    {t.sidebar.addAudioTrackBtn}
                                </button>
                                <button
                                    onClick={() => { setShowAudioUrlInput(false); setAudioUrlInput(''); }}
                                    className="px-3 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-xs rounded-lg transition-colors"
                                >
                                    {t.sidebar.cancelBtn}
                                </button>
                            </div>
                            <p className="text-[10px] text-gray-500 dark:text-gray-400">
                                {t.sidebar.audioSupports}
                            </p>
                        </div>
                    </div>
                )}

                {/* Master Volume is injected as children here */}
                {children}

                <div className="space-y-4 px-3 pb-4">
                    {audioTracks.length === 0 ? (
                        <div className="text-center py-6 text-gray-600"><p>{t.sidebar.noAudioTracks}</p></div>
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
                                onTrackEvent={onTrackEvent}
                                onShareSync={onShareSync}
                            />
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};
