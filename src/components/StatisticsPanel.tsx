import React, { useMemo, useState } from 'react';
import {
    X,
    Clock,
    Calendar,
    Film,
    Music,
    Save,
    Sliders,
    Play,
    Volume2,
    FastForward,
    Maximize,
    MonitorPlay,
    Subtitles,
    Bookmark,
    BarChart3,
    Trash2,
    FolderOpen,
    Info
} from 'lucide-react';
import { AnalyticsData } from '../hooks/useAnalytics';
import { useI18n } from '../context/I18nContext';

interface StatisticsPanelProps {
    isOpen: boolean;
    onClose: () => void;
    analytics: AnalyticsData;
    formatWatchTime: (seconds: number) => string;
    onReset: () => void;
}

// Stat card component with light/dark mode support + mobile tooltip
const StatCard: React.FC<{
    icon: React.ReactNode;
    label: string;
    value: string | number;
    colorClass: string;
    iconColorClass: string;
    large?: boolean;
}> = ({ icon, label, value, colorClass, iconColorClass, large }) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const isLongLabel = label.length > 16;

    return (
        <div
            className={`
                relative overflow-hidden rounded-2xl p-4
                bg-white dark:bg-gray-800/80
                border border-gray-200 dark:border-gray-700/50
                shadow-sm dark:shadow-none
                transition-all duration-300 hover:scale-[1.02] hover:shadow-md dark:hover:border-gray-600/50
                ${large ? 'col-span-2' : ''}
            `}
        >
            {/* Glow effect - only in dark mode */}
            <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full blur-3xl opacity-0 dark:opacity-20 ${colorClass}`} />

            <div className="relative flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${colorClass} bg-opacity-10 dark:bg-opacity-20 flex-shrink-0`}>
                    <span className={iconColorClass}>{icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                        <p className={`text-gray-500 dark:text-gray-400 leading-tight line-clamp-2 ${isLongLabel ? 'text-[10px]' : 'text-xs'}`}>
                            {label}
                        </p>
                        {isLongLabel && (
                            <button
                                onClick={(e) => { e.stopPropagation(); setShowTooltip(!showTooltip); }}
                                onMouseEnter={() => setShowTooltip(true)}
                                onMouseLeave={() => setShowTooltip(false)}
                                className="flex-shrink-0 p-0.5 rounded-full text-gray-400 hover:text-primary-400 transition-colors"
                            >
                                <Info size={10} />
                            </button>
                        )}
                    </div>
                    <p className={`font-bold text-gray-900 dark:text-gray-100 ${large ? 'text-2xl' : 'text-lg'}`}>
                        {value}
                    </p>
                </div>
            </div>

            {/* Tooltip overlay */}
            {showTooltip && isLongLabel && (
                <div
                    className="absolute z-50 left-2 right-2 -top-2 -translate-y-full px-3 py-2 rounded-xl
                        bg-gray-900 dark:bg-gray-700 text-white text-[11px] font-medium
                        shadow-xl border border-gray-700 dark:border-gray-600
                        animate-[fadeIn_0.15s_ease-out]"
                    onClick={() => setShowTooltip(false)}
                >
                    {label}
                    <div className="absolute left-1/2 -translate-x-1/2 -bottom-1 w-2 h-2 bg-gray-900 dark:bg-gray-700 rotate-45 border-r border-b border-gray-700 dark:border-gray-600" />
                </div>
            )}
        </div>
    );
};

