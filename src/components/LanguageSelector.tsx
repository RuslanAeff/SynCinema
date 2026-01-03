/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Language Selector Component
 *  @author Ruslan Aliyev
 *  Glassmorphism dropdown for selecting application language
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useRef, useEffect } from 'react';
import { Globe, Check, ChevronDown } from 'lucide-react';
import { Language, LanguageInfo } from '../i18n';

interface LanguageSelectorProps {
    currentLanguage: Language;
    languages: LanguageInfo[];
    onLanguageChange: (lang: Language) => void;
    compact?: boolean;
}

export const LanguageSelector: React.FC<LanguageSelectorProps> = ({
    currentLanguage,
    languages,
    onLanguageChange,
    compact = false,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const currentLang = languages.find(l => l.code === currentLanguage) || languages[0];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (lang: Language) => {
        onLanguageChange(lang);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Toggle Button - Compact Glassmorphism Style */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`
                    group flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg
                    bg-gradient-to-br from-white/5 to-white/[0.02]
                    dark:from-white/5 dark:to-white/[0.02]
                    backdrop-blur-md
                    border border-white/10 dark:border-white/5
                    hover:from-white/10 hover:to-white/5
                    dark:hover:from-white/10 dark:hover:to-white/5
                    hover:border-indigo-400/30
                    transition-all duration-200 ease-out
                    ${compact ? 'text-[10px]' : 'text-xs'}
                    ${isOpen ? 'ring-1 ring-indigo-500/20 bg-white/10' : ''}
                `}
            >
                <Globe
                    size={compact ? 12 : 14}
                    className="text-indigo-400 group-hover:text-indigo-300 transition-colors"
                />
                <span className="text-sm font-medium leading-none flex items-center mt-[-2px]">{currentLang.flag}</span>
                {!compact && (
                    <span className="font-medium text-gray-300 text-xs leading-none flex items-center mt-[-1px]">{currentLang.nativeName}</span>
                )}
                <ChevronDown
                    size={12}
                    className={`text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180 text-indigo-400' : ''}`}
                />
            </button>

            {/* Dropdown Menu - Light/Dark Mode Glassmorphism */}
            {isOpen && (
                <div
                    className={`
                        absolute z-50 bottom-full mb-3 ${compact ? 'right-0' : 'left-0'}
                        min-w-[220px] 
                        bg-white/95 dark:bg-gray-900/95
                        backdrop-blur-2xl
                        border border-gray-200 dark:border-white/10
                        rounded-2xl 
                        shadow-2xl shadow-black/20 dark:shadow-black/40
                        overflow-hidden
                    `}
                    style={{
                        animation: 'slideUp 0.2s ease-out',
                    }}
                >
                    {/* Gradient Overlay for Glass Effect */}
                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/5 dark:from-white/5 to-transparent pointer-events-none" />

                    {/* Header */}
                    <div className="relative px-4 py-3 border-b border-gray-200 dark:border-white/10">
                        <div className="flex items-center gap-2">
                            <Globe size={12} className="text-indigo-500 dark:text-indigo-400" />
                            <p className="text-[10px] uppercase tracking-[0.15em] text-gray-600 dark:text-gray-400 font-semibold">
                                Select Language
                            </p>
                        </div>
                    </div>

                    {/* Language Options */}
                    <div className="relative py-2 px-2">
                        {languages.map((lang, index) => (
                            <button
                                key={lang.code}
                                onClick={() => handleSelect(lang.code)}
                                className={`
                                    w-full flex items-center gap-3 px-3 py-3 rounded-xl
                                    text-left text-sm
                                    transition-all duration-200
                                    ${currentLanguage === lang.code
                                        ? 'bg-gradient-to-r from-indigo-100 dark:from-indigo-600/30 to-purple-100 dark:to-purple-600/20 border border-indigo-300 dark:border-indigo-500/30'
                                        : 'hover:bg-gray-100 dark:hover:bg-white/5 border border-transparent'
                                    }
                                `}
                                style={{
                                    animation: `fadeInUp 0.2s ease-out ${index * 0.05}s both`,
                                }}
                            >
                                <span className="text-2xl drop-shadow-sm">{lang.flag}</span>
                                <div className="flex-1">
                                    <p className={`font-semibold ${currentLanguage === lang.code ? 'text-indigo-700 dark:text-white' : 'text-gray-800 dark:text-gray-200'}`}>
                                        {lang.nativeName}
                                    </p>
                                    <p className="text-[10px] text-gray-500 mt-0.5">{lang.name}</p>
                                </div>
                                {currentLanguage === lang.code && (
                                    <div className="flex items-center justify-center w-6 h-6 rounded-full bg-indigo-500/20 dark:bg-indigo-500/30 border border-indigo-400/50">
                                        <Check size={14} className="text-indigo-600 dark:text-indigo-300" />
                                    </div>
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Bottom Glow */}
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-indigo-600/5 to-transparent pointer-events-none" />
                </div>
            )}

            {/* CSS Animations */}
            <style>{`
                @keyframes slideUp {
                    from {
                        opacity: 0;
                        transform: translateY(8px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
                @keyframes fadeInUp {
                    from {
                        opacity: 0;
                        transform: translateY(4px);
                    }
                    to {
                        opacity: 1;
                        transform: translateY(0);
                    }
                }
            `}</style>
        </div>
    );
};
