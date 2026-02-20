/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Cloud Sync Hook
 *  @author Ruslan Aliyev
 *  Handles fetching and saving community sync presets via Supabase
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { useState, useCallback } from 'react';
import { supabase, SyncPreset } from '../lib/supabase';

export function useCloudSync() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Checks if there's a community preset for the given video and audio IDs
     */
    const findPreset = useCallback(async (videoId: string, audioId: string): Promise<SyncPreset | null> => {
        if (!supabase) return null;

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
    const saveOrUpvotePreset = useCallback(async (videoId: string, audioId: string, offsetMs: number) => {
        if (!supabase) return false;

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

                // Extremely simple anti-spam: check localStorage
                const votedKey = `voted_${bestMatch.id}`;
                if (localStorage.getItem(votedKey)) {
                    console.log('[Supabase] Already voted for this preset');
                    return true; // Pretend success
                }

                const { error: updateError } = await supabase
                    .rpc('increment_vote', { row_id: bestMatch.id });

                if (updateError) throw updateError;

                localStorage.setItem(votedKey, 'true');
                return true;
            } else {
                // Insert a new preset
                const { error: insertError } = await supabase
                    .from('sync_presets')
                    .insert([
                        { video_id: videoId, audio_id: audioId, offset_ms: offsetMs }
                    ]);

                if (insertError) throw insertError;
                return true;
            }
        } catch (err) {
            console.error('[Supabase] Error saving preset:', err);
            setError(err instanceof Error ? err.message : 'Unknown error');
            return false;
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
