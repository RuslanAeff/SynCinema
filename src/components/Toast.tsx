/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Toast Notification Component
 *  @author Ruslan Aliyev
 *  Lightweight toast notifications — replaces alert() calls
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, createContext, useContext, ReactNode } from 'react';
import { CheckCircle, AlertCircle, X } from 'lucide-react';

type ToastType = 'success' | 'error';

interface ToastMessage {
    id: number;
    text: string;
    type: ToastType;
}

interface ToastContextType {
    showToast: (text: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

let nextId = 0;

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<ToastMessage[]>([]);

    const showToast = useCallback((text: string, type: ToastType = 'success') => {
        const id = nextId++;
        setToasts(prev => [...prev, { id, text, type }]);
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

        // Auto dismiss after 4s
        const timer = setTimeout(() => {
            setIsVisible(false);
            setTimeout(() => onDismiss(toast.id), 300);
        }, 4000);

        return () => clearTimeout(timer);
    }, [toast.id, onDismiss]);

    const isSuccess = toast.type === 'success';

    return (
        <div
            className={`pointer-events-auto flex items-start gap-3 max-w-sm px-4 py-3 rounded-xl shadow-2xl border backdrop-blur-md transition-all duration-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
                } ${isSuccess
                    ? 'bg-gray-900/90 border-green-500/30 text-white'
                    : 'bg-gray-900/90 border-red-500/30 text-white'
                }`}
        >
            {isSuccess
                ? <CheckCircle size={18} className="text-green-400 mt-0.5 shrink-0" />
                : <AlertCircle size={18} className="text-red-400 mt-0.5 shrink-0" />
            }
            <p className="text-sm leading-relaxed whitespace-pre-line flex-1">{toast.text}</p>
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
    );
};

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within a ToastProvider');
    }
    return context;
}
