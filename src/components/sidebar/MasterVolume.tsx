import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

interface MasterVolumeProps {
    masterVolume: number;
    onMasterVolumeChange: (volume: number) => void;
}

export const MasterVolume: React.FC<MasterVolumeProps> = ({
    masterVolume,
    onMasterVolumeChange,
}) => {
    const { t } = useI18n();
    const [isMasterVolumeCollapsed, setIsMasterVolumeCollapsed] = useState(false);

    return (
        <div className="p-3 m-3 rounded-lg bg-gradient-to-r from-primary-900/30 to-secondary-900/30 border border-primary-500/30 overflow-hidden">
            <button
                onClick={() => setIsMasterVolumeCollapsed(!isMasterVolumeCollapsed)}
                className="w-full flex items-center justify-between"
            >
                <span className="text-xs font-semibold text-primary-300 uppercase tracking-wider">🎚️ {t.sidebar.masterVolume}</span>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-primary-400">{Math.round(masterVolume * 100)}%</span>
                    <ChevronDown
                        size={14}
                        className={`text-primary-400 transition-transform duration-300 ${isMasterVolumeCollapsed ? '-rotate-90' : 'rotate-0'}`}
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
                    className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-primary-500"
                />
            </div>
        </div>
    );
};
