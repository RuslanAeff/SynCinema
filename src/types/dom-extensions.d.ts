/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - DOM Extensions
 *  Browser APIs SynCinema depends on that aren't in the standard TypeScript
 *  DOM lib yet. Declaring them here keeps call sites free of `any` casts.
 * ═══════════════════════════════════════════════════════════════════════════
 */

declare global {
    interface Window {
        /** Legacy prefixed constructor, still required by older Safari. */
        webkitAudioContext?: typeof AudioContext;
    }

    interface AudioContext {
        /**
         * Routes this context's output to a specific device.
         * Chrome 110+; undefined everywhere else, so always feature-detect.
         */
        setSinkId?(sinkId: string): Promise<void>;
    }
}

export { };
