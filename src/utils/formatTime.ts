/**
 * Formats a duration in seconds to MM:SS string.
 * @param seconds - The time in seconds
 * @returns Formatted string containing minutes and seconds (padded)
 */
export const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};
