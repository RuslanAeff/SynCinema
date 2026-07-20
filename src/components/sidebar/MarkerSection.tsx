import React, { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { useI18n } from '../../context/I18nContext';

interface MarkerSectionProps {
    videoFile: File | null;
    markers: { id: string; time: number; label: string }[];
    onAddMarker: () => void;
    onDeleteMarker: (id: string) => void;
    onSeekToMarker: (time: number) => void;
}

const MarkerSectionComponent: React.FC<MarkerSectionProps> = ({
    videoFile,
    markers,
    onAddMarker,
    onDeleteMarker,
    onSeekToMarker,
}) => {
    const { t } = useI18n();
    const [isMarkersCollapsed, setIsMarkersCollapsed] = useState(false);

    if (!videoFile) return null;

    return (
        <div className="rounded-xl border border-dashed border-gray-300 dark:border-gray-700 bg-gray-100 dark:bg-gray-800/30 overflow-hidden">
            {/* Collapsible Header */}
            <button
                onClick={() => setIsMarkersCollapsed(!isMarkersCollapsed)}
                className="w-full p-4 flex items-center justify-between hover:bg-gray-200/50 dark:hover:bg-gray-800/50 transition-colors"
            >
                <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    🔖 {t.sidebar.markers}
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-500">({markers.length})</span>
                </h2>
                <div className="flex items-center gap-2">
                    <span
                        onClick={(e) => { e.stopPropagation(); onAddMarker(); }}
                        className="text-xs bg-primary-600 hover:bg-primary-700 text-white px-2 py-1 rounded transition-colors"
                    >
                        + Add
                    </span>
                    <ChevronDown
                        size={16}
                        className={`text-gray-500 dark:text-gray-400 transition-transform duration-300 ${isMarkersCollapsed ? '-rotate-90' : 'rotate-0'}`}
                    />
                </div>
            </button>

            {/* Collapsible Content */}
            <div
                className={`transition-all duration-300 ease-in-out overflow-hidden ${isMarkersCollapsed ? 'max-h-0 opacity-0' : 'max-h-96 opacity-100'}`}
            >
                <div className="px-4 pb-4">
                    {markers.length === 0 ? (
                        <p className="text-xs text-gray-500 dark:text-gray-500 text-center py-2">{t.sidebar.noMarkers}</p>
                    ) : (
                        <div className="space-y-1 max-h-32 overflow-y-auto">
                            {markers.map((marker) => {
                                const time = marker.time || 0;
                                const minutes = Math.floor(time / 60);
                                const seconds = Math.floor(time % 60);
                                const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
                                return (
                                    <div key={marker.id} className="flex items-center justify-between bg-gray-900/50 rounded p-2 group">
                                        <button
                                            onClick={() => onSeekToMarker(marker.time)}
                                            className="flex items-center gap-2 text-left hover:text-primary-400 transition-colors flex-1"
                                        >
                                            <span className="text-xs font-mono text-primary-400">{timeStr}</span>
                                            <span className="text-xs text-gray-300 truncate">{marker.label}</span>
                                        </button>
                                        <button
                                            onClick={() => onDeleteMarker(marker.id)}
                                            className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity text-xs"
                                        >
                                            ✕
                                        </button>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// Memoized: all props from Sidebar are referentially stable, so this section
// skips re-rendering on playback ticks that only move `currentTime`.
export const MarkerSection = React.memo(MarkerSectionComponent);
