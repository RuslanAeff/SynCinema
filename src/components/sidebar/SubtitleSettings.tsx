import React, { useState, useRef, useEffect } from 'react';
import { Upload, Type, Palette, ChevronDown } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';
import { SubtitleStyle } from '../../types';

interface SubtitleSettingsProps {
    hasSubtitles: boolean;
    subtitleOffset: number;
    onSubtitleOffsetChange: (offset: number) => void;
    subtitleStyle: SubtitleStyle;
    onSubtitleStyleChange: (style: SubtitleStyle) => void;
    subtitleInputRef: React.RefObject<HTMLInputElement | null>;
    handleSubtitleLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SubtitleSettings: React.FC<SubtitleSettingsProps> = ({
    hasSubtitles,
    subtitleOffset,
    onSubtitleOffsetChange,
    subtitleStyle,
    onSubtitleStyleChange,
    subtitleInputRef,
    handleSubtitleLoad,
}) => {
    const { t } = useI18n();
    const [isSettingsCollapsed, setIsSettingsCollapsed] = useState(false);
    const [isColorPickerOpen, setIsColorPickerOpen] = useState(false);
    const [advancedPickerKey, setAdvancedPickerKey] = useState(0);
    const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);
    const colorPickerRef = useRef<HTMLDivElement>(null);

