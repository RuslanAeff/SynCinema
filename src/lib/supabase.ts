/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Supabase Client
 *  @author Ruslan Aliyev
 *  Handles connection to Supabase for community sync memory
 * ═══════════════════════════════════════════════════════════════════════════
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Create a single supabase client for interacting with your database
export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

// Types for our database schema
export type SyncPreset = {
    id: string;
    video_id: string;
    audio_id: string;
    offset_ms: number;
    votes: number;
    created_at: string;
};
