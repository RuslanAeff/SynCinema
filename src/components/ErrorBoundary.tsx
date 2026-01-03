/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Error Boundary Component
 *  @author Ruslan Aliyev
 *  Catches JavaScript errors and displays fallback UI
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null, errorInfo: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('SynCinema Error:', error, errorInfo);
        this.setState({ errorInfo });
    }

    render() {
        if (this.state.hasError) {
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
                        ⚠️ Something went wrong
                    </h1>
                    <p style={{ color: '#a0a0b0', marginBottom: '1rem', maxWidth: '500px' }}>
                        SynCinema encountered an error. This might be due to browser compatibility issues.
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
                        <strong style={{ color: '#ff6b6b' }}>Error:</strong>
                        <pre style={{ color: '#ffa07a', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                            {this.state.error?.message}
                        </pre>
                        {this.state.error?.stack && (
                            <>
                                <strong style={{ color: '#ff6b6b' }}>Stack:</strong>
                                <pre style={{ color: '#888', fontSize: '0.75rem', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                                    {this.state.error.stack.split('\n').slice(0, 5).join('\n')}
                                </pre>
                            </>
                        )}
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
                        Reload Page
                    </button>
                    <p style={{ color: '#666', marginTop: '2rem', fontSize: '0.75rem' }}>
                        If this persists, please try a desktop browser (Chrome recommended).
                    </p>
                </div>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