// Feature bar component for "Most Used Features" with light/dark mode
const FeatureBar: React.FC<{
    icon: React.ReactNode;
    label: string;
    count: number;
    maxCount: number;
    colorClass: string;
    iconColorClass: string;
}> = ({ icon, label, count, maxCount, colorClass, iconColorClass }) => {
    const percentage = maxCount > 0 ? (count / maxCount) * 100 : 0;

    return (
        <div className="flex items-center gap-3">
            <div className={`p-1.5 rounded-lg ${colorClass} bg-opacity-10 dark:bg-opacity-20 flex-shrink-0`}>
                <span className={iconColorClass}>{icon}</span>
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex justify-between items-center mb-1">
                    <span className="text-xs text-gray-600 dark:text-gray-300 truncate">{label}</span>
                    <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">{count}</span>
                </div>
                <div className="h-2 bg-gray-200 dark:bg-gray-700/50 rounded-full overflow-hidden">
                    <div
                        className={`h-full rounded-full transition-all duration-500 ${colorClass}`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            </div>
        </div>
    );
};

export const StatisticsPanel: React.FC<StatisticsPanelProps> = ({
    isOpen,
    onClose,
    analytics,
    formatWatchTime,
    onReset,
}) => {
    const { t } = useI18n();

    // Calculate most used features
    const featureStats = useMemo(() => {
        const features = [
            { key: 'playPause', icon: <Play size={14} />, label: t.statistics?.playPause || 'Play/Pause', count: analytics.playPauseCount, colorClass: 'bg-primary-500', iconColorClass: 'text-primary-600 dark:text-primary-400' },
            { key: 'volume', icon: <Volume2 size={14} />, label: t.statistics?.volumeAdjust || 'Volume Adjust', count: analytics.volumeAdjustments, colorClass: 'bg-blue-500', iconColorClass: 'text-blue-600 dark:text-blue-400' },
            { key: 'seek', icon: <FastForward size={14} />, label: t.statistics?.seek || 'Seek', count: analytics.seekCount, colorClass: 'bg-secondary-500', iconColorClass: 'text-secondary-600 dark:text-secondary-400' },
            { key: 'eq', icon: <Sliders size={14} />, label: t.statistics?.eqAdjust || 'EQ Adjust', count: analytics.eqAdjustments, colorClass: 'bg-tertiary-500', iconColorClass: 'text-tertiary-600 dark:text-tertiary-400' },
            { key: 'fullscreen', icon: <Maximize size={14} />, label: t.statistics?.fullscreen || 'Fullscreen', count: analytics.fullscreenToggles, colorClass: 'bg-orange-500', iconColorClass: 'text-orange-600 dark:text-orange-400' },
            { key: 'detach', icon: <MonitorPlay size={14} />, label: t.statistics?.detach || 'Detach', count: analytics.detachOpened, colorClass: 'bg-cyan-500', iconColorClass: 'text-cyan-600 dark:text-cyan-400' },
        ].sort((a, b) => b.count - a.count);

        const maxCount = Math.max(...features.map(f => f.count), 1);
        return { features, maxCount };
    }, [analytics, t]);

    // Format date
    const formatDate = (isoString: string): string => {
        try {
            return new Date(isoString).toLocaleDateString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch {
            return 'Unknown';
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 dark:bg-black/60 backdrop-blur-sm">
            <div
                className="relative w-full max-w-lg max-h-[90vh] overflow-hidden rounded-3xl
                    bg-gray-50 dark:bg-gradient-to-b dark:from-gray-900 dark:to-gray-950
                    border border-gray-200 dark:border-gray-700/50 shadow-2xl"
            >
                {/* Header */}
                <div className="sticky top-0 z-10 flex items-center justify-between p-5 
                    bg-white dark:bg-gray-900
                    border-b border-gray-200 dark:border-gray-800">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-gradient-to-br from-primary-500 to-secondary-600">
                            <BarChart3 size={20} className="text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                                {t.statistics?.title || 'Usage Statistics'}
                            </h2>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                {t.statistics?.since || 'Since'}: {formatDate(analytics.firstUsed)}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl bg-gray-100 dark:bg-gray-800/50 hover:bg-gray-200 dark:hover:bg-gray-700/50 
                            text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-white transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="px-5 pb-5 overflow-y-auto max-h-[calc(90vh-140px)] space-y-4 bg-gray-50 dark:bg-transparent">
                    {/* Main Stats Grid */}
                    <div className="grid grid-cols-2 gap-3">
                        <StatCard
                            icon={<Clock size={20} />}
                            label={t.statistics?.totalWatchTime || 'Total Watch Time'}
                            value={formatWatchTime(analytics.totalWatchTime)}
                            colorClass="bg-primary-500"
                            iconColorClass="text-primary-600 dark:text-primary-400"
                            large
                        />
                        <StatCard
                            icon={<Calendar size={18} />}
                            label={t.statistics?.totalSessions || 'Total Sessions'}
                            value={analytics.sessionCount}
                            colorClass="bg-blue-500"
                            iconColorClass="text-blue-600 dark:text-blue-400"
                        />
                        <StatCard
                            icon={<Film size={18} />}
                            label={t.statistics?.videosLoaded || 'Videos Loaded'}
                            value={analytics.videosLoaded}
                            colorClass="bg-secondary-500"
                            iconColorClass="text-secondary-600 dark:text-secondary-400"
                        />
                        <StatCard
                            icon={<Music size={18} />}
                            label={t.statistics?.audioTracksAdded || 'Audio Tracks Added'}
                            value={analytics.audioTracksAdded}
                            colorClass="bg-tertiary-500"
                            iconColorClass="text-tertiary-600 dark:text-tertiary-400"
                        />
                        <StatCard
                            icon={<Save size={18} />}
                            label={t.statistics?.projectsSaved || 'Projects Saved'}
                            value={analytics.projectsSaved}
                            colorClass="bg-secondary-500"
                            iconColorClass="text-secondary-600 dark:text-secondary-400"
                        />
                        <StatCard
                            icon={<FolderOpen size={18} />}
                            label={t.statistics?.projectsLoaded || 'Projects Loaded'}
                            value={analytics.projectsLoaded}
                            colorClass="bg-yellow-500"
                            iconColorClass="text-yellow-600 dark:text-yellow-400"
                        />
                        <StatCard
                            icon={<Subtitles size={18} />}
                            label={t.statistics?.subtitlesLoaded || 'Subtitles Loaded'}
                            value={analytics.subtitlesLoaded}
                            colorClass="bg-cyan-500"
                            iconColorClass="text-cyan-600 dark:text-cyan-400"
                        />
                        <StatCard
                            icon={<Bookmark size={18} />}
                            label={t.statistics?.markersAdded || 'Markers Added'}
                            value={analytics.markersAdded}
                            colorClass="bg-orange-500"
                            iconColorClass="text-orange-600 dark:text-orange-400"
                        />
                    </div>

                    {/* Most Used Features */}
                    <div className="rounded-2xl p-4 bg-white dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700/50">
                        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4 flex items-center gap-2">
                            <BarChart3 size={16} className="text-primary-500 dark:text-primary-400" />
                            {t.statistics?.mostUsedFeatures || 'Most Used Features'}
                        </h3>
                        <div className="space-y-3">
                            {featureStats.features.slice(0, 5).map((feature) => (
                                <FeatureBar
                                    key={feature.key}
                                    icon={feature.icon}
                                    label={feature.label}
                                    count={feature.count}
                                    maxCount={featureStats.maxCount}
                                    colorClass={feature.colorClass}
                                    iconColorClass={feature.iconColorClass}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Last Used */}
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-500 px-1">
                        <span>{t.statistics?.lastUsed || 'Last used'}: {formatDate(analytics.lastUsed)}</span>
                    </div>

                    {/* Reset Button */}
                    <button
                        onClick={() => {
                            if (window.confirm(t.statistics?.resetConfirm || 'Are you sure you want to reset all statistics?')) {
                                onReset();
                            }
                        }}
                        className="w-full py-3 rounded-xl
                            bg-red-50 dark:bg-red-500/10 hover:bg-red-100 dark:hover:bg-red-500/20
                            border border-red-200 dark:border-red-500/30 hover:border-red-300 dark:hover:border-red-500/50
                            text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300
                            flex items-center justify-center gap-2
                            transition-all duration-200"
                    >
                        <Trash2 size={16} />
                        {t.statistics?.reset || 'Reset Statistics'}
                    </button>
                </div>
            </div>
        </div>
    );
};
