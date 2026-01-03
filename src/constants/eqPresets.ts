/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - EQ Presets
 *  @author Ruslan Aliyev
 *  Pre-configured equalizer settings for different listening scenarios
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface EQPreset {
    id: string;
    low: number;
    mid: number;
    high: number;
}

export const eqPresets: EQPreset[] = [
    { id: 'flat', low: 0, mid: 0, high: 0 },
    { id: 'cinema', low: 3, mid: 0, high: 2 },
    { id: 'dialogue', low: -2, mid: 4, high: 1 },
    { id: 'music', low: 4, mid: 1, high: 3 },
    { id: 'night', low: -3, mid: 2, high: -1 },
    { id: 'bass', low: 6, mid: 0, high: 0 },
];

// Get preset by ID
export const getPresetById = (id: string): EQPreset | undefined => {
    return eqPresets.find(p => p.id === id);
};

// Check if current EQ matches a preset
export const getCurrentPresetId = (eq: { low: number; mid: number; high: number }): string | null => {
    const matched = eqPresets.find(p => p.low === eq.low && p.mid === eq.mid && p.high === eq.high);
    return matched ? matched.id : null;
};
