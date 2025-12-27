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

interface HelpPanelProps {
    isOpen: boolean;
    onClose: () => void;
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

const helpSections: HelpSection[] = [
    {
        id: 'video-controls',
        title: 'Video Controls',
        icon: <Film size={20} />,
        items: [
            {
                name: 'Play / Pause',
                icon: <Play size={16} />,
                iconColor: 'bg-green-500/20 text-green-500 dark:bg-green-500/20 dark:text-green-400',
                description: 'Start or stop video playback. All synchronized audio tracks will also play or pause together.',
                shortcut: 'Space or K'
            },
            {
                name: 'Rewind 10s',
                icon: <RotateCcw size={16} />,
                iconColor: 'bg-blue-500/20 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
                description: 'Jump backward 10 seconds in the video timeline.',
                shortcut: 'J or ←'
            },
            {
                name: 'Forward 10s',
                icon: <RotateCcw size={16} className="-scale-x-100" />,
                iconColor: 'bg-blue-500/20 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
                description: 'Jump forward 10 seconds in the video timeline.',
                shortcut: 'L or →'
            },
            {
                name: 'Progress Bar',
                description: 'Click or drag to seek to any position in the video. Hover to see a preview thumbnail.',
            },
            {
                name: 'Volume Slider',
                icon: <Volume2 size={16} />,
                iconColor: 'bg-purple-500/20 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
                description: 'Adjust the main video audio volume. Click the icon to mute/unmute.',
                shortcut: '↑ / ↓'
            },
            {
                name: 'Fullscreen',
                icon: <Maximize size={16} />,
                iconColor: 'bg-indigo-500/20 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400',
                description: 'Toggle fullscreen mode for immersive viewing. Controls auto-hide after 3 seconds (move mouse to show).',
                shortcut: 'F'
            },
            {
                name: 'Detach Player',
                description: 'Open the video in a separate window. Useful for multi-monitor setups.',
            }
        ]
    },
    {
        id: 'audio-tracks',
        title: 'Audio Tracks',
        icon: <Music size={20} />,
        items: [
            {
                name: 'Add Audio',
                icon: <Upload size={16} />,
                iconColor: 'bg-emerald-500/20 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400',
                description: 'Load external audio files (MP3, WAV, AAC, etc.) from your computer or via URL (Link button). You can add multiple tracks for different languages or commentary.',
            },
            {
                name: 'Output Device',
                icon: <MonitorSpeaker size={16} />,
                iconColor: 'bg-cyan-500/20 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400',
                description: 'Route each audio track to a different speaker or headphone. Perfect for family movie nights where everyone watches in their own language!',
            },
            {
                name: 'Start Offset',
                icon: <Clock size={16} />,
                iconColor: 'bg-amber-500/20 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
                description: 'Adjust the delay (positive or negative) to sync audio with video. Use the +/- buttons for fine-tuning.',
            },
            {
                name: 'Playback Speed',
                icon: <Gauge size={16} />,
                iconColor: 'bg-orange-500/20 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400',
                description: 'Adjust the playback rate if audio drifts out of sync over time. Useful for fixing frame rate mismatches.',
            },
            {
                name: 'Volume',
                icon: <Volume2 size={16} />,
                iconColor: 'bg-purple-500/20 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400',
                description: 'Control individual track volume. Each track has its own mute button.',
            },
            {
                name: 'Master Volume',
                description: 'Adjust the overall volume for all audio tracks simultaneously.',
            },
            {
                name: '3-Band EQ',
                icon: <Sliders size={16} />,
                iconColor: 'bg-pink-500/20 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400',
                description: 'Fine-tune audio with Bass (low frequencies), Mid (vocals), and Treble (high frequencies) controls.',
            },
            {
                name: 'Limiter',
                description: 'Automatically compress loud audio peaks to prevent distortion and protect your hearing.',
            },
            {
                name: 'Waveform',
                description: 'Visual representation of the audio file. Shows where you are in the track relative to the video timeline.',
            }
        ]
    },
    {
        id: 'project',
        title: 'Project Management',
        icon: <Save size={20} />,
        items: [
            {
                name: 'Save Project',
                icon: <Save size={16} />,
                iconColor: 'bg-blue-500/20 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
                description: 'Export your current settings (track offsets, EQ, device assignments, volume levels) as a .sync file. Does NOT save actual media files.',
            },
            {
                name: 'Load Project',
                icon: <FolderOpen size={16} />,
                iconColor: 'bg-yellow-500/20 text-yellow-600 dark:bg-yellow-500/20 dark:text-yellow-400',
                description: 'Import a previously saved .sync file. Settings will be applied to matching audio tracks by filename.',
            },
            {
                name: 'Load Video',
                icon: <Film size={16} />,
                iconColor: 'bg-red-500/20 text-red-600 dark:bg-red-500/20 dark:text-red-400',
                description: 'Select a video file from your computer. Supports MP4, MKV, WebM, AVI, and more.',
            },
            {
                name: 'Load Subtitles',
                description: 'Import SRT subtitle files. Adjust subtitle offset if they are out of sync.',
            }
        ]
    },
    {
        id: 'keyboard',
        title: 'Keyboard Shortcuts',
        icon: <Keyboard size={20} />,
        items: [
            { name: 'Space / K', description: 'Play or pause the video' },
            { name: 'J', description: 'Rewind 10 seconds' },
            { name: 'L', description: 'Fast forward 10 seconds' },
            { name: '← / →', description: 'Seek 5 seconds backward/forward' },
            { name: '↑ / ↓', description: 'Increase/decrease volume' },
            { name: 'F', description: 'Toggle fullscreen mode' },
            { name: 'M', description: 'Mute/unmute video audio' },
            { name: '0-9', description: 'Jump to 0%-90% of video' },
            { name: 'Home', description: 'Jump to start of video' },
            { name: 'End', description: 'Jump to end of video' },
            { name: ', / .', description: 'Step one frame backward/forward (while paused)' },
            { name: 'Esc', description: 'Exit fullscreen' }
        ]
    },
    {
        id: 'settings',
        title: 'Settings',
        icon: <Sun size={20} />,
        items: [
            {
                name: 'Theme Toggle',
                icon: <Moon size={16} />,
                iconColor: 'bg-violet-500/20 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400',
                description: 'Switch between dark and light mode. Your preference is saved automatically.',
            },
            {
                name: 'Refresh Devices',
                description: 'Re-scan available audio output devices if you connect new speakers or headphones.',
            }
        ]
    },
    {
        id: 'url-sources',
        title: 'URL Sources',
        icon: <Link size={20} />,
        items: [
            {
                name: 'Direct Links',
                icon: <Link size={16} />,
                iconColor: 'bg-green-500/20 text-green-600 dark:bg-green-500/20 dark:text-green-400',
                description: 'Any direct link to MP4, WebM, MP3, WAV files. Must be a public URL that serves the file directly.',
            },
            {
                name: 'Dropbox',
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 6.17L6 10l6 3.83L0 10 6 6.17l6 3.83zm0 0L18 10l-6-3.83L18 2.34l6 3.83-6 3.83-6-3.83zM6 2.34L0 6.17l6 3.83 6-3.83-6-3.83zm6 11.32l-6-3.83L0 13.66l6 3.83 6-3.83zm0 0l6-3.83 6 3.83-6 3.83-6-3.83z" /></svg>,
                iconColor: 'bg-blue-600/20 text-blue-600 dark:bg-blue-500/20 dark:text-blue-400',
                description: 'Share links from Dropbox work perfectly for all file sizes. Recommended for large files. Links are automatically converted to direct download URLs.',
            },
            {
                name: 'Google Drive',
                icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M7.71 3.5L1.15 15l3.43 6L11.14 9.5 7.71 3.5zm1.42 0l6.86 12h6.86l-3.43-6-6.86-12H9.13zM12 10.44L8.56 16.5h6.88L12 10.44zm-4.57 7.06L4 22.5h13.72l3.43-5H7.43z"></path></svg>,
                iconColor: 'bg-gradient-to-br from-yellow-400/20 via-green-500/20 to-blue-500/20 text-blue-600 dark:text-blue-400',
                description: 'Public share links work for files under ~50MB. Larger files may fail due to Google\'s virus scan. For big files, use Dropbox instead.',
            },
            {
                name: 'YouTube',
                icon: <Youtube size={16} />,
                iconColor: 'bg-red-500/20 text-red-600 dark:bg-red-500/20 dark:text-red-500',
                description: 'YouTube videos can be played, but with significant limitations:',
            },
            {
                name: '⚠️ YouTube Limitations',
                description: '• Audio output CANNOT be changed (always uses default device)\n• Video quality is automatic (shown in controls, cannot be changed)\n• External audio tracks can still be routed to different devices\n• Some videos may show ads\n• No download option',
            },
            {
                name: '❌ Not Supported',
                description: 'Netflix, Vimeo, Disney+, Amazon Prime and similar streaming services are NOT supported due to DRM (Digital Rights Management) protection. These platforms encrypt their content.',
            }
        ]
    },
    {
        id: 'platform',
        title: 'Platform Requirements',
        icon: <Monitor size={20} />,
        items: [
            {
                name: '✅ Desktop / Laptop',
                icon: <Monitor size={16} />,
                iconColor: 'bg-green-500/20 text-green-600 dark:bg-green-500/20 dark:text-green-400',
                description: 'SynCinema is designed for desktop use. Full support for Chrome, Firefox, Edge, and other Chromium-based browsers. All features including multi-device audio routing work perfectly.',
            },
            {
                name: '⚠️ Mobile Devices (Android/iOS)',
                icon: <Smartphone size={16} />,
                iconColor: 'bg-amber-500/20 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400',
                description: 'Basic video playback works, but the main feature (routing audio to different devices) does NOT work on mobile. This is due to browser API limitations on iOS Safari and Android Chrome.',
            },
            {
                name: '📱 Why Mobile Doesn\'t Support Audio Routing',
                description: 'Mobile browsers don\'t support the "setSinkId" Web Audio API that allows selecting audio output devices. Additionally, mobile devices typically have only one audio output at a time (speaker or headphones), making multi-output routing impractical.',
            },
            {
                name: '💡 What Works on Mobile',
                description: '• Video playback (local files, YouTube, URLs)\n• Adding audio tracks\n• Offset/sync adjustments\n• EQ and volume controls\n• Single audio output only',
            }
        ]
    }
];

export const HelpPanel: React.FC<HelpPanelProps> = ({ isOpen, onClose }) => {
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
                                <h2 className="text-lg font-bold text-gray-900 dark:text-white">Help Center</h2>
                                <p className="text-xs text-gray-500">SynCinema Guide</p>
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
                                    ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                    }`}
                            >
                                {section.icon}
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
