import React from 'react';
import { Upload } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

interface SubtitleSettingsProps {
    hasSubtitles: boolean;
    subtitleOffset: number;
    onSubtitleOffsetChange: (offset: number) => void;
    subtitleInputRef: React.RefObject<HTMLInputElement | null>;
    handleSubtitleLoad: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const SubtitleSettings: React.FC<SubtitleSettingsProps> = ({
    hasSubtitles,
    subtitleOffset,
    onSubtitleOffsetChange,
    subtitleInputRef,
    handleSubtitleLoad,
}) => {
    const { t } = useI18n();

    return (
        <div className="mt-3 pt-3 border-t border-gray-700/50">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">{t.sidebar.subtitles} (.srt)</span>
                {!hasSubtitles ? (
                    <button onClick={() => subtitleInputRef.current?.click()} className="text-xs text-primary-400 hover:text-primary-300 flex items-center gap-1">
                        <Upload size={12} /> {t.sidebar.load}
                    </button>
                ) : (
                    <div className="flex items-center gap-3">
                        <span className="text-xs text-secondary-500">{t.sidebar.active}</span>
                        <div className="flex items-center gap-1">
                            <span className="text-[10px] text-gray-500">{t.sidebar.offset}</span>
                            <input
                                type="number"
                                step="0.1"
                                value={subtitleOffset}
                                onChange={(e) => onSubtitleOffsetChange(parseFloat(e.target.value) || 0)}
                                className="w-14 bg-gray-900 border border-gray-700 rounded text-xs p-0.5 text-center focus:ring-1 focus:ring-primary-500"
                            />
                        </div>
                        <button onClick={() => subtitleInputRef.current?.click()} className="text-[10px] text-gray-400 hover:text-white">Replace</button>
                    </div>
                )}
            </div>
            <input type="file" accept=".srt" className="hidden" ref={subtitleInputRef} onChange={handleSubtitleLoad} />
        </div>
    );
};
