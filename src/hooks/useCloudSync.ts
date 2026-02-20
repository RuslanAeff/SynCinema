/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Cloud Sync Hook
 *  @author Ruslan Aliyev
 *  Handles fetching and saving community sync presets via Supabase
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback, useRef } from 'react';
import { supabase, SyncPreset } from '../lib/supabase';

export function useCloudSync() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const lastRequestTimeRef = useRef<number>(0);

    /**
     * Checks if there's a community preset for the given video and audio IDs
     */
    const findPreset = useCallback(async (videoId: string, audioId: string): Promise<SyncPreset | null> => {
        if (!supabase) return null;
        if (typeof videoId !== 'string' || typeof audioId !== 'string' || !videoId || !audioId) return null;

        setIsLoading(true);
        setError(null);

        try {
            // Find the preset with the most votes for this video/audio combo
            const { data, error: fetchError } = await supabase
                .from('sync_presets')
                .select('*')
                .eq('video_id', videoId)
                .eq('audio_id', audioId)
                .order('votes', { ascending: false })
                .limit(1)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116 = no rows returned
                console.error('[Supabase] Error finding preset:', fetchError);
                throw fetchError;
            }

            return data as SyncPreset | null;
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
            return null;
        } finally {
            setIsLoading(false);
        }
    }, []);

    /**
     * Saves or upvotes a sync offset
     */
    const saveOrUpvotePreset = useCallback(async (videoId: string, audioId: string, offsetMs: number): Promise<'success' | 'rate_limited' | 'error'> => {
        if (!supabase) return 'error';

        // 1. Payload validation (Prevent NaN, Infinity, excessive values, or non-strings)
        if (typeof videoId !== 'string' || typeof audioId !== 'string' || !videoId || !audioId) {
            console.error('[Supabase] Invalid ID payload types.');
            return 'error';
        }
        if (!Number.isFinite(offsetMs) || Math.abs(offsetMs) > 36000000) { // Limit to +/- 10 hours
            console.error('[Supabase] Invalid offset payload.');
            return 'error';
        }

        // 2. Rate Limiting (Prevent spamming the "Share" button)
        const now = Date.now();
        if (now - lastRequestTimeRef.current < 5000) { // 5 seconds cooldown
            console.warn('[Supabase] Rate limited. Please wait before sharing again.');
            return 'rate_limited';
        }
        lastRequestTimeRef.current = now;

        setIsLoading(true);
        setError(null);

        try {
            // First check if this exact (rounded) offset already exists
            // We round to nearest 100ms to group very similar offsets
            const roundedOffset = Math.round(offsetMs / 100) * 100;
            const minOffset = roundedOffset - 50;
            const maxOffset = roundedOffset + 50;

            const { data: existingSettings } = await supabase
                .from('sync_presets')
                .select('*')
                .eq('video_id', videoId)
                .eq('audio_id', audioId)
                .gte('offset_ms', minOffset)
                .lte('offset_ms', maxOffset);

            if (existingSettings && existingSettings.length > 0) {
                // Upvote the most voted one in this range
                const bestMatch = existingSettings.sort((a, b) => b.votes - a.votes)[0];

                // Generate a simple browser fingerprint for server-side deduplication
                const voterHash = btoa(encodeURIComponent(
                    `${navigator.userAgent}_${screen.width}x${screen.height}_${navigator.language}_${new Date().getTimezoneOffset()}`
                )).substring(0, 64);

                // Server-side vote deduplication (replaces localStorage check)
                const { data: voteResult, error: voteError } = await supabase
                    .rpc('safe_increment_vote', {
                        p_row_id: bestMatch.id,
                        p_voter_hash: voterHash
                    });

                if (voteError) throw voteError;

                // voteResult === false means already voted (server rejected)
                if (voteResult === false) {
                    console.log('[Supabase] Already voted for this preset (server-side check)');
                }

                return 'success';
            } else {
                // Insert a new preset via secure RPC (server-side rate limiting)
                const { data: insertResult, error: insertError } = await supabase
                    .rpc('safe_insert_preset', {
                        p_video_id: videoId,
                        p_audio_id: audioId,
                        p_offset_ms: offsetMs
                    });

                if (insertError) {
                    // Check if it's a server-side rate limit
                    if (insertError.message?.toLowerCase().includes('rate limit')) {
                        return 'rate_limited';
                    }
                    throw insertError;
                }
                return 'success';
            }
        } catch (err) {
            console.error('[Supabase] Error saving preset:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            return 'error';
        } finally {
            setIsLoading(false);
        }
    }, []);

    return {
        findPreset,
        saveOrUpvotePreset,
        isLoading,
        error
    };
}
