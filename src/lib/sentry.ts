/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Sentry Error Reporting
 *  @author Ruslan Aliyev
 *  Initializes Sentry when a DSN is configured; safely no-ops otherwise
 * ═══════════════════════════════════════════════════════════════════════════
 */

import * as Sentry from '@sentry/react';

const sentryDsn = import.meta.env.VITE_SENTRY_DSN;

export const sentryEnabled = Boolean(sentryDsn);

export function initSentry(): void {
    if (!sentryDsn) return;

    Sentry.init({
        dsn: sentryDsn,
        environment: import.meta.env.MODE,
        // GlobalHandlers integration (enabled by default) covers window.onerror
        // and unhandledrejection, so no separate manual listeners are added.
    });
}

export function reportError(error: Error, extra?: Record<string, unknown>): void {
    if (!sentryDsn) return;
    Sentry.captureException(error, extra ? { extra } : undefined);
}
