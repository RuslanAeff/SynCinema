/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  SynCinema - YouTube Quality Helpers
 *  @author Ruslan Aliyev
 *  Ranking, labelling and size-budgeting for YouTube IFrame API quality tokens.
 * ═══════════════════════════════════════════════════════════════════════════
 */

/** YouTube's quality tokens, lowest to highest. Order is the ranking. */
export const QUALITY_LADDER = [
    'tiny',
    'small',
    'medium',
    'large',
    'hd720',
    'hd1080',
    'hd1440',
    'hd2160',
    'highres',
] as const;

export type QualityToken = (typeof QUALITY_LADDER)[number];

/** What the user selected, as opposed to what YouTube actually serves. */
export type QualityPreference = 'best' | 'auto' | QualityToken;

const QUALITY_LABELS: Record<string, string> = {
    tiny: '144p',
    small: '240p',
    medium: '360p',
    large: '480p',
    hd720: '720p',
    hd1080: '1080p',
    hd1440: '1440p',
    hd2160: '4K',
    highres: '4K+',
    auto: 'Auto',
    default: 'Auto',
    unknown: '—',
};

/** Vertical resolution each token corresponds to, used for the size budget. */
const QUALITY_HEIGHTS: Record<QualityToken, number> = {
    tiny: 144,
    small: 240,
    medium: 360,
    large: 480,
    hd720: 720,
    hd1080: 1080,
    hd1440: 1440,
    hd2160: 2160,
    highres: 2160,
};

export const formatQuality = (quality: string): string => QUALITY_LABELS[quality] ?? quality;

/** Position on the ladder, or -1 for `auto`/`default`/anything YouTube invents later. */
export const qualityRank = (quality: string): number =>
    QUALITY_LADDER.indexOf(quality as QualityToken);

/** Real levels only, best first — `auto`, `default` and unknown tokens are dropped. */
export const sortQualitiesDesc = (levels: string[]): string[] =>
    levels.filter((level) => qualityRank(level) >= 0)
        .sort((a, b) => qualityRank(b) - qualityRank(a));

/** Highest level YouTube says it can serve, or null before it has told us. */
export const pickBestQuality = (levels: string[]): string | null =>
    sortQualitiesDesc(levels)[0] ?? null;

/**
 * Highest quality a player box of this size can realistically get.
 *
 * YouTube's adaptive streaming picks by rendered pixel size, not by request, so a
 * 640×360 embed stays at 360p no matter what the API is asked for. Assumes 16:9
 * content letterboxed into the box, so the narrower constraint wins.
 */
export const qualityForPlayerSize = (
    cssWidth: number,
    cssHeight: number,
    devicePixelRatio = 1,
): QualityToken => {
    const dpr = devicePixelRatio > 0 ? devicePixelRatio : 1;
    const videoHeight = Math.min(cssHeight, (cssWidth * 9) / 16) * dpr;

    return QUALITY_LADDER.find((token) => QUALITY_HEIGHTS[token] >= videoHeight) ?? 'hd2160';
};
