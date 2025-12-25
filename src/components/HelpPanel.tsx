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
    Info
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
                description: 'Start or stop video playback. All synchronized audio tracks will also play or pause together.',
                shortcut: 'Space or K'
            },
            {
                name: 'Rewind 10s',
                icon: <RotateCcw size={16} />,
                description: 'Jump backward 10 seconds in the video timeline.',
                shortcut: 'J or ←'
            },
            {
                name: 'Forward 10s',
                icon: <RotateCcw size={16} className="-scale-x-100" />,
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
                description: 'Adjust the main video audio volume. This is separate from external audio tracks.',
                shortcut: '↑ / ↓'
            },
            {
                name: 'Fullscreen',
                icon: <Maximize size={16} />,
                description: 'Toggle fullscreen mode for immersive viewing.',
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
                description: 'Load external audio files (MP3, WAV, AAC, etc.). You can add multiple tracks for different languages or commentary.',
            },
            {
                name: 'Output Device',
                icon: <MonitorSpeaker size={16} />,
                description: 'Route each audio track to a different speaker or headphone. Perfect for family movie nights where everyone watches in their own language!',
            },
            {
                name: 'Start Offset',
                icon: <Clock size={16} />,
                description: 'Adjust the delay (positive or negative) to sync audio with video. Use the +/- buttons for fine-tuning.',
            },
            {
                name: 'Playback Speed',
                icon: <Gauge size={16} />,
                description: 'Adjust the playback rate if audio drifts out of sync over time. Useful for fixing frame rate mismatches.',
            },
            {
                name: 'Volume',
                icon: <Volume2 size={16} />,
                description: 'Control individual track volume. Each track has its own mute button.',
            },
            {
                name: 'Master Volume',
                description: 'Adjust the overall volume for all audio tracks simultaneously.',
            },
            {
                name: '3-Band EQ',
                icon: <Sliders size={16} />,
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
                description: 'Export your current settings (track offsets, EQ, device assignments, volume levels) as a .sync file. Does NOT save actual media files.',
            },
            {
                name: 'Load Project',
                icon: <FolderOpen size={16} />,
                description: 'Import a previously saved .sync file. Settings will be applied to matching audio tracks by filename.',
            },
            {
                name: 'Load Video',
                icon: <Film size={16} />,
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
                description: 'Switch between dark and light mode. Your preference is saved automatically.',
            },
            {
                name: 'Refresh Devices',
                description: 'Re-scan available audio output devices if you connect new speakers or headphones.',
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
                className={`absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={onClose}
            />

            {/* Modal */}
            <div
                className={`relative bg-gray-900 border border-gray-700 rounded-2xl shadow-2xl w-[90%] max-w-4xl h-[85vh] max-h-[700px] flex overflow-hidden transition-all duration-300 ${isVisible ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
                    }`}
            >
                {/* Sidebar Navigation */}
                <div className="w-64 bg-gray-950 border-r border-gray-800 flex flex-col">
                    {/* Header */}
                    <div className="p-6 border-b border-gray-800">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                                <Info size={20} className="text-white" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white">Help Center</h2>
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
                                    : 'text-gray-400 hover:bg-gray-800 hover:text-white'
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
                    <div className="p-4 border-t border-gray-800">
                        <p className="text-xs text-gray-600 text-center">
                            Press Esc to close
                        </p>
                    </div>
                </div>

                {/* Content Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Content Header */}
                    <div className="p-6 border-b border-gray-800 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                                {activeSection.icon}
                            </div>
                            <h3 className="text-xl font-bold text-white">{activeSection.title}</h3>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
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
                                    className="p-4 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 transition-colors"
                                >
                                    <div className="flex items-start gap-4">
                                        {item.icon && (
                                            <div className="p-2 rounded-lg bg-gray-700/50 text-gray-300 flex-shrink-0">
                                                {item.icon}
                                            </div>
                                        )}
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h4 className="font-semibold text-white">{item.name}</h4>
                                                {item.shortcut && (
                                                    <span className="px-2 py-0.5 text-xs font-mono bg-gray-700 text-gray-300 rounded">
                                                        {item.shortcut}
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-sm text-gray-400 leading-relaxed">
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
