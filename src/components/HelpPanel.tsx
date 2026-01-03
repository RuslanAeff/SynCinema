/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Help Panel Component
 *  @author Ruslan Aliyev
 *  Comprehensive help documentation for all features
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState } from 'react';
import {
    X,
    Play,
    Pause,
    RotateCcw,
    Volume2,
    Maximize,
    Upload,
    Save,
    FolderOpen,
    MonitorSpeaker,
    Clock,
    Gauge,
    Sliders,
    Music,
    Film,
    Keyboard,
    Sun,
    Moon,
    ChevronRight,
    Info,
    Link,
    Youtube,
    AlertTriangle,
    Smartphone,
    Monitor
} from 'lucide-react';
import { Translations } from '../i18n';

interface HelpPanelProps {
    isOpen: boolean;
    onClose: () => void;
    t: Translations;
}

interface HelpSection {
    id: string;
    title: string;
    icon: React.ReactNode;
    items: {
        name: string;
        icon?: React.ReactNode;
        iconColor?: string; // Brand color for icon
        description: string;
        shortcut?: string;
    }[];
}

// Dynamic function to generate help sections based on current language
const getHelpSections = (t: Translations): HelpSection[] => [
    {
        id: 'video-controls',
        title: t.help.sections.videoControls,
        icon: <Film size={20} />,
        items: [
            {
                name: t.help.videoControls.playPause,
                icon: <Play size={16} />,
                iconColor: 'bg-green-500/20 text-green-500 dark:bg-green-500/20 dark:text-green-400',
                description: t.help.videoControls.playPauseDesc,
                shortcut: 'Space / K'
            },
            {
                name: t.help.videoControls.rewind,
                icon: <RotateCcw size={16} />,
                iconColor: 'bg-blue-500/20 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
                description: t.help.videoControls.rewindDesc,
                shortcut: 'J / ←'
            },
            {
                name: t.help.videoControls.forward,
                icon: <RotateCcw size={16} className="-scale-x-100" />,
                iconColor: 'bg-blue-500/20 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
                description: t.help.videoControls.forwardDesc,
                shortcut: 'L / →'
            },
            {
                name: t.help.videoControls.progressBar,
                description: t.help.videoControls.progressBarDesc,
            },
            {
                name: t.help.videoControls.volume,
                icon: <Volume2 size={16} />,
                iconColor: 'bg-purple-500/20 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
                description: t.help.videoControls.volumeDesc,
                shortcut: '↑ / ↓'
            },
            {
                name: t.help.videoControls.fullscreen,
                icon: <Maximize size={16} />,
                iconColor: 'bg-indigo-500/20 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
                description: t.help.videoControls.fullscreenDesc,
                shortcut: 'F'
            },
            {
                name: t.help.videoControls.detachPlayer,
                description: t.help.videoControls.detachPlayerDesc,
            }
        ]
    },
    {
        id: 'audio-tracks',
        title: t.help.sections.audioTracks,
        icon: <Music size={20} />,
        items: [
            {
                name: t.help.audioTracks.addAudio,
                icon: <Upload size={16} />,
                iconColor: 'bg-emerald-500/20 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
                description: t.help.audioTracks.addAudioDesc,
            },
            {
                name: t.help.audioTracks.outputDevice,
                icon: <MonitorSpeaker size={16} />,
                iconColor: 'bg-cyan-500/20 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400',
                description: t.help.audioTracks.outputDeviceDesc,
            },
            {
                name: t.help.audioTracks.startOffset,
                icon: <Clock size={16} />,
                iconColor: 'bg-amber-500/20 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
                description: t.help.audioTracks.startOffsetDesc,
            },
            {
                name: t.help.audioTracks.playbackSpeed,
                icon: <Gauge size={16} />,
                iconColor: 'bg-orange-500/20 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
                description: t.help.audioTracks.playbackSpeedDesc,
            },
            {
                name: t.help.audioTracks.volume,
                icon: <Volume2 size={16} />,
                iconColor: 'bg-purple-500/20 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
                description: t.help.audioTracks.volumeDesc,
            },
            {
                name: t.help.audioTracks.masterVolume,
                description: t.help.audioTracks.masterVolumeDesc,
            },
            {
                name: t.help.audioTracks.eq3Band,
                icon: <Sliders size={16} />,
                iconColor: 'bg-pink-500/20 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400',
                description: t.help.audioTracks.eq3BandDesc,
            },
            {
                name: t.help.audioTracks.limiter,
                description: t.help.audioTracks.limiterDesc,
            }
        ]
    },
    {
        id: 'project',
        title: t.help.sections.projectManagement,
        icon: <Save size={20} />,
        items: [
            {
                name: t.help.projectManagement.saveProject,
                icon: <Save size={16} />,
                iconColor: 'bg-blue-500/20 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
                description: t.help.projectManagement.saveProjectDesc,
            },
            {
                name: t.help.projectManagement.loadProject,
                icon: <FolderOpen size={16} />,
                iconColor: 'bg-yellow-500/20 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400',
                description: t.help.projectManagement.loadProjectDesc,
            },
            {
                name: t.help.projectManagement.subtitles,
                description: t.help.projectManagement.subtitlesDesc,
            },
            {
                name: t.help.projectManagement.markers,
                description: t.help.projectManagement.markersDesc,
            }
        ]
    },
    {
        id: 'keyboard',
        title: t.help.sections.keyboardShortcuts,
        icon: <Keyboard size={20} />,
        items: [
            { name: t.help.keyboardShortcuts.space, description: t.help.keyboardShortcuts.spaceDesc },
            { name: 'J', description: t.help.keyboardShortcuts.arrowsDesc },
            { name: t.help.keyboardShortcuts.arrows, description: t.help.keyboardShortcuts.arrowsDesc },
            { name: t.help.keyboardShortcuts.fKey, description: t.help.keyboardShortcuts.fKeyDesc },
            { name: t.help.keyboardShortcuts.mKey, description: t.help.keyboardShortcuts.mKeyDesc },
            { name: t.help.keyboardShortcuts.escKey, description: t.help.keyboardShortcuts.escKeyDesc }
        ]
    },
    {
        id: 'settings',
        title: t.help.sections.settings,
        icon: <Sun size={20} />,
        items: [
            {
                name: t.help.settingsSection.theme,
                icon: <Moon size={16} />,
                iconColor: 'bg-violet-500/20 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
                description: t.help.settingsSection.themeDesc,
            },
            {
                name: t.help.settingsSection.language,
                description: t.help.settingsSection.languageDesc,
            }
        ]
    },
    {
        id: 'url-sources',
        title: t.help.sections.urlSources,
        icon: <Link size={20} />,
        items: [
            {
                name: t.help.urlSources.directLinks,
                icon: <Link size={16} />,
                iconColor: 'bg-green-500/20 text-green-600 dark:bg-green-500/20 dark:text-green-400',
                description: t.help.urlSources.directLinksDesc,
            },
            {
                name: t.help.urlSources.dropbox,
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6.17L6 10l6 3.83L0 10 6 6.17l6 3.83zm0 0L18 10l-6-3.83L18 2.34l6 3.83-6 3.83-6-3.83zM6 2.34L0 6.17l6 3.83 6-3.83-6-3.83zm6 11.32l-6-3.83L0 13.66l6 3.83 6-3.83zm0 0l6-3.83 6 3.83-6 3.83-6-3.83z" /></svg>,
                iconColor: 'bg-blue-600/20 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
                description: t.help.urlSources.dropboxDesc,
            },
            {
                name: t.help.urlSources.googleDrive,
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7.71 3.5L1.15 15l3.43 6L11.14 9.5 7.71 3.5zm1.42 0l6.86 12h6.86l-3.43-6-6.86-12H9.13zM12 10.44L8.56 16.5h6.88L12 10.44zm-4.57 7.06L4 22.5h13.72l3.43-5H7.43z"></path></svg>,
                iconColor: 'bg-gradient-to-br from-yellow-400/20 via-green-500/20 to-blue-500/20 text-blue-600 dark:text-blue-400',
                description: t.help.urlSources.googleDriveDesc,
            },
            {
                name: t.help.urlSources.youtube,
                icon: <Youtube size={16} />,
                iconColor: 'bg-red-500/20 text-red-600 dark:bg-red-500/20 dark:text-red-500',
                description: t.help.urlSources.youtubeDesc,
            },
            {
                name: '⚠️ ' + t.help.urlSources.youtubeLimitations,
                description: t.help.urlSources.youtubeLimitationsDesc,
            },
            {
                name: '❌ ' + t.help.urlSources.notSupported,
                description: t.help.urlSources.notSupportedDesc,
            }
        ]
    },
    {
        id: 'platform',
        title: t.help.sections.platformRequirements,
        icon: <Monitor size={20} />,
        items: [
            {
                name: '✅ ' + t.help.platform.desktop,
                icon: <Monitor size={16} />,
                iconColor: 'bg-green-500/20 text-green-600 dark:bg-green-500/20 dark:text-green-400',
                description: t.help.platform.desktopDesc,
            },
            {
                name: '⚠️ ' + t.help.platform.mobile,
                icon: <Smartphone size={16} />,
                iconColor: 'bg-amber-500/20 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
                description: t.help.platform.mobileDesc,
            },
            {
                name: '📱 ' + t.help.platform.mobileWhy,
                description: t.help.platform.mobileWhyDesc,
            },
            {
                name: '💡 ' + t.help.platform.mobileWorks,
                description: t.help.platform.mobileWorksDesc,
            }
        ]
    }
];

