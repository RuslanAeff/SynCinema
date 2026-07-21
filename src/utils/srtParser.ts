/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - SRT Subtitle Parser
 *  Parses raw .srt file text into timed subtitle cues.
 * ═══════════════════════════════════════════════════════════════════════════
 */

export interface SrtCue {
    id: string;
    startTime: number;
    endTime: number;
    text: string;
}

/**
 * Parses raw SRT-format text into timed cues. Blocks that are too short
 * (fewer than 3 lines) or whose timestamp line doesn't match the expected
 * HH:MM:SS,mmm --> HH:MM:SS,mmm pattern are silently skipped.
 */
export const parseSRT = (text: string): SrtCue[] => {
    const cues: SrtCue[] = [];
    const blocks = text.trim().split(/\n\s*\n/);
    for (const block of blocks) {
        const lines = block.split('\n');
        if (lines.length >= 3) {
            const timeMatch = lines[1].match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
            if (timeMatch) {
                const start = parseInt(timeMatch[1]) * 3600 + parseInt(timeMatch[2]) * 60 + parseInt(timeMatch[3]) + parseInt(timeMatch[4]) / 1000;
                const end = parseInt(timeMatch[5]) * 3600 + parseInt(timeMatch[6]) * 60 + parseInt(timeMatch[7]) + parseInt(timeMatch[8]) / 1000;
                cues.push({
                    id: lines[0],
                    startTime: start,
                    endTime: end,
                    text: lines.slice(2).join('\n')
                });
            }
        }
    }
    return cues;
};
