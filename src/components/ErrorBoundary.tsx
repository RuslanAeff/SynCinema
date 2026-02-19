/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Error Boundary Component
 *  @author Ruslan Aliyev
 *  Catches JavaScript errors and displays fallback UI
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { getSavedLanguage, getTranslation } from '../i18n';

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

interface ErrorBoundaryState {
    hasError: boolean;
    error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
    declare readonly props: Readonly<ErrorBoundaryProps>;
    state: ErrorBoundaryState = {
        hasError: false,
        error: null,
    };

    static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
        console.error('SynCinema Error:', error, errorInfo);
    }

    render(): React.ReactNode {
        if (this.state.hasError) {
            const t = getTranslation(getSavedLanguage());
            return (
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#0f0f23',
                    color: '#fff',
                    padding: '20px',
                    textAlign: 'center',
                    fontFamily: 'system-ui, -apple-system, sans-serif'
                }}>
                    <h1 style={{ fontSize: '2rem', marginBottom: '1rem' }}>
                        {t.errorBoundary.title}
                    </h1>
                    <p style={{ color: '#a0a0b0', marginBottom: '1rem', maxWidth: '500px' }}>
                        {t.errorBoundary.description}
                    </p>
                    <div style={{
                        backgroundColor: '#1a1a2e',
                        padding: '1rem',
                        borderRadius: '8px',
                        maxWidth: '600px',
                        overflow: 'auto',
                        textAlign: 'left',
                        fontSize: '0.875rem',
                        marginBottom: '1rem'
                    }}>
                        <strong style={{ color: '#ff6b6b' }}>{t.errorBoundary.errorLabel}</strong>
                        <pre style={{ color: '#ffa07a', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {this.state.error?.message || t.errorBoundary.unknownError}
                        </pre>
                    </div>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            backgroundColor: '#6366f1',
                            color: '#fff',
                            border: 'none',
                            padding: '0.75rem 1.5rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            fontSize: '1rem'
                        }}
                    >
                        {t.errorBoundary.reloadPage}
                    </button>
                    <p style={{ color: '#666', marginTop: '2rem', fontSize: '0.75rem' }}>
                        {t.errorBoundary.persistHint}
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
