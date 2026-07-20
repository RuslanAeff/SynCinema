/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - Subtitle Overlay
 *  @author Ruslan Aliyev
 *  Renders the active subtitle cues over a video area. Shared by the local
 *  file player and the YouTube player so both honour the same styling.
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React from 'react';
import { SubtitleStyle } from '../types';

interface SubtitleOverlayProps {
    cues: { id: string; startTime: number; endTime: number; text: string }[];
    /** Playback position the cues are matched against, in seconds. */
    currentTime: number;
    /** Manual timing correction applied on top of every cue, in seconds. */
    offset?: number;
    style?: SubtitleStyle;
    /**
     * Raise the text above the control bar. Set this while controls overlay the
     * video (immersive / fullscreen), otherwise they cover the bottom line.
     */
    liftForControls?: boolean;
}

const SubtitleOverlayComponent: React.FC<SubtitleOverlayProps> = ({
    cues,
    currentTime,
    offset = 0,
    style,
    liftForControls = false,
}) => {
    if (cues.length === 0) return null;

    const position = style?.position ?? 8;

    return (
        <div
            className="absolute left-0 right-0 text-center pointer-events-none px-4 z-30 transition-[bottom] duration-200"
            style={{ bottom: liftForControls ? `calc(${position}% + 4.5rem)` : `${position}%` }}
        >
            {cues
                .filter(cue => currentTime >= (cue.startTime + offset) && currentTime <= (cue.endTime + offset))
                .map(cue => {
                    // A precise pixel size overrides the responsive preset classes
                    const hasPx = typeof style?.fontSizePx === 'number';
                    const sizeClass = hasPx ? '' :
                        style?.fontSize === 'small' ? 'text-base md:text-lg' :
                            style?.fontSize === 'large' ? 'text-2xl md:text-4xl' :
                                style?.fontSize === 'xlarge' ? 'text-3xl md:text-5xl font-bold' :
                                    'text-lg md:text-3xl';

                    // Compose the text-shadow from the outline + soft-shadow toggles
                    const shadowParts: string[] = [];
                    if (style?.outline) {
                        shadowParts.push('-1.5px -1.5px 0 #000', '1.5px -1.5px 0 #000', '-1.5px 1.5px 0 #000', '1.5px 1.5px 0 #000', '0 0 4px #000');
                    }
                    if (style?.textShadow) {
                        shadowParts.push('0 2px 4px rgba(0,0,0,0.9)');
                    }

                    return (
                        <div
                            key={cue.id}
                            className={`px-3 py-1 rounded inline-block mx-auto whitespace-pre-wrap leading-snug ${sizeClass}`}
                            style={{
                                color: style?.color || '#ffffff',
                                backgroundColor: style?.backgroundColor || 'rgba(0,0,0,0.6)',
                                fontFamily: style?.fontFamily || 'system-ui, sans-serif',
                                fontSize: hasPx ? `${style!.fontSizePx}px` : undefined,
                                textShadow: shadowParts.length ? shadowParts.join(', ') : undefined,
                            }}
                        >
                            {cue.text}
                        </div>
                    );
                })
            }
        </div>
    );
};

export const SubtitleOverlay = React.memo(SubtitleOverlayComponent);
