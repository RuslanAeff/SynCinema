import { describe, it, expect } from 'vitest';
import { sentryEnabled, reportError, initSentry } from './sentry';

describe('sentry (VITE_SENTRY_DSN not configured in this environment)', () => {
    it('is disabled when no DSN is set', () => {
        expect(sentryEnabled).toBe(false);
    });

    it('initSentry is a safe no-op', () => {
        expect(() => initSentry()).not.toThrow();
    });

    it('reportError is a safe no-op and does not throw', () => {
        expect(() => reportError(new Error('test error'), { extra: 'context' })).not.toThrow();
    });
});
