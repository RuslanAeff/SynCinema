import React from 'react';
import { Sun, Moon, BarChart3, AlertCircle } from 'lucide-react';
import { Button } from '../Button';
import { Logo } from '../Logo';
import { InfoButton } from '../HelpPanel';
import { useI18n } from '../../context/I18nContext';

interface SidebarHeaderProps {
    theme: 'dark' | 'light';
    onThemeToggle: () => void;
    onHelpOpen: () => void;
    onStatisticsOpen: () => void;
    onSaveProject: () => void;
    onLoadProject: (file: File) => void;
    permissionsGranted: boolean;
    onRefreshDevices: () => Promise<void>;
    projectInputRef: React.RefObject<HTMLInputElement | null>;
}

export const SidebarHeader: React.FC<SidebarHeaderProps> = ({
    theme,
    onThemeToggle,
    onHelpOpen,
    onStatisticsOpen,
    onSaveProject,
    onLoadProject,
    permissionsGranted,
    onRefreshDevices,
    projectInputRef,
}) => {
    const { t } = useI18n();

    const handleProjectLoad = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) onLoadProject(file);
        if (projectInputRef.current) projectInputRef.current.value = '';
    };

    return (
        <div className="hidden lg:block p-6 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 transition-colors duration-300">
            <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-3">
                    <Logo size={48} className="drop-shadow-[0_0_15px_rgba(var(--color-primary-500),0.6)]" />
                    <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 dark:text-white">SynCinema</h1>
                </div>
                <div className="flex items-center gap-2">
                    <InfoButton onClick={onHelpOpen} />
                    <button
                        onClick={onStatisticsOpen}
                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title={t.statistics?.title || 'Statistics'}
                    >
                        <BarChart3 size={20} className="text-primary-500" />
                    </button>
                    <button
                        onClick={onThemeToggle}
                        className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                        title={theme === 'dark' ? t.sidebar.switchToLight : t.sidebar.switchToDark}
                    >
                        {theme === 'dark' ? <Sun size={20} className="text-yellow-400" /> : <Moon size={20} className="text-primary-600" />}
                    </button>
                </div>
            </div>
            <p className="text-xs font-bold tracking-wide text-gray-800 dark:text-gray-400 uppercase opacity-100">{t.app.subtitle}</p>
            <div className="flex gap-2 mt-4">
                <Button size="sm" variant="secondary" onClick={onSaveProject}>{t.sidebar.saveProject}</Button>
                <Button size="sm" variant="secondary" onClick={() => projectInputRef.current?.click()}>{t.sidebar.loadProject}</Button>
                <input type="file" accept=".sync,.json" className="hidden" ref={projectInputRef} onChange={handleProjectLoad} />
            </div>
            {!permissionsGranted && (
                <div className="mt-4 p-3 bg-yellow-900/20 border border-yellow-700/50 rounded-lg flex items-start gap-3">
                    <AlertCircle className="text-yellow-500 shrink-0 mt-0.5" size={16} />
                    <div>
                        <p className="text-xs text-yellow-200 mb-2">{t.sidebar.micPermission}</p>
                        <Button size="sm" variant="secondary" onClick={onRefreshDevices}>{t.sidebar.grantPermission}</Button>
                    </div>
                </div>
            )}
        </div>
    );
};
