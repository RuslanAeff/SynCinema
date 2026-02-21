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
    Monitor,
    Cloud,
    ShieldCheck,
    Palette,
    Bookmark
} from 'lucide-react';
import { Translations } from '../i18n';
import { useI18n } from '../context/I18nContext';

interface HelpPanelProps {
    isOpen: boolean;
    onClose: () => void;
    accentTheme: 'green' | 'purple';
    onAccentThemeToggle: () => void;
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
                iconColor: 'bg-secondary-500/20 text-secondary-500 dark:bg-secondary-500/20 dark:text-secondary-400',
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
                iconColor: 'bg-secondary-500/20 text-secondary-600 dark:bg-secondary-500/20 dark:text-secondary-400',
                description: t.help.videoControls.volumeDesc,
                shortcut: '↑ / ↓'
            },
            {
                name: t.help.videoControls.fullscreen,
                icon: <Maximize size={16} />,
                iconColor: 'bg-primary-500/20 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400',
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
                iconColor: 'bg-primary-500/20 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400',
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
                iconColor: 'bg-secondary-500/20 text-secondary-600 dark:bg-secondary-500/20 dark:text-secondary-400',
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
                iconColor: 'bg-tertiary-500/20 text-tertiary-600 dark:bg-tertiary-500/20 dark:text-tertiary-400',
                description: t.help.settingsSection.themeDesc,
            },
            {
                name: t.help.settingsSection.language,
                description: t.help.settingsSection.languageDesc,
            }
        ]
    },
    {
        id: 'cloud-sync',
        title: t.help.sections.cloudSync,
        icon: <Cloud size={20} />,
        items: [
            {
                name: t.help.cloudSync.whatIsIt,
                icon: <Cloud size={16} />,
                iconColor: 'bg-primary-500/20 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400',
                description: t.help.cloudSync.whatIsItDesc,
            },
            {
                name: t.help.cloudSync.autoApply,
                icon: <RotateCcw size={16} className="rotate-180" />,
                iconColor: 'bg-secondary-500/20 text-secondary-600 dark:bg-secondary-500/20 dark:text-secondary-400',
                description: t.help.cloudSync.autoApplyDesc,
            },
            {
                name: t.help.cloudSync.share,
                icon: <Upload size={16} />,
                iconColor: 'bg-blue-500/20 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
                description: t.help.cloudSync.shareDesc,
            },
            {
                name: t.help.cloudSync.trust,
                icon: <ShieldCheck size={16} />,
                iconColor: 'bg-yellow-500/20 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400',
                description: t.help.cloudSync.trustDesc,
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
                iconColor: 'bg-secondary-500/20 text-secondary-600 dark:bg-secondary-500/20 dark:text-secondary-400',
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
                iconColor: 'bg-secondary-500/20 text-secondary-600 dark:bg-secondary-500/20 dark:text-secondary-400',
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
    },
    {
        id: 'bookmarklet',
        title: t.help.sections.bookmarklet || 'Bookmarklet',
        icon: <Bookmark size={20} />,
        items: [
            {
                name: t.help.bookmarklet?.whatIsIt || 'What is a Bookmarklet?',
                icon: <Bookmark size={16} />,
                iconColor: 'bg-amber-500/20 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
                description: t.help.bookmarklet?.whatIsItDesc || 'A bookmarklet is a small button that lives in your browser\'s bookmarks bar. Click it on any page with a video, and it instantly opens that video in SynCinema — no extension needed!',
            },
            {
                name: t.help.bookmarklet?.howToInstall || 'How to Install',
                icon: <Upload size={16} />,
                iconColor: 'bg-primary-500/20 text-primary-600 dark:bg-primary-500/20 dark:text-primary-400',
                description: t.help.bookmarklet?.howToInstallDesc || 'Drag the button below to your browser\'s bookmarks bar. That\'s it! One-time setup, no permissions required.',
            },
            {
                name: t.help.bookmarklet?.howToUse || 'How to Use',
                icon: <Film size={16} />,
                iconColor: 'bg-secondary-500/20 text-secondary-600 dark:bg-secondary-500/20 dark:text-secondary-400',
                description: t.help.bookmarklet?.howToUseDesc || 'Navigate to any page with a video. Click the "Open in SynCinema" bookmark. The video will automatically open in SynCinema with all features ready.',
            }
        ]
    }
];

export const HelpPanel: React.FC<HelpPanelProps> = ({ isOpen, onClose, accentTheme, onAccentThemeToggle }) => {
    const { t } = useI18n();
    const [selectedSection, setSelectedSection] = useState<string>('video-controls');
    const [isVisible, setIsVisible] = useState(false);
    const [showMobileMenu, setShowMobileMenu] = useState(false);

    React.useEffect(() => {
        if (isOpen) {
            setTimeout(() => setIsVisible(true), 50);
        } else {
            setIsVisible(false);
            setShowMobileMenu(false);
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
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-2 sm:p-4">
            {/* Backdrop */}
            <div
                className={`absolute inset-0 bg-black/50 dark:bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Modal - Responsive sizing */}
            <div
                className={`relative bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl sm:rounded-2xl shadow-2xl 
                    w-full sm:w-[95%] md:w-[90%] max-w-4xl 
                    h-[90vh] sm:h-[85vh] max-h-[700px] 
                    flex flex-col lg:flex-row overflow-hidden transition-all duration-300 
                    ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
            >
                {/* Mobile Header with Dropdown Menu */}
                <div className="lg:hidden flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
                    <button
                        onClick={() => setShowMobileMenu(!showMobileMenu)}
                        className="flex items-center gap-3 flex-1"
                    >
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center flex-shrink-0">
                            <Info size={20} className="text-white" />
                        </div>
                        <div className="text-left flex-1">
                            <h2 className="text-base font-bold text-gray-900 dark:text-white">{t.help.title}</h2>
                            <p className="text-xs text-primary-600 dark:text-primary-400 flex items-center gap-1">
                                {activeSection.icon}
                                <span>{activeSection.title}</span>
                                <ChevronRight size={14} className={`transition-transform ${showMobileMenu ? 'rotate-90' : ''}`} />
                            </p>
                        </div>
                    </button>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-800 text-gray-500 dark:text-gray-400"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Mobile Dropdown Menu */}
                {showMobileMenu && (
                    <div className="lg:hidden absolute top-[72px] left-0 right-0 z-50 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 shadow-lg max-h-[50vh] overflow-y-auto">
                        {helpSections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => {
                                    setSelectedSection(section.id);
                                    setShowMobileMenu(false);
                                }}
                                className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-all border-b border-gray-100 dark:border-gray-800 last:border-b-0 ${selectedSection === section.id
                                    ? 'bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                            >
                                <span className={selectedSection === section.id ? 'text-primary-600 dark:text-primary-400' : ''}>{section.icon}</span>
                                <span className="text-sm font-medium">{section.title}</span>
                                {selectedSection === section.id && (
                                    <ChevronRight size={16} className="ml-auto text-primary-500" />
                                )}
                            </button>
                        ))}
                    </div>
                )}

                {/* Desktop Sidebar Navigation - Hidden on mobile */}
                <div className="hidden lg:flex w-64 bg-gray-50 dark:bg-gray-950 border-r border-gray-200 dark:border-gray-800 flex-col flex-shrink-0">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center">
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
                                    ? 'bg-primary-100 dark:bg-primary-600 text-primary-700 dark:text-white border border-primary-200 dark:border-transparent shadow-sm'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white border border-transparent'
                                    }`}
                            >
                                <span className={selectedSection === section.id ? 'text-primary-600 dark:text-white' : ''}>{section.icon}</span>
                                <span className="text-sm font-medium">{section.title}</span>
                                {selectedSection === section.id && (
                                    <ChevronRight size={16} className="ml-auto" />
                                )}
                            </button>
                        ))}
                    </nav>

                    {/* Footer with Theme Toggle */}
                    <div className="p-4 border-t border-gray-200 dark:border-gray-800 flex flex-col gap-3">
                        <button
                            onClick={onAccentThemeToggle}
                            className="w-full p-2.5 rounded-xl bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-800 transition-colors flex items-center justify-between group"
                            title="Toggle Accent Theme"
                        >
                            <div className="flex items-center gap-3">
                                <div className={`p-1.5 rounded-lg transition-colors ${accentTheme === 'green' ? 'bg-primary-100 dark:bg-primary-900/40 text-primary-600 dark:text-primary-400' : 'bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400'}`}>
                                    <Palette size={16} />
                                </div>
                                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</span>
                            </div>
                            <span className="text-xs font-semibold px-2 py-1 rounded bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 shadow-sm border border-gray-200 dark:border-gray-700 group-hover:border-primary-500/30 transition-colors">
                                {accentTheme === 'green' ? 'Green' : 'Purple'}
                            </span>
                        </button>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden min-w-0">
                    {/* Content Header - Hidden on mobile (integrated in mobile header) */}
                    <div className="hidden lg:flex p-6 border-b border-gray-200 dark:border-gray-800 items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary-500/20 text-primary-600 dark:text-primary-400">
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
                    <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                        <div className="space-y-3 sm:space-y-4">
                            {activeSection.items.map((item, index) => (
                                <div
                                    key={index}
                                    className="p-3 sm:p-4 rounded-xl bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50 hover:border-gray-300 dark:hover:border-gray-600 transition-colors"
                                >
                                    <div className="flex items-start gap-3 sm:gap-4">
                                        {item.icon && (
                                            <div className={`p-1.5 sm:p-2 rounded-lg flex-shrink-0 ${item.iconColor || 'bg-gray-200 dark:bg-gray-700/50 text-gray-600 dark:text-gray-300'}`}>
                                                {item.icon}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-1">
                                                <h4 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base">{item.name}</h4>
                                                {item.shortcut && (
                                                    <span className="px-2 py-0.5 text-xs font-mono bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded whitespace-nowrap">
                                                        {item.shortcut}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                                {item.description}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Bookmarklet Drag Button - Only shown when bookmarklet section is active */}
                        {activeSection.id === 'bookmarklet' && (() => {
                            const bookmarkletCode = `javascript:void(function(){var h=window.location.href;var isYT=h.indexOf('youtube.com')!==-1||h.indexOf('youtu.be')!==-1;if(isYT){window.open('${window.location.origin}?video='+encodeURIComponent(h),'_blank');return}var v=document.querySelector('video');var u=v?(v.currentSrc||v.src):'';if(u&&u.indexOf('blob:')===0)u=h;if(!u)u=h;window.open('${window.location.origin}?video='+encodeURIComponent(u),'_blank')})()`;
                            return (
                                <div className="mt-6 p-5 rounded-xl bg-gradient-to-br from-primary-500/10 via-secondary-500/10 to-amber-500/10 border border-primary-500/30 backdrop-blur-sm">
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 text-center">
                                        {t.help.bookmarklet?.dragInstruction || '👇 Drag this button to your bookmarks bar'}
                                    </p>
                                    <div className="flex justify-center">
                                        <a
                                            ref={(el) => { if (el) el.setAttribute('href', bookmarkletCode); }}
                                            onClick={(e) => e.preventDefault()}
                                            className="group relative inline-flex items-center gap-2.5 px-6 py-3 bg-gradient-to-r from-primary-600 to-secondary-600 hover:from-primary-500 hover:to-secondary-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-primary-500/25 hover:shadow-primary-500/40 transition-all hover:scale-105 cursor-grab active:cursor-grabbing border border-primary-400/30"
                                            title={t.help.bookmarklet?.dragInstruction || 'Drag to bookmarks bar'}
                                        >
                                            <Bookmark size={18} className="group-hover:animate-bounce" />
                                            <span>Open in SynCinema</span>
                                            {/* Glow effect */}
                                            <div className="absolute inset-0 rounded-xl bg-primary-400/20 opacity-0 group-hover:opacity-100 blur-md transition-opacity -z-10" />
                                        </a>
                                    </div>
                                    <div className="mt-4 p-3 bg-gray-900/50 rounded-lg border border-gray-700/50">
                                        <p className="text-[10px] text-gray-400 mb-1.5 font-medium">💡 {t.help.bookmarklet?.howToInstall || 'Manual setup:'}</p>
                                        <p className="text-[10px] text-gray-500 mb-2">1. Right-click bookmarks bar → "Add page" / "Add bookmark"</p>
                                        <p className="text-[10px] text-gray-500 mb-2">2. Name: <span className="text-primary-400">Open in SynCinema</span></p>
                                        <p className="text-[10px] text-gray-500 mb-1.5">3. URL: Copy the code below</p>
                                        <div className="relative">
                                            <code className="block text-[9px] text-primary-300 bg-gray-950 p-2 rounded border border-gray-700 break-all max-h-16 overflow-y-auto select-all font-mono">
                                                {bookmarkletCode}
                                            </code>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-500 dark:text-gray-500 mt-3 text-center">
                                        {t.help.bookmarklet?.note || 'Works on Chrome, Firefox, Edge, Opera, and Brave browsers.'}
                                    </p>
                                </div>
                            );
                        })()}
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
            className="relative group p-2 rounded-xl bg-gradient-to-br from-primary-500/20 to-secondary-500/20 border border-primary-500/30 hover:border-primary-400 text-primary-400 hover:text-primary-300 transition-all hover:scale-105"
            title="Help & Documentation"
        >
            {/* Stylized "i" icon */}
            <div className="w-5 h-5 flex items-center justify-center">
                <span className="text-lg font-serif font-bold italic">i</span>
            </div>
            {/* Glow effect on hover */}
            <div className="absolute inset-0 rounded-xl bg-primary-500/20 opacity-0 group-hover:opacity-100 blur-sm transition-opacity" />
        </button>
    );
};
