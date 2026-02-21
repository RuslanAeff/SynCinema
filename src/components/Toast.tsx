/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Toast Notification Component
 *  @author Ruslan Aliyev
 *  Lightweight toast notifications — replaces alert() calls
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import { Button } from './Button';

type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface ToastOptions {
    message?: string;
    text?: string; // backwards compatibility
    title?: string;
    type?: ToastType;
    duration?: number;
    action?: {
        label: string;
        onClick: () => void;
    };
}

interface ToastMessage extends ToastOptions {
    id: number;
    text: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (options: string | ToastOptions, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let nextId = 0;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = useCallback((options: string | ToastOptions, type: ToastType = 'success') => {
        const id = nextId++;
        let toastObj: ToastMessage;

        if (typeof options === 'string') {
            toastObj = { id, text: options, message: options, type };
        } else {
            toastObj = {
                id,
                text: options.message || options.text || '',
                type: options.type || type,
                ...options
            };
        }

        setToasts(prev => [...prev, toastObj]);
    }, []);

    const dismiss = useCallback((id: number) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}
            {/* Toast Container */}
            <div className="fixed bottom-6 right-6 z-[9999] flex flex-col gap-3 pointer-events-none">
                {toasts.map(toast => (
                    <ToastItem key={toast.id} toast={toast} onDismiss={dismiss} />
                ))}
            </div>
        </ToastContext.Provider>
    );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: number) => void }> = ({ toast, onDismiss }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Animate in
        requestAnimationFrame(() => setIsVisible(true));

        // Auto dismiss
        const duration = toast.duration || 4000;
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onDismiss(toast.id), 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [toast.id, toast.duration, onDismiss]);

    const isSuccess = toast.type === 'success';
    const isError = toast.type === 'error';
    const isInfo = toast.type === 'info';
    const isWarning = toast.type === 'warning';

    const getToastStyle = () => {
        if (isSuccess) return 'bg-gray-900/90 border-secondary-500/30 text-white';
        if (isError) return 'bg-gray-900/90 border-red-500/30 text-white';
        if (isWarning) return 'bg-gray-900/90 border-yellow-500/30 text-white';
        return 'bg-gray-900/90 border-blue-500/30 text-white';
    };

    return (
        <div
            className={`pointer-events-auto flex flex-col gap-2 max-w-sm px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'} ${getToastStyle()}`}
        >
            <div className="flex items-start gap-3">
                {isSuccess && <CheckCircle size={18} className="text-secondary-400 mt-0.5 shrink-0" />}
                {isError && <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />}
                {isInfo && <Info size={18} className="text-blue-400 mt-0.5 shrink-0" />}
                {isWarning && <AlertCircle size={18} className="text-yellow-400 mt-0.5 shrink-0" />}

                <div className="flex-1">
                    {toast.title && <h4 className="font-semibold text-sm mb-1">{toast.title}</h4>}
                    <p className="text-sm leading-relaxed whitespace-pre-line text-gray-200">
                        {toast.text || toast.message}
                    </p>
                </div>

                <button
                    onClick={() => {
                        setIsVisible(false);
                        setTimeout(() => onDismiss(toast.id), 300);
                    }}
                    className="text-gray-500 hover:text-white transition-colors shrink-0 mt-0.5"
                >
                    <X size={14} />
                </button>
            </div>

            {toast.action && (
                <div className="mt-2 flex justify-end">
                    <Button
                        size="sm"
                        variant="primary"
                        className="!py-1 !px-3 text-xs w-auto bg-primary-500 hover:bg-primary-600 border-primary-400"
                        onClick={() => {
                            toast.action?.onClick();
                            setIsVisible(false);
                            setTimeout(() => onDismiss(toast.id), 300);
                        }}
                    >
                        {toast.action.label}
                    </Button>
                </div>
            )}
        </div>
    );
};

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
