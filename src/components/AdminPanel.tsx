import React, { useState, useEffect } from 'react';
import { ShieldAlert, Trash2, RefreshCw, X, AlertCircle, CheckCircle } from 'lucide-react';
import { useI18n } from '../context/I18nContext';
import { supabase, SyncPreset } from '../lib/supabase';
import { useToast } from './Toast';

interface AdminPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ isOpen, onClose }) => {
    const { t } = useI18n();
    const { showToast } = useToast();

    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [presets, setPresets] = useState<SyncPreset[]>([]);
    const [error, setError] = useState<string | null>(null);

    // Reset state when opened/closed
    useEffect(() => {
        if (!isOpen) {
            setIsLoggedIn(false);
            setPassword('');
            setPresets([]);
            setError(null);
        }
    }, [isOpen]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setIsLoading(true);

        try {
            // Test if password works by running a dummy delete or checking if we can fetch
            // Actually, we can just fetch all rows (RLS allows SELECT)
            // But we don't know if password is correct until we try to delete.
            // Let's just fetch first. Admin panel is somewhat a trust interface. We'll show data, and password is used for deletion.
            setIsLoggedIn(true);
            await fetchAllPresets();
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    };

    const fetchAllPresets = async () => {
        setIsLoading(true);
        setError(null);
        try {
            if (!supabase) throw new Error("Supabase is not initialized");

            const { data, error: fetchError } = await supabase
                .from('sync_presets')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setPresets(data || []);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch presets');
        } finally {
            setIsLoading(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!supabase) return;
        setIsLoading(true);
        try {
            const { data, error: deleteError } = await supabase.rpc('admin_delete_preset', {
                p_id: id,
                p_secret: password
            });

            if (deleteError) throw deleteError;

            if (data === true) {
                showToast({ message: t.adminPanel.deleteSuccess, type: 'success' });
                setPresets(prev => prev.filter(p => p.id !== id));
            } else {
                throw new Error(t.adminPanel.invalidPassword);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || t.adminPanel.deleteError);
            showToast({ message: t.adminPanel.invalidPassword, type: 'error' });

            // If unauthorized, you might want to kick them out
            if (err.message?.includes('Unauthorized')) {
                setIsLoggedIn(false);
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="bg-gray-900 border border-gray-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-800 bg-gray-950/50">
                    <div className="flex items-center gap-2 text-red-500">
                        <ShieldAlert size={20} />
                        <h2 className="text-lg font-bold">{t.adminPanel.title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-gray-800 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-auto p-6 relative">
                    {!isLoggedIn ? (
                        <div className="max-w-md mx-auto mt-10 p-6 bg-gray-800/50 border border-gray-700/50 rounded-xl">
                            <h3 className="text-xl font-semibold mb-6 flex items-center justify-center gap-2">
                                <ShieldAlert className="text-red-400" />
                                {t.adminPanel.login}
                            </h3>
                            <form onSubmit={handleLogin} className="flex flex-col gap-4">
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder={t.adminPanel.passwordPlaceholder}
                                    className="px-4 py-3 bg-gray-900 border border-gray-700 rounded-lg text-white focus:ring-2 focus:ring-red-500/50 focus:border-red-500 outline-none transition-all placeholder-gray-500"
                                    required
                                />
                                {error && (
                                    <div className="text-red-400 text-sm flex items-center gap-1.5 p-2 bg-red-400/10 rounded-lg border border-red-400/20">
                                        <AlertCircle size={14} className="shrink-0" />
                                        {error}
                                    </div>
                                )}
                                <button
                                    type="submit"
                                    disabled={isLoading || !password.trim()}
                                    className="py-3 px-4 bg-red-600 hover:bg-red-500 disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                                >
                                    {isLoading ? '...' : t.adminPanel.loginBtn}
                                </button>
                            </form>
                        </div>
                    ) : (
                        <div className="flex flex-col h-full space-y-4">
                            <div className="flex justify-between items-center mb-2">
                                <p className="text-gray-400 text-sm">{presets.length} presets found</p>
                                <button
                                    onClick={fetchAllPresets}
                                    disabled={isLoading}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm text-gray-300 transition-colors"
                                >
                                    <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                                    {t.adminPanel.refresh}
                                </button>
                            </div>

                            <div className="bg-gray-950/50 border border-gray-800 rounded-xl overflow-hidden flex-1">
                                <div className="overflow-x-auto h-full">
                                    <table className="w-full text-left text-sm whitespace-nowrap">
                                        <thead className="bg-gray-900 border-b border-gray-800 text-gray-400">
                                            <tr>
                                                <th className="px-4 py-3 font-medium">{t.adminPanel.tableVideoId}</th>
                                                <th className="px-4 py-3 font-medium">{t.adminPanel.tableAudioId}</th>
                                                <th className="px-4 py-3 font-medium text-right">{t.adminPanel.tableOffset}</th>
                                                <th className="px-4 py-3 font-medium text-center">{t.adminPanel.tableVotes}</th>
                                                <th className="px-4 py-3 font-medium text-center">{t.adminPanel.tableActions}</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-800/50">
                                            {presets.length === 0 ? (
                                                <tr>
                                                    <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                                                        {isLoading ? '...' : t.adminPanel.noData}
                                                    </td>
                                                </tr>
                                            ) : (
                                                presets.map(preset => (
                                                    <tr key={preset.id} className="hover:bg-gray-800/30 transition-colors">
                                                        <td className="px-4 py-2 font-mono text-xs text-gray-300 truncate max-w-[150px]" title={preset.video_id}>
                                                            {preset.video_id}
                                                        </td>
                                                        <td className="px-4 py-2 font-mono text-xs text-gray-300 truncate max-w-[150px]" title={preset.audio_id}>
                                                            {preset.audio_id}
                                                        </td>
                                                        <td className="px-4 py-2 text-right text-indigo-300 font-medium">
                                                            {preset.offset_ms > 0 ? '+' : ''}{preset.offset_ms}ms
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            <span className="inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-gray-800 text-gray-300 text-xs">
                                                                {preset.votes}
                                                            </span>
                                                        </td>
                                                        <td className="px-4 py-2 text-center">
                                                            <button
                                                                onClick={() => handleDelete(preset.id)}
                                                                disabled={isLoading}
                                                                className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-400/10 rounded-md transition-colors"
                                                                title={t.adminPanel.deleteBtn}
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        </td>
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};