export const HelpPanel: React.FC<HelpPanelProps> = ({ isOpen, onClose, t }) => {
    const [selectedSection, setSelectedSection] = useState<string>('video-controls');
    const [isVisible, setIsVisible] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 50);
        } else {
            setIsVisible(false);
        }
    }, [isOpen]);

    React.useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const helpSections = getHelpSections(t);
    const activeSection = helpSections.find(s => s.id === selectedSection) || helpSections[0];

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-2xl w-[90%] max-w-4xl h-[85vh] max-h-[700px] flex overflow-hidden transition-all duration-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                    }`}
            >
                {/* Sidebar Navigation */}
                <div className="w-64 bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <Info size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">{t.help.title}</h2>
                                <p className="text-xs text-gray-500">SynCinema</p>
                            </div>
                        </div>
                    </div>

                    {/* Navigation Items */}
                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {helpSections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setSelectedSection(section.id)}
                                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all ${selectedSection === section.id
                                    ? 'bg-indigo-100 dark:bg-indigo-600 text-indigo-700 dark:text-white border border-indigo-200 dark:border-transparent shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white border border-transparent'
                                    }`}
                            >
                                <span className={selectedSection === section.id ? 'text-indigo-600 dark:text-white' : ''}>{section.icon}</span>
                                <span className="text-sm font-medium">{section.title}</span>
                                {selectedSection === section.id && (
                                    <ChevronRight size={16} className="ml-auto" />
                                )}
                            </button>
                        ))}
                    </nav>

                    {/* Footer */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                        <p className="text-xs text-gray-500 dark:text-gray-600 text-center">
                            Press Esc to close
                        </p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Content Header */}
                    <div className="p-6 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                                {activeSection.icon}
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{activeSection.title}</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {/* Content Body */}
                    <div className="flex-1 overflow-y-auto p-6">
                        <div className="space-y-4">
                            {activeSection.items.map((item, index) => (
                                <div
                                    key={index}
                                    className="p-4 rounded-xl bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        {item.icon && (
                                            <div className={`p-2 rounded-lg flex-shrink-0 ${item.iconColor || 'bg-gray-200 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300'}`}>
                                                {item.icon}
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="font-semibold text-gray-900 dark:text-white">{item.name}</h4>
                                                {item.shortcut && (
                                                    <span className="px-2 py-0.5 text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded">
                                                        {item.shortcut}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Info Button Component for triggering the help panel
export const InfoButton: React.FC<{ onClick: () => void }> = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="relative group p-2 rounded-xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 hover:border-indigo-400 text-indigo-400 hover:text-indigo-300 transition-all hover:scale-105"
            title="Help & Documentation"
        >
            {/* Stylized "i" icon */}
            <div className="w-5 h-5 flex items-center justify-center">
                <span className="text-lg font-serif font-bold italic">i</span>
            </div>

            {/* Glow effect on hover */}
            <div className="absolute inset-0 rounded-xl bg-indigo-500/20 opacity-0 group-hover:opacity-100 blur-sm transition-opacity" />
        </button>
    );
};