    const safeStyle = subtitleStyle || {
        color: '#ffffff',
        backgroundColor: 'rgba(0, 0, 0, 0)',
        fontSize: 'medium',
        textShadow: true,
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (colorPickerRef.current && !colorPickerRef.current.contains(event.target as Node)) {
                setIsColorPickerOpen(false);
            }
        };
        if (isColorPickerOpen) document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isColorPickerOpen]);

    const PRESET_COLORS = [
        '#ffffff', '#cccccc', '#ffeb3b', '#ff9800',
        '#00e676', '#00e5ff', '#2979ff', '#d500f9',
        '#ff1744', '#000000'
    ];

    return (
        <div className="mt-3 pt-3 border-t border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
                <button
                    onClick={() => { if (hasSubtitles) setIsSettingsCollapsed(!isSettingsCollapsed); }}
                    className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${hasSubtitles ? 'text-gray-300 hover:text-white cursor-pointer' : 'text-gray-500 cursor-default'}`}
                >
                    {t.sidebar.subtitles} (.srt)
                    {hasSubtitles && (
                        <ChevronDown
                            size={14}
                            className={`transition-transform duration-300 ${isSettingsCollapsed ? '-rotate-90' : 'rotate-0'}`}
                        />
                    )}
                </button>
                {!hasSubtitles ? (
                    <button onClick={() => subtitleInputRef.current?.click()} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                        <Upload size={12} /> {t.sidebar.load}
                    </button>
                ) : (
                    <div className="flex items-center gap-3">
                        <span className="text-[10px] text-gray-400">Offset:</span>
                        <input
                            type="number"
                            step="0.1"
                            value={subtitleOffset}
                            onChange={(e) => onSubtitleOffsetChange(parseFloat(e.target.value) || 0)}
                            className="w-14 bg-gray-900 border border-gray-700 rounded text-xs p-0.5 text-center focus:ring-1 focus:ring-primary-500"
                        />
                        <button onClick={() => subtitleInputRef.current?.click()} className="text-[10px] text-gray-400 hover:text-white">Replace</button>
                    </div>
                )}
            </div>

            {hasSubtitles && (
                <div className={`transition-all duration-300 ease-in-out ${isSettingsCollapsed ? 'max-h-0 opacity-0 overflow-hidden' : 'max-h-[500px] opacity-100 overflow-visible relative z-50'}`}>
                    <div className="space-y-3 bg-gray-900/50 p-3 rounded-lg border border-gray-700/50 mb-1">
                        {/* Font Size & Shadow */}
                        <div className="flex items-center gap-4">
                            <div className="flex-1 flex items-center justify-between">
                                <label className="text-[10px] text-gray-400 flex items-center gap-1"><Type size={10} /> Size</label>
                                <select
                                    value={safeStyle.fontSize}
                                    onChange={(e) => onSubtitleStyleChange({ ...safeStyle, fontSize: e.target.value as any })}
                                    className="bg-gray-800 border border-gray-700 text-[10px] text-gray-300 rounded px-1 py-0.5"
                                >
                                    <option value="small">Small</option>
                                    <option value="medium">Medium</option>
                                    <option value="large">Large</option>
                                    <option value="xlarge">Extra Large</option>
                                </select>
                            </div>
                            <div className="flex-1 flex items-center justify-between pl-4 border-l border-gray-700/50">
                                <label className="text-[10px] text-gray-400">Shadow</label>
                                <input
                                    type="checkbox"
                                    checked={safeStyle.textShadow}
                                    onChange={(e) => onSubtitleStyleChange({ ...safeStyle, textShadow: e.target.checked })}
                                    className="rounded text-primary-500 bg-gray-800 border-gray-700 focus:ring-primary-500"
                                />
                            </div>
                        </div>

                        {/* Colors */}
                        <div className="flex items-center gap-4">
                            <div className="flex-1 flex items-center justify-between">
                                <label className="text-[10px] text-gray-400 flex items-center gap-1"><Palette size={10} /> Text</label>
                                <div className="relative" ref={colorPickerRef}>
                                    <button
                                        onClick={() => setIsColorPickerOpen(!isColorPickerOpen)}
                                        className="w-8 h-5 rounded overflow-hidden border border-gray-600 hover:border-primary-500 transition-colors shadow-inner flex items-center justify-center cursor-pointer"
                                        style={{ backgroundColor: safeStyle.color }}
                                    />
                                    {isColorPickerOpen && (
                                        <div className="absolute top-full left-1/2 -translate-x-1/2 mt-3 p-3 bg-gray-800 border border-gray-600 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.5)] z-50 w-52 flex flex-col gap-3 backdrop-blur-md">
                                            <div className="text-[10px] text-gray-400 font-medium tracking-wide uppercase">Preset Colors</div>
                                            <div className="grid grid-cols-5 gap-2">
                                                {PRESET_COLORS.map(c => (
                                                    <button
                                                        key={c}
                                                        onClick={() => { onSubtitleStyleChange({ ...safeStyle, color: c }); setIsColorPickerOpen(false); }}
                                                        className={`w-6 h-6 rounded-md border ${safeStyle.color === c ? 'border-primary-500 scale-110 shadow-primary-500/50' : 'border-gray-500 hover:scale-105 hover:border-gray-300'} transition-all shadow-sm`}
                                                        style={{ backgroundColor: c }}
                                                        title={c}
                                                    />
                                                ))}
                                            </div>
                                            <div className="pt-2 border-t border-gray-700/80 flex flex-col gap-2">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-gray-400">HEX</span>
                                                    <input
                                                        type="text"
                                                        value={safeStyle.color}
                                                        onChange={(e) => {
                                                            const newColor = e.target.value;
                                                            onSubtitleStyleChange({ ...safeStyle, color: newColor });
                                                        }}
                                                        className="flex-1 bg-gray-900 border border-gray-600 rounded-md px-2 py-1 text-xs text-white focus:outline-none focus:border-primary-500 focus:ring-1 focus:ring-primary-500 font-mono transition-shadow h-7"
                                                        placeholder="#ffffff"
                                                    />
                                                </div>

                                                <div className="relative h-7 rounded-md overflow-hidden mt-1 group shrink-0 border border-gray-600 hover:border-primary-400 transition-colors shadow-sm">
                                                    <div className="absolute inset-0 bg-gradient-to-r from-red-500 via-yellow-500 via-green-500 via-blue-500 to-purple-500 opacity-60 group-hover:opacity-100 transition-opacity" />
                                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none bg-black/40 group-hover:bg-black/20 transition-colors">
                                                        <span className="text-[10px] font-bold text-white drop-shadow-md tracking-wider">
                                                            {isAdvancedOpen ? 'CLOSE PALETTE' : '+ MORE COLORS'}
                                                        </span>
                                                    </div>
                                                    <input
                                                        key={advancedPickerKey}
                                                        type="color"
                                                        value={safeStyle.color.length === 7 ? safeStyle.color : '#ffffff'} // Native pickers require exact 7 char hex
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val) onSubtitleStyleChange({ ...safeStyle, color: val });
                                                        }}
                                                        onInput={(e) => {
                                                            const val = (e.target as HTMLInputElement).value;
                                                            if (val) onSubtitleStyleChange({ ...safeStyle, color: val });
                                                        }}
                                                        onClick={(e) => {
                                                            if (isAdvancedOpen) {
                                                                e.preventDefault();
                                                                setIsAdvancedOpen(false);
                                                                setAdvancedPickerKey(k => k + 1);
                                                            } else {
                                                                setIsAdvancedOpen(true);
                                                            }
                                                        }}
                                                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 flex items-center justify-between pl-4 border-l border-gray-700/50">
                                <label className="text-[10px] text-gray-400">Backdrop</label>
                                <select
                                    value={safeStyle.backgroundColor}
                                    onChange={(e) => onSubtitleStyleChange({ ...safeStyle, backgroundColor: e.target.value })}
                                    className="bg-gray-800 border border-gray-700 text-[10px] text-gray-300 rounded px-1 py-0.5"
                                >
                                    <option value="rgba(0, 0, 0, 0)">None</option>
                                    <option value="rgba(0, 0, 0, 0.5)">Dark</option>
                                    <option value="rgba(0, 0, 0, 0.8)">Darker</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <input type="file" accept=".srt" className="hidden" ref={subtitleInputRef} onChange={handleSubtitleLoad} />
        </div>
    );
};
